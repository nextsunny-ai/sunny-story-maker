/**
 * /api/works/list — 작가 본인 작품 목록 (라이브러리)
 *
 * ★ 2026-05-05 마이그레이션: _works/ 폴더 스캔 → Supabase select.
 * RLS = 본인 user_id 작품만 = 다른 작가 작품 보안 격리.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WorkInfo {
  workId: string;
  title: string;
  genre?: string;
  preview?: string;
  fileCount: number;
  updatedAt: number; // unix ms
  size: number;      // bytes (= files JSONB byte 길이 추정)
  prog?: number;
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", works: [] },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("works")
    .select("work_id, title, genre, letter, preview, prog, files, updated_at")
    .eq("user_id", authData.user.id)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: `list 실패: ${error.message}`, works: [] },
      { status: 500 }
    );
  }

  const works: WorkInfo[] = (data || []).map(row => {
    const files = (row.files as Record<string, string>) || {};
    const fileCount = Object.keys(files).length;
    const size = Object.values(files).reduce(
      (sum, c) => sum + (typeof c === "string" ? c.length : 0),
      0
    );
    return {
      workId: row.work_id,
      title: row.title || row.work_id,
      genre: row.genre || row.letter || "",
      preview: row.preview || "",
      fileCount,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
      size,
      prog: typeof row.prog === "number" ? row.prog : 0,
    };
  });

  return NextResponse.json({ works, source: "supabase" });
}
