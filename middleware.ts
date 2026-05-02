import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 인증 없이 접근 가능한 경로 (정확한 경로 또는 prefix 매칭)
const PUBLIC_PATHS: readonly string[] = [
  "/login",
  "/auth/callback",
  "/download",
  "/api/upload",
  "/api/download",
  "/api/agent/stream", // 베타: mock UI라 일단 자유 접근
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
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
