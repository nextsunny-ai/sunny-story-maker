// /api/agent/stream 호출용 공용 SSE 클라이언트.
// 이벤트 종류: delta(text 누적), done(완료), error(오류 메시지), usage(토큰 정보)
//
// ★ 작가 누적 학습(admin "내 학습 노하우") 자동 첨부.
// ★ workId 박혀있으면 = workConversation 자동 누적 (한 클로드 conversation 모델).
// ★ BYOK 자동 첨부 (Settings에서 박은 작가 본인 ANTHROPIC_API_KEY) — 글로벌 룰 16
// ★ Tauri 데스크탑 = invoke로 Rust stream agent 호출 (= OAuth Pro 구독 = 비용 0)

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

/**
 * Tauri 데스크탑 환경 여부 (= window.__TAURI_INTERNALS__ 존재).
 */
function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

/**
 * ★ body 자동 첨부 헬퍼 (= learning + profile + conversation + BYOK userApiKey).
 *
 * streamAgent + streamFetch 모두 사용. 4개 페이지 (grant·develop·review·write) =
 * 직접 fetch 사용 시 = enrichBody 거쳐서 박기.
 */
export function enrichBody(body: Record<string, unknown>): Record<string, unknown> {
  const learning = loadJSON<LearningEntry[]>(KEY.adminLearning, []);
  const profile = loadJSON<WriterProfile | null>(KEY.adminProfile, null);
  const userApiKey = loadJSON<string>(KEY.userApiKey, "");
  const hasProfile = profile && (profile.name || profile.penName || profile.works);

  const enriched: Record<string, unknown> = { ...body };
  if (learning.length > 0) enriched.writerLearning = learning;
  if (hasProfile) enriched.writerProfile = profile;
  if (userApiKey) enriched.userApiKey = userApiKey;

  // ★ 한 클로드 conversation 모델 — body.workId 있으면 옛 turn 누적
  const workId = typeof body.workId === "string" ? body.workId : "";
  if (workId) {
    const conv = loadJSON<WorkConversation>(
      KEY.workConversation(workId),
      { workId, messages: [], updatedAt: 0 }
    );
    enriched.conversationMessages = conv.messages;
  }

  return enriched;
}

/**
 * ★ /api/agent/stream 호출 wrapper (= enrichBody 자동).
 *
 * 4개 페이지 (grant·develop·review·write) = 직접 fetch 대신 = 이 함수 사용.
 *
 * ★ 2026-05-11 V2.11.1 fix:
 * Tauri 모드도 = Vercel API 호출 (= same-origin = `story.sunnytoon.com`).
 * 이유: Vercel API = `getSystemPrompt()` 호출 = 30년 CD 시스템 프롬프트 + humanizer + 12장르
 *       + lib/skills/learned.md 작법 노하우 다 박힘. invoke로 직접 호출 시 = 단순 prompt만 박힘 = 사고.
 *
 * 비용 0 path (= V2.12 별도):
 * - `/api/build-prompt` endpoint 신규 + Tauri Rust = invoke('stream_agent', { systemPrompt, oauthToken })
 * - = OAuth Pro 구독 사용 + system prompt 보존 = 비용 0 (= 진짜 BYOK)
 */
export async function streamFetch(
  body: Record<string, unknown>,
  init?: { signal?: AbortSignal }
): Promise<Response> {
  const enriched = enrichBody(body);

  return fetch("/api/agent/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(enriched),
    signal: init?.signal,
  });
}

export async function streamAgent(opts: StreamAgentOptions): Promise<string> {
  const { body, onDelta, onDone, onError, signal, userPromptSummary } = opts;

  const enrichedBody = enrichBody(body);

  // workConversation 누적 (= 응답 후 user/assistant turn 박을 때 사용)
  const workId = typeof body.workId === "string" ? body.workId : "";
  const conv = workId
    ? loadJSON<WorkConversation>(KEY.workConversation(workId), { workId, messages: [], updatedAt: 0 })
    : ({ workId: "", messages: [], updatedAt: 0 } as WorkConversation);

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
