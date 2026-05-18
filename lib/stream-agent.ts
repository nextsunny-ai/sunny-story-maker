// /api/agent/stream 호출용 공용 SSE 클라이언트.
// 이벤트 종류: delta(text 누적), done(완료), error(오류 메시지), usage(토큰 정보)
//
// ★ 작가 누적 학습(admin "내 학습 노하우") 자동 첨부.
// ★ workId 박혀있으면 = workConversation 자동 누적 (한 클로드 conversation 모델).
// ★ Tauri 데스크탑 = isTauri 분기 → /api/build-prompt → invoke("stream_agent", ...)
//   = `claude` CLI subprocess 호출 (= 작가 본인 Pro/Max 구독, 비용 0)
//
// 2026-05-13 정정: OAuth 토큰 직접 Messages API path 차단됨 (HTTP 401, Anthropic 정책).
// 정공법 = Rust 측 `claude` CLI subprocess (= Anthropic 공식 도구, 약관 OK).

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
 * ★ body 자동 첨부 헬퍼 (= learning + profile + conversation).
 */
export function enrichBody(body: Record<string, unknown>): Record<string, unknown> {
  const learning = loadJSON<LearningEntry[]>(KEY.adminLearning, []);
  const profile = loadJSON<WriterProfile | null>(KEY.adminProfile, null);
  const hasProfile = profile && (profile.name || profile.penName || profile.works);

  const enriched: Record<string, unknown> = { ...body };
  if (learning.length > 0) enriched.writerLearning = learning;
  if (hasProfile) enriched.writerProfile = profile;

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

interface BuildPromptResponse {
  systemPrompt: string;
  userMessage: string;
  model: string;
  conversationMessages?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * /api/build-prompt 호출 → Tauri Rust subprocess에 전달할 system/user prompt + model 빌드.
 * Vercel에서 Claude API 호출 X = 단순 텍스트 빌드만 = 사장님 비용 0.
 */
async function buildPromptForTauri(body: Record<string, unknown>): Promise<BuildPromptResponse> {
  const res = await fetch("/api/build-prompt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`build-prompt 실패 (HTTP ${res.status}): ${errText.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Tauri Rust IPC stream — claude CLI subprocess 호출 + Channel 이벤트를 SSE Response로 변환.
 *
 * 흐름:
 * 1. /api/build-prompt 호출 → systemPrompt + userMessage + model 받음
 * 2. invoke("stream_agent", { args: { systemPrompt, userMessage, model }, channel })
 * 3. Rust = `claude --print --system-prompt-file ... --output-format stream-json` subprocess
 * 4. stdout = stream_event content_block_delta → channel.send(Delta { text })
 * 5. 이 함수 = channel.onmessage 받음 → SSE event 형식으로 ReadableStream에 push
 */
async function streamViaTauri(body: Record<string, unknown>): Promise<Response> {
  const promptData = await buildPromptForTauri(body);

  const tauriCore = await import("@tauri-apps/api/core");
  const { invoke, Channel } = tauriCore;

  type RustEvent =
    | { event: "delta"; text: string }
    | { event: "usage"; input_tokens: number; output_tokens: number }
    | { event: "error"; message: string }
    | { event: "done" };

  const channel = new Channel<RustEvent>();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* noop */ }
      };

      channel.onmessage = (msg) => {
        if (closed) return;
        const eventType = msg.event;
        let dataPayload: Record<string, unknown> = {};
        if (eventType === "delta") {
          dataPayload = { text: (msg as { text: string }).text };
        } else if (eventType === "usage") {
          const u = msg as { input_tokens: number; output_tokens: number };
          dataPayload = {
            input_tokens: u.input_tokens,
            output_tokens: u.output_tokens,
            via: "tauri-claude-cli",
          };
        } else if (eventType === "error") {
          dataPayload = { message: (msg as { message: string }).message };
        } else {
          dataPayload = {};
        }
        const sseLine = `event: ${eventType}\ndata: ${JSON.stringify(dataPayload)}\n\n`;
        try {
          controller.enqueue(encoder.encode(sseLine));
        } catch { /* stream closed */ }
        if (eventType === "done") {
          close();
        }
      };

      try {
        await invoke("stream_agent", {
          args: {
            model: promptData.model,
            systemPrompt: promptData.systemPrompt,
            userMessage: promptData.userMessage,
          },
          channel,
        });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        const sseLine = `event: error\ndata: ${JSON.stringify({ message: errMsg })}\n\n`;
        try { controller.enqueue(encoder.encode(sseLine)); } catch { /* noop */ }
        close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}

/**
 * ★ /api/agent/stream 호출 wrapper (= enrichBody 자동 + isTauri 분기).
 *
 * - Tauri 모드 = build-prompt + invoke (= 작가 Pro 구독 = 비용 0)
 * - 웹 모드 = Vercel API fetch (= Settings에 박은 작가 BYOK 키 사용)
 */
export async function streamFetch(
  body: Record<string, unknown>,
  init?: { signal?: AbortSignal }
): Promise<Response> {
  const enriched = enrichBody(body);

  if (isTauri()) {
    return streamViaTauri(enriched);
  }

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
    res = isTauri()
      ? await streamViaTauri(enrichedBody)
      : await fetch("/api/agent/stream", {
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
