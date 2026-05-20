// V3.1 G2 (2026-05-20) — Next.js 16 = middleware → proxy 컨벤션.
// 옛 `middleware.ts` deprecated. 함수명도 `middleware` → `proxy`.
// 로직은 그대로 (Supabase 세션 + public path + login redirect).

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 인증 없이 접근 가능한 경로 (정확한 경로 또는 prefix 매칭)
const PUBLIC_PATHS: readonly string[] = [
  "/login",
  "/auth/callback",
  "/auth/desktop-callback", // ★ V2.12.2 = 데스크탑 OAuth callback (= 비인증 접근 = code exchange + deep link redirect)
  "/download",
  // 정책·약관·릴리스 정보·사용 가이드 (= 가입 전·외부 누구나 OK)
  "/privacy",
  "/terms",
  "/changelog",
  "/status",
  "/guide",
  // API
  "/api/upload",
  "/api/download",
  "/api/health", // status 페이지가 호출
  "/api/log",    // ★ V3.1 #14 — 클라이언트 에러 로그 (비로그인 작가도 OK)
  "/api/updater", // 스토리메이커 Tauri auto-updater
  "/api/updater-download", // ★ V2.12 = 스토리메이커 .exe 다운로드
  "/api/agent-updater", // ★ V1.0 = SUNNY Agent Pro auto-updater
  "/api/agent-updater-download", // ★ V1.0 = SUNNY Agent Pro .exe 다운로드
  "/api/agent/stream", // 베타: mock UI라 일단 자유 접근
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // 인증된 사용자가 /login 접근 시 홈으로 보내기
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 공개 경로는 통과
  if (isPublicPath(pathname)) {
    return response;
  }

  // 비인증 사용자는 /login 으로 redirect (원래 가려던 경로 보존)
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 다음 경로 제외 매치:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     * - 공개 이미지 (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
