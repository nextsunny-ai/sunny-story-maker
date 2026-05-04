/**
 * /api/memory/load — 작품별 .md 파일 다 read
 *
 * GET ?workId=...
 * → { files: { "01_info.md": "...", "02_brief.md": "...", ... }, exists: true/false }
 *
 * 매 AI 호출 시 = agent/stream route.ts에서 = workId 있으면 = 호출 → prior로 박음.
 * 사장님 명시: 백그라운드 Claude들이 시작 시 = 이 .md 다 읽고 작업.
 */

import { NextRequest } from "next/server";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKS_ROOT = path.join(process.cwd(), "_works");

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

export async function GET(req: NextRequest) {
  const workId = req.nextUrl.searchParams.get("workId");
  if (!workId) {
    return new Response(JSON.stringify({ error: "workId 필수" }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  // ★ 작가별 격리 — _works/${userId}/${workId}/*.md
  const userId = sanitizeId(await getUserId(req));
  const safeWorkId = sanitizeId(workId);
  const workDir = path.join(WORKS_ROOT, userId, safeWorkId);

  try {
    const entries = await readdir(workDir);
    const mdFiles = entries.filter(f => f.endsWith(".md")).sort();

    const files: Record<string, string> = {};
    for (const f of mdFiles) {
      try {
        const content = await readFile(path.join(workDir, f), "utf-8");
        files[f] = content;
      } catch {
        // 개별 파일 read 실패 = skip
      }
    }

    return new Response(JSON.stringify({
      exists: true,
      workDir: `${userId}/${safeWorkId}`,
      files,
    }), {
      headers: { "content-type": "application/json" },
    });
  } catch {
    // 폴더 없음 = 첫 작품 = 빈 메모리
    return new Response(JSON.stringify({
      exists: false,
      workDir: `${userId}/${safeWorkId}`,
      files: {},
    }), {
      headers: { "content-type": "application/json" },
    });
  }
}
