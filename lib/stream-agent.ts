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
 * ★ V3.1 #15 — HTTP/네트워크 에러를 작가 친화적 한국어 메시지로 변환.
 * - offline / DNS / 타임아웃 / 401·403·429·5xx별로 구분
 * - "TypeError: Failed to fetch" 같은 영어 raw 메시지 노출 X
 */
export function humanizeStreamError(input: unknown, ctx?: { status?: number }): string {
  // (1) 네트워크 단절 — navigator.onLine
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "📡 인터넷이 끊어진 것 같습니다. Wi-Fi/네트워크를 확인하고 다시 시도해주세요.";
  }
  const raw = input instanceof Error ? input.message : (typeof input === "string" ? input : String(input ?? ""));
  const lower = raw.toLowerCase();
  // (2) HTTP status 매핑
  const status = ctx?.status;
  if (status === 401 || status === 403) {
    return "🔑 인증이 만료됐습니다. 다시 로그인하시거나 설정에서 API 키를 확인해주세요.";
  }
  if (status === 429) {
    return "⏳ Claude 사용량 한도에 일시 도달했습니다. 잠시 후 자동으로 다시 시도하거나 5~10분 후 다시 작업해주세요.";
  }
  if (status === 503 || status === 502 || status === 504) {
    return "🛠 서버가 잠시 응답하지 못합니다. 1~2분 후 다시 시도해주세요. (계속 안되면 status.anthropic.com 확인)";
  }
  if (status && status >= 500) {
    return `⚠️ 서버 일시 오류 (HTTP ${status}). 잠시 후 다시 시도해주세요.`;
  }
  if (status === 400) {
    return "⚠️ 요청 형식이 잘못됐습니다. 본문이 너무 길거나 모델 설정 문제일 수 있습니다.";
  }
  if (status === 404) {
    return "🔍 API 경로를 찾지 못했습니다. 새 버전으로 업데이트가 필요할 수 있습니다.";
  }
  // (3) raw 메시지 키워드 매핑
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("err_internet_disconnected")) {
    return "📡 서버 연결에 실패했습니다. 인터넷/네트워크를 확인해주세요.";
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("etimedout")) {
    return "⏱️ 응답이 너무 늦어 타임아웃됐습니다. 본문이 길면 잠시 후 다시 시도해주세요.";
  }
  if (lower.includes("abort")) {
    // abort는 보통 호출 측에서 무시 — 친절 안내만
    return "🛑 작업이 중단됐습니다.";
  }
  if (lower.includes("응답 본문이 비어") || lower.includes("empty body") || lower.includes("no response")) {
    return "📭 AI 응답이 비어있습니다. 잠시 후 다시 시도하거나 다른 모델로 바꿔 시도해주세요.";
  }
  if (lower.includes("usage limit") || lower.includes("rate limit") || lower.includes("한도")) {
    return "⏳ Claude 사용량 한도에 도달했습니다. 5시간~7일 단위로 자동 리셋됩니다.";
  }
  if (lower.includes("claude") && lower.includes("not found")) {
    return "🔧 Claude CLI가 설치되지 않았거나 PATH에 없습니다. 도움말의 설치 안내를 확인해주세요.";
  }
  // (4) 마지막 fallback — raw 메시지 그대로 + 안내
  const trimmed = raw.slice(0, 200);
  if (!trimmed.trim()) return "⚠️ 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  return `⚠️ ${trimmed}`;
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
// claude CLI가 구독 한도(429)로 막혔는지 stderr 메시지로 판별 — 보수적 매칭.
function isClaudeLimitError(m: string): boolean {
  const s = m.toLowerCase();
  return s.includes("429")
    || s.includes("usage limit")
    || s.includes("rate limit")
    || (s.includes("limit") && s.includes("reset"))
    || m.includes("한도");
}

