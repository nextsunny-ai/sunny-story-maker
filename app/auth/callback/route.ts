import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase OAuth (Google) 및 이메일 확인 콜백 핸들러.
 *
 * Supabase가 외부 인증 후 ?code=...&next=... 형태로 redirect 시킴.
 * 여기서 code → session 교환 후 next 경로(또는 /)로 보낸다.
 *
 * 참고: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";
  const errorParam = searchParams.get("error_description") || searchParams.get("error");

  if (errorParam) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", errorParam);
    return NextResponse.redirect(url);
  }

  if (!code) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "missing_code");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  // open redirect 방어: next 는 반드시 / 로 시작하는 내부 경로여야 함
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, origin));
}
