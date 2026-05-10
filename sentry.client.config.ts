// Sentry — 클라이언트 사이드 (브라우저)
//
// DSN이 박혀있을 때만 활성화. 빈 DSN = 자동 비활성 (오류 X).
//
// 활성화 절차:
// 1) https://sentry.io 가입 + Next.js 프로젝트 생성
// 2) DSN 복사
// 3) Vercel 환경변수 `NEXT_PUBLIC_SENTRY_DSN` 추가
// 4) 자동 활성화 (다음 배포부터)

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0, // 일반 세션 = 녹화 X
    replaysOnErrorSampleRate: 0.1, // 오류 시만 = 10%
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
