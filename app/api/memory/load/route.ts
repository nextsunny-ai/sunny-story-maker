/**
 * /api/memory/load — 작품 .md 다 read
 *
 * ★ 2026-05-05 마이그레이션: _works/ 파일 → Supabase `works` 테이블.
 *
 * GET ?workId=...
 *   → { exists, files, updatedAt }
 *   → RLS = auth.uid() = 본인 작품만
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const workId = req.nextUrl.searchParams.get("workId");
  if (!workId) {
    return Response.json({ error: "workId 필수" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("works")
    .select("files, updated_at")
    .eq("user_id", authData.user.id)
    .eq("work_id", workId.slice(0, 200))
    .maybeSingle();

  if (error) {
    return Response.json(
      { error: `load 실패: ${error.message}`, files: {} },
      { status: 500 }
    );
  }

  if (!data) {
    return Response.json({
      exists: false,
      workId,
      files: {},
    });
  }

  return Response.json({
    exists: true,
    workId,
    files: (data.files as Record<string, string>) || {},
    updatedAt: data.updated_at,
  });
}
