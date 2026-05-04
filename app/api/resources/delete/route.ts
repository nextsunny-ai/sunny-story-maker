/**
 * /api/resources/delete — 작가가 추가한 자료 삭제 (표준 자료 = 보호)
 *
 * POST { categoryId, id }
 * → _resources/${userId}/${categoryId}/${id}.md 제거
 *
 * 표준 자료 id (char-1 / job-1 / topic-1 등)는 = 파일이 없으므로 자동 무시.
 */

import { NextRequest } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RES_ROOT = path.join(process.cwd(), "_resources");

function sanitizeId(id: string): string {
  return id
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\.+$/g, "")
    .slice(0, 120) || "anon";
}

async function getUserId(req: NextRequest): Promise<string> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() { /* noop */ },
        },
      },
    );
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch { /* ignore */ }
  return "local";
}

interface DeleteRequest {
  categoryId: string;
  id: string;
}

export async function POST(req: NextRequest) {
  let body: DeleteRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 요청" }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  if (!body.categoryId || !body.id) {
    return new Response(JSON.stringify({ error: "categoryId·id 필수" }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  const userId = sanitizeId(await getUserId(req));
  const safeCat = sanitizeId(body.categoryId);
  const safeId = sanitizeId(body.id);
  const file = path.join(RES_ROOT, userId, safeCat, `${safeId}.md`);

  try {
    await unlink(file);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    // 파일 없음 = 표준 자료 또는 이미 삭제됨 = 200으로 처리
    return new Response(JSON.stringify({
      ok: true,
      note: "파일이 존재하지 않습니다 (표준 자료는 삭제 불가).",
    }), {
      headers: { "content-type": "application/json" },
    });
  }
}
