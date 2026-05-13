// /api/admin/users — 가입자 관리 (대표님 전용)
//
// GET    = 가입자 list + 통계 (provider별·최근 가입 등)
// DELETE = ?id={user_id} = 가입자 삭제
//
// 보안:
// - Supabase auth.getUser() = 로그인 검증
// - email allowlist (= ADMIN_EMAILS env 또는 기본 nextsunny·effectgod) 검증
// - 실제 가입자 조회·삭제 = service_role key (= SUPABASE_SERVICE_ROLE_KEY, server-side only)

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const DEFAULT_ADMIN_EMAILS = ["nextsunny@gmail.com", "effectgod@gmail.com"];
function adminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS;
  if (env) return env.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase());
}

async function requireAdmin(): Promise<{ ok: true; email: string } | { ok: false; status: number; error: string }> {
  if (!SERVICE_ROLE_KEY) {
    return { ok: false, status: 500, error: "SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }
  const email = (data.user.email || "").toLowerCase();
  if (!adminEmails().includes(email)) {
    return { ok: false, status: 403, error: "관리자 권한이 없습니다." };
  }
  return { ok: true, email };
}

interface SbUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  app_metadata?: { provider?: string; providers?: string[] };
  user_metadata?: { full_name?: string; name?: string };
}

async function fetchAllUsers(): Promise<SbUser[]> {
  const all: SbUser[] = [];
  let page = 1;
  // 페이지네이션 (per_page 최대 100~1000) — 안전하게 100씩, 최대 50페이지
  for (; page <= 50; page++) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Supabase admin API ${res.status}: ${txt.slice(0, 300)}`);
    }
    const json = await res.json();
    const users: SbUser[] = json.users || [];
    all.push(...users);
    if (users.length < 100) break;
  }
  return all;
}

function buildStats(users: SbUser[]) {
  const byProvider: Record<string, number> = {};
  let last7d = 0;
  let last30d = 0;
  const now = Date.now();
  for (const u of users) {
    const p = u.app_metadata?.provider || "email";
    byProvider[p] = (byProvider[p] || 0) + 1;
    const created = new Date(u.created_at).getTime();
    if (now - created <= 7 * 86400_000) last7d++;
    if (now - created <= 30 * 86400_000) last30d++;
  }
  return { total: users.length, byProvider, last7d, last30d };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { "content-type": "application/json" },
    });
  }
  try {
    const users = await fetchAllUsers();
    const stats = buildStats(users);
    // 민감 필드 제외 = id·email·가입일·마지막로그인·provider·이름만
    const safe = users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      provider: u.app_metadata?.provider || "email",
      name: u.user_metadata?.full_name || u.user_metadata?.name || "",
    }));
    // 가입일 역순
    safe.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return new Response(JSON.stringify({ users: safe, stats, adminEmails: adminEmails() }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { "content-type": "application/json" },
    });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "id 파라미터가 필요합니다." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  // ★ 보호: 삭제 대상이 어드민 본인 또는 다른 어드민이면 거부
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      cache: "no-store",
    });
    if (res.ok) {
      const u = await res.json();
      const targetEmail = (u.email || "").toLowerCase();
      if (adminEmails().includes(targetEmail)) {
        return new Response(
          JSON.stringify({ error: `관리자 계정(${targetEmail})은 어드민 페이지에서 삭제할 수 없습니다. (= 실수 방지)` }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }
    }
  } catch {
    // 조회 실패 = 그냥 삭제 시도 진행
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return new Response(JSON.stringify({ error: `삭제 실패 (${res.status}): ${txt.slice(0, 300)}` }), {
        status: res.status,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, deleted: id }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
