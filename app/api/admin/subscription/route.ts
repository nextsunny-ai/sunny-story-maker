// V3.1 F2 — 작가 plan 변경 API (사장님 운영 도구).
// 사장님이 /admin/dashboard에서 작가 plan을 trial → pro → banned 등으로 변경.
//
// 인증:
//   - ADMIN_EMAILS에 박힌 이메일만 접근 가능
//   - service_role key는 박지 X (= BYOK 모델 = 사장님 비용 0 유지)
//   - RLS 정책 = admin email은 service_role JWT 없이도 update 가능하게 supabase 측 정책 추가 필요

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "nextsunny@gmail.com")
  .split(",")
  .map(s => s.trim().toLowerCase());

const VALID_PLANS = ["trial_30days", "free", "pro", "studio", "lifetime", "banned"] as const;
const VALID_STATUSES = ["active", "suspended", "expired"] as const;

interface UpdateBody {
  userId: string;
  plan?: typeof VALID_PLANS[number];
  status?: typeof VALID_STATUSES[number];
  expiresAt?: string | null;
  notes?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  let body: UpdateBody;
  try {
    body = await req.json() as UpdateBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId 필수" }, { status: 400 });
  }
  if (body.plan && !VALID_PLANS.includes(body.plan)) {
    return NextResponse.json({ error: `plan 잘못 — ${VALID_PLANS.join("·")} 중에서` }, { status: 400 });
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `status 잘못 — ${VALID_STATUSES.join("·")} 중에서` }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.plan) updates.plan = body.plan;
  if (body.status) updates.status = body.status;
  if (body.expiresAt !== undefined) updates.expires_at = body.expiresAt;
  if (body.notes !== undefined) updates.notes = body.notes;
  updates.updated_at = new Date().toISOString();

  // upsert (작가 row 없으면 = 새로 만듦)
  const { error } = await supabase.from("subscriptions").upsert({
    user_id: body.userId,
    plan: body.plan || "trial_30days",
    status: body.status || "active",
    ...updates,
  }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: `업데이트 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: body.userId, updates });
}
