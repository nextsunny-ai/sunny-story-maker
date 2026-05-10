import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { issueLicense, createDefaultRecord, type LicenseRecord, type Plan } from "@/lib/license";

/**
 * License check API — 작가 인증 후 = JWT 발급/갱신.
 *
 * 호출 흐름:
 * 1. 데스크탑 앱 시작 → 옛 JWT 만료 또는 없음 → 이 endpoint 호출
 * 2. Supabase 인증 (= 쿠키 기반)
 * 3. `subscriptions` 테이블 조회 (= 본인 record)
 * 4. 없으면 = 자동 trial_30days insert
 * 5. valid_until 만료 = status="expired" 처리
 * 6. JWT 발급 (7일 유효) → 클라이언트가 ~/.sunny/license.json 저장
 *
 * Supabase schema:
 * ```sql
 * create table public.subscriptions (
 *   user_id uuid primary key references auth.users(id) on delete cascade,
 *   email text not null,
 *   plan text not null default 'trial_30days' check (plan in ('trial_30days','free','pro','studio','lifetime','banned')),
 *   status text not null default 'active' check (status in ('active','expired','suspended')),
 *   valid_until timestamptz,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 *
 * alter table public.subscriptions enable row level security;
 *
 * create policy "Users can read own subscription"
 *   on public.subscriptions for select
 *   to authenticated
 *   using (auth.uid() = user_id);
 *
 * -- insert/update는 server (service role) 또는 trigger로 처리
 * create policy "Users can insert own initial subscription"
 *   on public.subscriptions for insert
 *   to authenticated
 *   with check (auth.uid() = user_id and plan = 'trial_30days');
 * ```
 */

export const runtime = "nodejs"; // jose JWT 사용 = Edge OK이지만, Supabase server client = nodejs 권장
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const user = userData.user;

  // 1. 옛 record 조회
  const { data: existing, error: selectError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json(
      { error: `구독 정보 조회 실패: ${selectError.message}` },
      { status: 500 }
    );
  }

  let record: LicenseRecord;

  if (!existing) {
    // 2. 없으면 = 자동 trial_30days insert
    const initial = createDefaultRecord(user.id, user.email ?? "");
    const { data: inserted, error: insertError } = await supabase
      .from("subscriptions")
      .insert(initial)
      .select()
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: `구독 생성 실패: ${insertError?.message ?? "unknown"}` },
        { status: 500 }
      );
    }
    record = inserted as LicenseRecord;
  } else {
    record = existing as LicenseRecord;

    // 3. valid_until 만료 검증
    if (record.valid_until) {
      const validUntil = new Date(record.valid_until).getTime();
      if (validUntil < Date.now() && record.status === "active") {
        // 만료 = status 갱신 (= 다음 요청에 반영)
        const newPlan: Plan = record.plan === "trial_30days" ? "free" : record.plan;
        const { data: updated } = await supabase
          .from("subscriptions")
          .update({
            status: "expired",
            plan: newPlan,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .select()
          .single();
        if (updated) record = updated as LicenseRecord;
      }
    }
  }

  // 4. banned·suspended = 토큰 발급 X
  if (record.plan === "banned" || record.status === "suspended") {
    return NextResponse.json(
      {
        error: "계정이 정지되었습니다. 문의: support@sunnytoon.com",
        code: "ACCOUNT_SUSPENDED",
      },
      { status: 403 }
    );
  }

  // 5. JWT 발급
  let token: string;
  try {
    token = await issueLicense(record);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "JWT 발급 실패", code: "JWT_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    token,
    record: {
      plan: record.plan,
      status: record.status,
      valid_until: record.valid_until,
    },
    issued_at: new Date().toISOString(),
    expires_in_seconds: 7 * 24 * 60 * 60,
  });
}
