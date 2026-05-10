// Next.js 13+ instrumentation hook
//
// Sentry server·edge config를 = 적절한 runtime에서만 로드.
// 서버 측 오류는 Sentry SDK가 자동으로 캡처 (= sentry.server.config.ts init 후).

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
