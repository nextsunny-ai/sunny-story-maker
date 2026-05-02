// /api/agent/stream 호출용 공용 SSE 클라이언트.
// 이벤트 종류: delta(text 누적), done(완료), error(오류 메시지), usage(토큰 정보)

export interface StreamAgentOptions {
  body: Record<string, unknown>;
  onDelta?: (text: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

export async function streamAgent(opts: StreamAgentOptions): Promise<string> {
  const { body, onDelta, onDone, onError, signal } = opts;

  let res: Response;
  try {
    res = await fetch("/api/agent/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
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

  return full;
}
