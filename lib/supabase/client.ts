"use client";

import { createBrowserClient } from "@supabase/ssr";

// V3.1 build fix — local 환경변수 없을 때 = SSG prerender 실패 방지.
// dummy URL/key로 fallback (= 실제 호출은 실패하지만 client 인스턴스는 생성됨)
// production Vercel = 실제 env 값 사용. local dev (= .env.local 없음) = dummy.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}
