import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ★ V3.1 (2026-05-20 대표님 명시) — 텔레그램 자동 알림 X.
//   글로벌 룰 2 = "자동 푸시 알림 X — 대표님 명시 요청 시만".
//   피드백은 feedbacks DB + /admin/dashboard에서만 확인.

/**
 * In-app 피드백 API
 *
 * 작가가 우측 하단 위젯에서 피드백 보내면 이 endpoint로 POST.
 * Supabase `feedbacks` 테이블에 저장.
 *
 * Schema (Supabase SQL):
 * ```sql
 * create table public.feedbacks (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references auth.users(id) on delete set null,
 *   user_email text,
 *   category text not null check (category in ('bug', 'feature', 'praise', 'question', 'other')),
 *   message text not null,
 *   page_url text,
 *   user_agent text,
 *   app_version text,
 *   resolved boolean default false,
 *   created_at timestamptz default now()
 * );
 *
 * alter table public.feedbacks enable row level security;
 *
 * -- 작가는 본인 피드백만 read 가능 (관리자만 전체 read)
 * create policy "Users can insert own feedback"
 *   on public.feedbacks for insert
 *   to authenticated
 *   with check (auth.uid() = user_id);
 *
 * create policy "Users can read own feedback"
 *   on public.feedbacks for select
 *   to authenticated
 *   using (auth.uid() = user_id);
 * ```
 */

const VALID_CATEGORIES = ["bug", "feature", "praise", "question", "other"] as const;
type Category = typeof VALID_CATEGORIES[number];

interface FeedbackBody {
  category: Category;
  message: string;
  pageUrl?: string;
  userAgent?: string;
  appVersion?: string;
}

export async function POST(req: NextRequest) {
  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  // 검증
  if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json(
      { error: "category는 bug/feature/praise/question/other 중 하나여야 합니다." },
      { status: 400 }
    );
  }
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "메시지는 필수입니다." }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "메시지는 5000자를 넘을 수 없습니다." }, { status: 400 });
  }

  // 인증된 사용자만 피드백 보낼 수 있음
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { error: insertError } = await supabase.from("feedbacks").insert({
    user_id: userData.user.id,
    user_email: userData.user.email,
    category: body.category,
    message,
    page_url: body.pageUrl ?? null,
    user_agent: body.userAgent ?? null,
    app_version: body.appVersion ?? "v2.11",
  });

  if (insertError) {
    return NextResponse.json(
      { error: `저장 실패: ${insertError.message}` },
      { status: 500 }
    );
  }

  // ★ V3.1 (2026-05-20) — 텔레그램 자동 알림 제거 (대표님 명시).
  //   피드백은 feedbacks DB에만 박힘. 사장님은 /admin/dashboard에서 본문·답신·resolved 처리.

  return NextResponse.json({ success: true });
}
