// V3.1 #14 — 에러·디버그 정보 수집 endpoint.
// 작가 클라이언트에서 발생한 클라이언트 에러를 모음.
// Supabase `client_logs` 테이블에 저장 (없으면 console.error만).
//
// Schema (Supabase SQL):
// ```sql
// create table if not exists public.client_logs (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid references auth.users(id) on delete set null,
//   user_email text,
//   level text not null check (level in ('error', 'warn', 'info')),
//   source text,           -- 'write/page' / 'stream-agent' / 'export' 등
//   message text not null,
//   stack text,
//   url text,
//   user_agent text,
//   app_version text,
//   meta jsonb,
//   created_at timestamptz not null default now()
// );
// alter table public.client_logs enable row level security;
// create policy "anyone can insert" on public.client_logs for insert with check (true);
// create policy "admin can read" on public.client_logs for select using (auth.jwt() ->> 'role' = 'service_role');
// create index client_logs_created_idx on public.client_logs (created_at desc);
// ```
//
// BYOK 모델 (= 글로벌 룰 16) 준수 — 사장님 텔레그램에 critical만 알림 (silent skip 가능).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ★ V3.1 (2026-05-20 대표님 명시) — 텔레그램 자동 알림 X.
//   글로벌 룰 2 = "자동 푸시 알림 X — 대표님 명시 요청 시만".
//   에러 100명 작가 × 매일 = 사장님 폭주 위험 = 절대 X.
//   사장님은 client_logs DB + /admin/dashboard에서만 확인.

const VALID_LEVELS = ["error", "warn", "info"] as const;
type Level = typeof VALID_LEVELS[number];

interface LogBody {
  level: Level;
  source?: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  appVersion?: string;
  meta?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  let body: LogBody;
  try {
    body = (await req.json()) as LogBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  if (!body.level || !VALID_LEVELS.includes(body.level)) {
    return NextResponse.json({ error: "level 필수 (error/warn/info)" }, { status: 400 });
  }
  const message = (body.message || "").slice(0, 2000);
  if (!message.trim()) {
    return NextResponse.json({ error: "message 필수" }, { status: 400 });
  }

  // 인증 (옵션) — 로그인 안한 작가도 에러는 박을 수 있게 anonymous 허용
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error: insertError } = await supabase.from("client_logs").insert({
    user_id: userData.user?.id ?? null,
    user_email: userData.user?.email ?? null,
    level: body.level,
    source: body.source?.slice(0, 200) ?? null,
    message,
    stack: body.stack?.slice(0, 8000) ?? null,
    url: body.url?.slice(0, 500) ?? null,
    user_agent: body.userAgent?.slice(0, 500) ?? null,
    app_version: body.appVersion?.slice(0, 50) ?? null,
    meta: body.meta ?? null,
  });

  if (insertError) {
    // 테이블 없거나 RLS 실패 = silent (작가 화면 영향 X)
    console.error("[/api/log] insert failed:", insertError.message);
    return NextResponse.json({ success: false, warn: "log table not ready" }, { status: 200 });
  }

  // ★ V3.1 (2026-05-20) — 텔레그램 자동 알림 제거.
  //   에러는 client_logs DB에만 박힘. 사장님이 /admin/dashboard에서 보기.

  return NextResponse.json({ success: true });
}
