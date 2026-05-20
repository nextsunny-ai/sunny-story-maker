// V3.1 F1 — 사장님 운영 대시보드 데이터 endpoint.
// client_logs·feedbacks·works·subscriptions·신규 가입 = 한 응답.
// 사장님 (= ADMIN_EMAILS) 만 접근 가능.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 사장님 이메일 (= 환경변수로 분리. 옵션)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "nextsunny@gmail.com")
  .split(",")
  .map(s => s.trim().toLowerCase());

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

interface DashboardData {
  recentFeedbacks: Array<{
    id: string;
    user_email: string | null;
    category: string;
    message: string;
    page_url: string | null;
    app_version: string | null;
    resolved: boolean;
    created_at: string;
  }>;
  recentErrors: Array<{
    id: string;
    user_email: string | null;
    message: string;
    source: string | null;
    url: string | null;
    app_version: string | null;
    created_at: string;
  }>;
  subscriptions: Array<{
    user_id: string;
    plan: string;
    status: string;
    started_at: string;
    expires_at: string | null;
  }>;
  counts: {
    totalUsers: number;
    totalFeedbacks: number;
    totalErrors24h: number;
    activeSubscriptions: number;
    trial: number;
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!isAdmin(userData.user?.email)) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  // 병렬 fetch (= 빠르게)
  const [
    feedbacksRes,
    errorsRes,
    subscriptionsRes,
    feedbackCountRes,
    errorCountRes,
  ] = await Promise.all([
    supabase
      .from("feedbacks")
      .select("id, user_email, category, message, page_url, app_version, resolved, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("client_logs")
      .select("id, user_email, message, source, url, app_version, created_at")
      .eq("level", "error")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("subscriptions")
      .select("user_id, plan, status, started_at, expires_at")
      .order("started_at", { ascending: false })
      .limit(100),
    supabase
      .from("feedbacks")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("client_logs")
      .select("id", { count: "exact", head: true })
      .eq("level", "error")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const subs = subscriptionsRes.data || [];
  const data: DashboardData = {
    recentFeedbacks: feedbacksRes.data || [],
    recentErrors: errorsRes.data || [],
    subscriptions: subs,
    counts: {
      totalUsers: subs.length,
      totalFeedbacks: feedbackCountRes.count || 0,
      totalErrors24h: errorCountRes.count || 0,
      activeSubscriptions: subs.filter(s => s.status === "active" && s.plan !== "trial_30days" && s.plan !== "banned").length,
      trial: subs.filter(s => s.plan === "trial_30days").length,
    },
  };

  return NextResponse.json(data, {
    headers: { "cache-control": "no-store, max-age=0" },
  });
}
