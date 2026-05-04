/**
 * /api/resources/save — 작가가 추가한 자료 1건 저장 (.md)
 *
 * POST { categoryId, title, body, tags? }
 * → _resources/${userId}/${categoryId}/${slug}.md
 *
 * 저장 형식 (.md frontmatter):
 *   ---
 *   id: ...
 *   title: ...
 *   tags: ...
 *   createdAt: ISO
 *   ---
 *   본문
 *
 * 표준 데이터(lib/resources/data.ts)는 read-only — 작가 추가본은 여기서.
 * /api/resources/list가 표준 + 작가본을 합쳐서 줌.
 */

import { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
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

interface SaveRequest {
  categoryId: string;       // characters / jobs / eras / metaphors / topics / places
  title: string;
  body: string;
  tags?: string[];
  /** 동일 id로 update — 미지정 시 신규 */
  id?: string;
}

export async function POST(req: NextRequest) {
  let body: SaveRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 요청" }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  if (!body.categoryId || !body.title) {
    return new Response(JSON.stringify({ error: "categoryId·title 필수" }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  const userId = sanitizeId(await getUserId(req));
  const safeCat = sanitizeId(body.categoryId);
  const id = body.id ? sanitizeId(body.id) : `mine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const dir = path.join(RES_ROOT, userId, safeCat);
  const file = path.join(dir, `${id}.md`);

  // .md frontmatter + body
  const tags = (body.tags || []).filter(Boolean);
  const md = `---
id: ${id}
title: ${body.title.replace(/\n/g, " ").trim()}
tags: ${tags.join(", ")}
createdAt: ${new Date().toISOString()}
---

${body.body || ""}
`;

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(file, md, "utf-8");
    return new Response(JSON.stringify({
      ok: true,
      id,
      categoryId: safeCat,
      path: `${userId}/${safeCat}/${id}.md`,
    }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "저장 실패",
    }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
