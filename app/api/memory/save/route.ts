/**
 * /api/memory/save — 작품별 메모리 .md 파일 저장
 *
 * 사장님 명시: 백그라운드 Claude들이 = 이 .md를 읽고 시작.
 * 작품마다 = `_works/[workId]/*.md` 폴더 + 6개 .md 파일.
 *
 * 자동 저장 useEffect (write/page.tsx)에서 = localStorage 박힐 때 = 동시에 호출.
 * 다른 PC sync = `_works/`를 Drive에 두면 = 자동 (사장님 명시 후).
 */

import { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKS_ROOT = path.join(process.cwd(), "_works");

/** Windows·Mac·Linux 호환 폴더명 sanitize */
function sanitizeId(id: string): string {
  return id
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\.+$/g, "")
    .slice(0, 120) || "anon";
}

/** 작가 ID 추출 — supabase auth user.id 또는 LOCAL fallback "local" */
async function getUserId(req: NextRequest): Promise<string> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() { /* noop — read only */ },
        },
      },
    );
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch { /* ignore */ }
  // LOCAL (BYPASS_AUTH·OAuth 환경) = 단일 작가 "local"
  return "local";
}

interface SaveRequest {
  workId: string;
  files: Record<string, string>; // { "01_info.md": "...", ... }
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

  if (!body.workId || !body.files) {
    return new Response(JSON.stringify({ error: "workId와 files 필수" }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  // ★ 작가별 격리 — _works/${userId}/${workId}/*.md
  const userId = sanitizeId(await getUserId(req));
  const safeWorkId = sanitizeId(body.workId);
  const workDir = path.join(WORKS_ROOT, userId, safeWorkId);

  try {
    await mkdir(workDir, { recursive: true });

    const saved: string[] = [];
    for (const [filename, content] of Object.entries(body.files)) {
      // 파일명도 sanitize (경로 트래버설 방지)
      const safeFilename = filename
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/^\.+/, "");
      if (!safeFilename) continue;

      const filePath = path.join(workDir, safeFilename);
      await writeFile(filePath, content || "", "utf-8");
      saved.push(safeFilename);
    }

    return new Response(JSON.stringify({
      ok: true,
      workDir: `${userId}/${safeWorkId}`,
      saved,
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
