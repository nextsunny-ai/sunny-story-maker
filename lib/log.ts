// V3.1 #14 — 클라이언트 로그 헬퍼.
// 작가 PC에서 발생한 에러·경고를 /api/log로 박음.
//
// 사용:
//   import { logError, logWarn, installGlobalErrorHandlers } from "@/lib/log";
//   try { ... } catch (e) { logError(e, "write/onSend"); }
//
// 자동 수집:
//   - window.onerror (uncaught exception)
//   - window.onunhandledrejection (Promise rejection)
//   - 작가 화면엔 영향 X (silent fail)

type Level = "error" | "warn" | "info";

interface LogMeta {
  source?: string;
  meta?: Record<string, unknown>;
}

// 같은 에러 반복 전송 방지 (1분 내 동일 메시지 1회만)
const recent = new Map<string, number>();
const DEDUP_MS = 60_000;

function shouldSend(key: string): boolean {
  const now = Date.now();
  const last = recent.get(key) || 0;
  if (now - last < DEDUP_MS) return false;
  recent.set(key, now);
  // 옛 키 정리 (메모리 leak 방지)
  if (recent.size > 100) {
    const cutoff = now - DEDUP_MS;
    for (const [k, t] of recent.entries()) {
      if (t < cutoff) recent.delete(k);
    }
  }
  return true;
}

function getAppVersion(): string {
  if (typeof window === "undefined") return "?";
  // package.json version은 build 시 inline 안 됨 = window 전역 변수로 박힘
  const w = window as unknown as { __APP_VERSION__?: string };
  return w.__APP_VERSION__ || "v3.0.0";
}

function sendLog(level: Level, message: string, stack: string | undefined, meta: LogMeta): void {
  if (typeof window === "undefined") return;
  const key = `${level}:${message.slice(0, 200)}`;
  if (!shouldSend(key)) return;

  const payload = {
    level,
    source: meta.source,
    message: message.slice(0, 2000),
    stack: stack?.slice(0, 8000),
    url: window.location?.href,
    userAgent: navigator.userAgent,
    appVersion: getAppVersion(),
    meta: meta.meta,
  };

  // fire-and-forget — 응답 대기 X, 실패 silent
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon("/api/log", blob);
    } else {
      fetch("/api/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => { /* silent */ });
    }
  } catch {
    // silent — 로그 자체가 작가 화면 영향 X
  }
}

export function logError(err: unknown, source?: string, meta?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err ?? "unknown error");
  const stack = err instanceof Error ? err.stack : undefined;
  sendLog("error", message, stack, { source, meta });
  // 콘솔에도 그대로 (개발 + Tauri devtools)
  if (typeof console !== "undefined") console.error(`[${source || "app"}]`, err);
}

export function logWarn(message: string, source?: string, meta?: Record<string, unknown>): void {
  sendLog("warn", message, undefined, { source, meta });
  if (typeof console !== "undefined") console.warn(`[${source || "app"}]`, message);
}

export function logInfo(message: string, source?: string, meta?: Record<string, unknown>): void {
  sendLog("info", message, undefined, { source, meta });
}

let handlersInstalled = false;

/**
 * window.onerror + onunhandledrejection 자동 수집.
 * app/layout.tsx 또는 app/providers.tsx에서 1회 호출.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined" || handlersInstalled) return;
  handlersInstalled = true;

  window.addEventListener("error", (e) => {
    const message = e.message || e.error?.message || "uncaught error";
    const stack = e.error?.stack;
    sendLog("error", message, stack, {
      source: "window.error",
      meta: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? "unhandled rejection");
    const stack = reason instanceof Error ? reason.stack : undefined;
    sendLog("error", message, stack, { source: "window.unhandledrejection" });
  });
}
