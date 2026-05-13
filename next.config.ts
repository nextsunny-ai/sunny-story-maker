import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // lib/skills/*.md 파일을 Vercel deployment에 포함 (fs.readFileSync 작동 보장)
  outputFileTracingIncludes: {
    "/api/sori/**/*": ["./lib/skills/**/*"],
    "/api/agent/**/*": ["./lib/skills/**/*"],
    "/api/download/**/*": ["./_private_downloads/**/*"],
    // ★ V2.12 스토리메이커 자동 업데이터
    "/api/updater/**/*": ["./_private_downloads/**/*"],
    "/api/updater-download/**/*": ["./_private_downloads/**/*"],
    // ★ V1.0 SUNNY Agent Pro 자동 업데이터
    "/api/agent-updater/**/*": ["./_agent_downloads/**/*"],
    "/api/agent-updater-download/**/*": ["./_agent_downloads/**/*"],
  },
};

// Sentry — DSN/AUTH_TOKEN 환경변수 없으면 자동 skip (source map upload는 SENTRY_AUTH_TOKEN 있을 때만 자동)
// 활성화: https://sentry.io 가입 → SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN, NEXT_PUBLIC_SENTRY_DSN 환경변수 추가
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: false },
  tunnelRoute: "/monitoring",
  disableLogger: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
