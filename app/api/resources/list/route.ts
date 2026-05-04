/**
 * /api/resources/list — 표준 자료(lib/resources/data.ts) + 작가별 추가 자료(_resources/${userId}/...) 합쳐서 반환
 *
 * GET → { categories: ResourceCategory[] }
 *   각 카테고리 items = 표준 items + 작가가 박은 items
 *
 * 작가별 자료 = .md frontmatter parse → ResourceItem 형태로
 * 카테고리 누락 폴더 = 새 카테고리로 추가 X (data.ts 정의 카테고리만 표시)
 */

import { NextRequest } from "next/server";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";
import { RESOURCE_CATEGORIES, type ResourceCategory, type ResourceItem } from "@/lib/resources/data";

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

/** .md frontmatter + body parse → ResourceItem (mine 표시 추가) */
function parseMineMd(content: string, fallbackId: string): (ResourceItem & { mine?: boolean }) | null {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  let meta: Record<string, string> = {};
  let body = "";
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const eq = line.indexOf(":");
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (k) meta[k] = v;
    }
    body = m[2].trim();
  } else {
    body = content.trim();
  }
  if (!meta.title) return null;
  const tags = meta.tags
    ? meta.tags.split(",").map(t => t.trim()).filter(Boolean)
    : [];
  return {
    id: meta.id || fallbackId,
    title: meta.title,
    body,
    tags,
    mine: true,
  };
}

export async function GET(req: NextRequest) {
  const userId = sanitizeId(await getUserId(req));
  const userRoot = path.join(RES_ROOT, userId);

  // 표준 카테고리 deep clone (items 새 배열로 — 표준 mutate 방지)
  const result: (ResourceCategory & { items: (ResourceItem & { mine?: boolean })[] })[] =
    RESOURCE_CATEGORIES.map(c => ({
      ...c,
      items: c.items.map(it => ({ ...it })),
    }));

  // 작가 폴더 스캔
  let catDirs: string[] = [];
  try {
    const entries = await readdir(userRoot, { withFileTypes: true });
    catDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    // 폴더 없음 = 표준만 반환
    return new Response(JSON.stringify({ categories: result }), {
      headers: { "content-type": "application/json" },
    });
  }

  for (const catId of catDirs) {
    const catBucket = result.find(c => c.id === catId);
    if (!catBucket) continue; // 정의 외 카테고리 = skip
    const catDir = path.join(userRoot, catId);
    let files: string[] = [];
    try {
      const entries = await readdir(catDir);
      files = entries.filter(f => f.endsWith(".md")).sort();
    } catch { continue; }

    for (const f of files) {
      try {
        const content = await readFile(path.join(catDir, f), "utf-8");
        const item = parseMineMd(content, f.replace(/\.md$/, ""));
        if (item) catBucket.items.push(item);
      } catch { /* skip */ }
    }
  }

  return new Response(JSON.stringify({ categories: result }), {
    headers: { "content-type": "application/json" },
  });
}
