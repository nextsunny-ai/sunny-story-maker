import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = ["/login", "/download", "/api/upload", "/api/download"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase 세션 갱신 시도 (cookie 있으면 유지)
  const response = await updateSession(request);

  // LOCAL 모드 (사장님 본인 PC) — Auth 우회
  if (process.env.BYPASS_AUTH === "true") return response;

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));

  // 임시: 진짜 Auth 연결 전까지 단순 cookie 체크로 redirect
  // (다음 라운드: Supabase user 객체로 정식 검증)
  const hasAuthCookie = request.cookies.getAll().some(c =>
    c.name.startsWith("sb-") && c.value.length > 10
  );

  if (!isPublic && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
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
