import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = ["/login", "/download", "/api/upload", "/api/download"];

export async function middleware(request: NextRequest) {
  // 베타 단계: 누구나 접근 가능 (Auth 미연결).
  // 진짜 Auth 연결되면 PUBLIC_PATHS + cookie 체크 redirect 다시 활성화.
  void PUBLIC_PATHS;
  return await updateSession(request);
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
