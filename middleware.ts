import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // 베타 단계: 누구나 접근 가능 (Auth 미연결). 다음 라운드 Supabase Auth 연결 시
  // PUBLIC_PATHS = ["/login", "/download", "/api/upload", "/api/download"] + cookie 체크 redirect 활성화.
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
