// /api/agent/stream 호출용 공용 SSE 클라이언트.
// 이벤트 종류: delta(text 누적), done(완료), error(오류 메시지), usage(토큰 정보)
//
// ★ 작가 누적 학습(admin "내 학습 노하우") 자동 첨부.
// ★ workId 박혀있으면 = workConversation 자동 누적 (한 클로드 conversation 모델).

import { KEY, loadJSON, saveJSON, type WorkConversation } from "@/lib/persist";
import { appendTurns } from "@/lib/storymaker/work-id";

interface LearningEntry {
  date: string;
  category: string;
  text: string;
}

interface WriterProfile {
  name?: string;
  penName?: string;
  role?: string;
  email?: string;
  mainGenre?: string;
  career?: string;
  works?: string;
  avoid?: string;
  likes?: string;
}

export interface StreamAgentOptions {
  body: Record<string, unknown>;
  onDelta?: (text: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
  /** ★ user prompt 요약 — workConversation에 user turn으로 박힘. 없으면 mode/idea로 자동 생성 */
  userPromptSummary?: string;
}

export async function streamAgent(opts: StreamAgentOptions): Promise<string> {
  const { body, onDelta, onDone, onError, signal, userPromptSummary } = opts;

  // 작가 누적 학습 + 프로필 자동 첨부 (있을 때만)
  const learning = loadJSON<LearningEntry[]>(KEY.adminLearning, []);
  const profile = loadJSON<WriterProfile | null>(KEY.adminProfile, null);
  const hasProfile = profile && (profile.name || profile.penName || profile.works);
  const enrichedBody: Record<string, unknown> = { ...body };
  if (learning.length > 0) enrichedBody.writerLearning = learning;
  if (hasProfile) enrichedBody.writerProfile = profile;

  // ★ 한 클로드 conversation 모델 — body.workId 박혀있으면 = 옛 turn 누적해서 보냄
  const workId = typeof body.workId === "string" ? body.workId : "";
  let conv: WorkConversation = { workId, messages: [], updatedAt: 0 };
  if (workId) {
    conv = loadJSON<WorkConversation>(KEY.workConversation(workId), conv);
    enrichedBody.conversationMessages = conv.messages;
  }

  let res: Response;
  try {
    res = await fetch("/api/agent/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(enrichedBody),
      signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "네트워크 오류";
    onError?.(msg);
    throw err;
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) errMsg = j.error;
    } catch {
      // ignore
    }
    onError?.(errMsg);
    throw new Error(errMsg);
  }

  if (!res.body) {
    const msg = "응답 본문이 비어있습니다.";
    onError?.(msg);
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";

  try {
    while (true) {
      if (signal?.aborted) {
        try { await reader.cancel(); } catch { /* noop */ }
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const events = buf.split("\n\n");
      buf = events.pop() || "";

      for (const evt of events) {
        const lines = evt.split("\n");
        const eventType = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
        const dataLine = lines.find(l => l.startsWith("data:"))?.slice(5).trim();
        if (!eventType || !dataLine) continue;

        try {
          const data = JSON.parse(dataLine);
          if (eventType === "delta" && typeof data.text === "string") {
            full += data.text;
            onDelta?.(data.text);
          } else if (eventType === "done") {
            onDone?.();
          } else if (eventType === "error" && typeof data.message === "string") {
            onError?.(data.message);
          }
        } catch {
          // 파싱 실패는 무시
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return full;
    const msg = err instanceof Error ? err.message : "스트림 읽기 오류";
    onError?.(msg);
    throw err;
  }

  // ★ workId 박혀있고 응답이 비어있지 않으면 = workConversation에 user/assistant turn 누적
  if (workId && full.trim()) {
    const userMsg = userPromptSummary ||
      `[${body.mode || "?"}] ${body.idea || ""}`.slice(0, 200);
    const updated = appendTurns(conv, [
      { role: "user", content: userMsg },
      { role: "assistant", content: full },
    ]);
    saveJSON(KEY.workConversation(workId), {
      workId,
      messages: updated.messages,
      compactedSummary: updated.compactedSummary,
      updatedAt: Date.now(),
    });
  }

  return full;
}
