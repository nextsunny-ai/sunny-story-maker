import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

export interface UpdateSessionResult {
  response: NextResponse;
  user: User | null;
}

// ★ V3.1 D3 완전 — Supabase env 없거나 placeholder면 = 모든 라우트가 영원히 로그인 실패.
//   미리 체크해서 = 사장님 production 배포 시 바로 인지.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const HAS_REAL_SUPABASE = SUPABASE_URL && SUPABASE_KEY
  && !SUPABASE_URL.includes("placeholder")
  && !SUPABASE_KEY.includes("placeholder");

export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // ★ V3.1 D3 — Supabase env가 placeholder/없으면 = 인증 우회 = 로그인 시도 X
  //   (= local dev 환경에서 build 통과만, production에서는 진짜 env 박혀있어야)
  if (!HAS_REAL_SUPABASE) {
    if (process.env.NODE_ENV === "production") {
      console.error("[CRITICAL] Supabase 환경변수 누락 — 작가 로그인 100% 실패. Vercel env 점검!");
    }
    return { response: supabaseResponse, user: null };
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRITICAL: createServerClient와 supabase.auth.getUser() 사이에 어떤 코드도 넣지 말 것.
  // 그렇지 않으면 토큰 갱신 타이밍 문제로 사용자가 임의로 로그아웃될 수 있음.
  try {
    const { data, error } = await supabase.auth.getUser();
    // ★ V3.1 D3 — getUser 실패 = 세션 만료·Supabase 다운 = 작가가 못 들어옴.
    //   로그는 박음 (= 작가 에러는 SessionBanner가 다른 path로 안내).
    if (error && error.message !== "Auth session missing!") {
      console.warn(`[middleware] auth.getUser 실패: ${error.message}`);
    }
    return { response: supabaseResponse, user: data.user };
  } catch (e) {
    // ★ V3.1 D3 — 예외 throw = Supabase 자체가 죽은 상태. 작가는 비인증 상태로 처리.
    console.error("[middleware] Supabase auth 예외:", e instanceof Error ? e.message : String(e));
    return { response: supabaseResponse, user: null };
  }
}