async function streamViaTauri(body: Record<string, unknown>): Promise<Response> {
  const promptData = await buildPromptForTauri(body);

  const tauriCore = await import("@tauri-apps/api/core");
  const { invoke, Channel } = tauriCore;

  type RustEvent =
    | { event: "delta"; text: string }
    | { event: "usage"; input_tokens: number; output_tokens: number }
    | { event: "error"; message: string }
    | { event: "done" };

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* noop */ }
      };
      const emit = (eventType: string, dataPayload: Record<string, unknown>) => {
        const sseLine = `event: ${eventType}\ndata: ${JSON.stringify(dataPayload)}\n\n`;
        try { controller.enqueue(encoder.encode(sseLine)); } catch { /* stream closed */ }
      };

      // 한 모델로 invoke 시도. opus·sonnet이 구독 한도(429)로 막히고 본문이 아직 안 나왔으면
      // = haiku로 1회 자동 재시도해 작가가 안 막히게 한다.
      const attempt = async (useModel: string, isFallback: boolean): Promise<void> => {
        const channel = new Channel<RustEvent>();
        let sawDelta = false;
        let limitErr = "";

        channel.onmessage = (msg) => {
          if (closed) return;
          const eventType = msg.event;
          if (eventType === "delta") {
            sawDelta = true;
            emit("delta", { text: (msg as { text: string }).text });
          } else if (eventType === "usage") {
            const u = msg as { input_tokens: number; output_tokens: number };
            emit("usage", {
              input_tokens: u.input_tokens,
              output_tokens: u.output_tokens,
              via: "tauri-claude-cli",
            });
          } else if (eventType === "error") {
            const m = (msg as { message: string }).message || "";
            // ★ 본문이 아직 안 나왔고 + 한도 에러 + 아직 haiku 아니면 = 흘리지 말고 fallback 대상으로
            if (!isFallback && !sawDelta && isClaudeLimitError(m)) {
              limitErr = m;
              return;
            }
            emit("error", { message: m });
          } else if (eventType === "done") {
            emit("done", {});
            close();
          }
        };

        try {
          await invoke("stream_agent", {
            args: { model: useModel, systemPrompt: promptData.systemPrompt, userMessage: promptData.userMessage },
            channel,
          });
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          if (!isFallback && !sawDelta && isClaudeLimitError(errMsg)) {
            limitErr = limitErr || errMsg;
          } else if (!limitErr) {
            emit("error", { message: errMsg });
            close();
            return;
          }
        }

        if (closed) return;
        // ★ 한도 감지 + 아직 haiku 안 씀 = haiku로 1회 자동 재시도
        if (limitErr && !isFallback) {
          emit("notice", { message: "Claude 구독 한도에 도달해 Haiku 모델로 자동 전환했습니다. 계속 작업할 수 있습니다 (품질이 약간 달라질 수 있습니다)." });
          return attempt("haiku", true);
        }
        // haiku로도 한도면 = 진짜 에러
        if (limitErr) {
          emit("error", { message: "Claude 구독 사용 한도에 도달했습니다. Haiku 모델도 한도가 찼습니다 — 잠시 후(5시간 또는 7일 단위) 자동으로 리셋됩니다." });
        }
        close();
      };

      await attempt(promptData.model, false);
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
// 작가에게 안내 토스트 — haiku 자동 전환 같은 비치명적 알림용. 별도 컴포넌트 없이 DOM에 직접.
function showNoticeToast(message: string): void {
  if (typeof document === "undefined" || !message) return;
  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText = "position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:99999;"
    + "max-width:540px;padding:12px 18px;background:#fff;color:#2a2f3a;"
    + "border:1px solid #ffb4a2;border-left:4px solid #ff6b53;border-radius:10px;"
    + "font-size:13px;line-height:1.55;box-shadow:0 10px 30px rgba(0,0,0,.14);";
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .4s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 400);
  }, 7000);
}

// SSE 스트림을 통과시키며 notice 이벤트만 가로채 토스트로 표시한다.
// 페이지의 파싱 코드는 delta/done/error만 알면 되므로 notice는 여기서 소비하고 제거.
function interceptNotice(src: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";
  return src.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buf += decoder.decode(chunk, { stream: true });
      const events = buf.split("\n\n");
      buf = events.pop() || "";
      for (const evt of events) {
        const lines = evt.split("\n");
        const eventType = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
        if (eventType === "notice") {
          const dataLine = lines.find(l => l.startsWith("data:"))?.slice(5).trim();
          try {
            const d = JSON.parse(dataLine || "{}");
            showNoticeToast(typeof d.message === "string" ? d.message : "");
          } catch { /* ignore */ }
          continue; // notice는 페이지로 흘리지 않음
        }
        controller.enqueue(encoder.encode(evt + "\n\n"));
      }
    },
    flush(controller) {
      if (buf) controller.enqueue(encoder.encode(buf));
    },
  }));
}

export async function streamFetch(
  body: Record<string, unknown>,
  init?: { signal?: AbortSignal }
): Promise<Response> {
  const enriched = enrichBody(body);

  const res = isTauri()
    ? await streamViaTauri(enriched)
    : await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(enriched),
        signal: init?.signal,
      });

  // ★ notice 이벤트(haiku 자동 전환 등)를 가로채 작가에게 토스트로 표시 — 페이지 파싱 코드는 그대로.
  if (res.ok && res.body) {
    return new Response(interceptNotice(res.body), {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }
  return res;
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
    // signal.aborted = 사용자가 의도적으로 중단 = error 표시 X
    if (signal?.aborted) throw err;
    const msg = humanizeStreamError(err);
    onError?.(msg);
    throw err;
  }

  if (!res.ok) {
    let rawErr = "";
    let errCode = "";
    try {
      const j = await res.json();
      if (j?.error) rawErr = String(j.error);
      if (j?.code) errCode = String(j.code);
    } catch {
      // ignore
    }
    // ★ V3.1 (대표님 명시 2026-05-20) — web에서 AI 호출 시도 = 친절 안내 + 다운로드 페이지로
    if (errCode === "DESKTOP_REQUIRED") {
      const msg = "🖥️ Story Maker는 데스크탑 앱에서 작동합니다.\n\nClaude Pro 구독($20/월)만 있으면 = 추가 비용 0원 = 무제한.\n\n[다운로드 페이지로 이동] 클릭 = 받아서 설치하시면 됩니다.";
      onError?.(msg);
      // 작가 친화 = 자동 redirect (브라우저 새 창)
      if (typeof window !== "undefined") {
        setTimeout(() => {
          if (confirm("데스크탑 앱이 필요합니다.\n다운로드 페이지로 이동할까요?")) {
            window.location.href = "/download";
          }
        }, 500);
      }
      throw new Error(msg);
    }
    const errMsg = humanizeStreamError(rawErr || `HTTP ${res.status}`, { status: res.status });
    onError?.(errMsg);
    throw new Error(errMsg);
  }

  if (!res.body) {
    const msg = humanizeStreamError("응답 본문이 비어있습니다.");
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
    const msg = humanizeStreamError(err);
    onError?.(msg);
    throw err;
  }

  // ★ V3.1 #15 — 응답이 깡통 (= 한 글자도 못 받음) = 친절 안내
  if (!full.trim() && !signal?.aborted) {
    const msg = humanizeStreamError("응답 본문이 비어있습니다.");
    onError?.(msg);
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
