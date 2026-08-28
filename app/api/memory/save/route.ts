/**
 * /api/memory/save — 작품별 메모리 .md 저장
 *
 * ★ 2026-05-05 마이그레이션: _works/ 파일 → Supabase `works` 테이블 (Vercel 디스크 휘발성).
 * 대표님 명시: production = 작품 영구 저장 = 어디서 로그인해도 같은 작품 (SSO).
 *
 * POST { workId, files: { "01_제목.md": "...", ... } }
 *   → upsert into public.works (user_id = auth.uid(), work_id, files JSONB)
 *   → meta(title·genre·preview·prog) = files에서 자동 추출
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveRequest {
  workId: string;
  files: Record<string, string>;
}

interface ExtractedMeta {
  title: string;
  genre: string;
  letter: string;
  preview: string;
  prog: number;
}

/** 작품 메타데이터 = files에서 자동 추출 (= 옛 _works/ 폴더명 방식과 호환) */
function extractMeta(workId: string, files: Record<string, string>): ExtractedMeta {
  const letter = (workId.split("-")[0] || "").toUpperCase();
  const slug = workId.split("-").slice(1).join("-").replace(/_/g, " ");

  let title = slug || workId;
  let preview = "";

  for (const [filename, content] of Object.entries(files)) {
    if (!content) continue;

    // 제목: 01_제목.md 첫 줄 (마크다운 # 제거)
    if (filename.includes("제목") || filename.startsWith("01_")) {
      const firstLine = content.split("\n").find(l => l.trim()) || "";
      const cleaned = firstLine.replace(/^#+\s*/, "").trim();
      if (cleaned && cleaned.length < 80) title = cleaned;
    }
    // 시놉시스/로그라인 = preview
    if (!preview && (filename.includes("시놉") || filename.includes("로그라인"))) {
      const cleaned = content
        .replace(/^#+.*$/gm, "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned) preview = cleaned.slice(0, 120);
    }
  }

  // prog 추정: 채워진 .md 파일 수 / 총 6단계
  const filledCount = Object.values(files).filter(c => c && c.trim().length > 50).length;
  const prog = Math.min(1, filledCount / 6);

  return { title, genre: letter, letter, preview, prog };
}

export async function POST(req: NextRequest) {
  let body: SaveRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청" }, { status: 400 });
  }

  if (!body.workId || !body.files) {
    return Response.json({ error: "workId와 files 필수" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const userId = authData.user.id;
  const workId = body.workId.slice(0, 200);
  const meta = extractMeta(workId, body.files);

  const { data, error } = await supabase
    .from("works")
    .upsert(
      {
        user_id: userId,
        work_id: workId,
        title: meta.title,
        genre: meta.genre,
        letter: meta.letter,
        preview: meta.preview,
        prog: meta.prog,
        files: body.files,
      },
      { onConflict: "user_id,work_id" }
    )
    .select("id, work_id, updated_at")
    .single();

  if (error) {
    return Response.json(
      { error: `저장 실패: ${error.message}` },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    id: data.id,
    workId: data.work_id,
    updatedAt: data.updated_at,
    saved: Object.keys(body.files),
  });
}
