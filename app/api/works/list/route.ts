import { NextResponse } from "next/server";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ★ 작품 라이브러리 자동 list (사장님 명시 2026-05-04)
 *
 * `_works/{workId}/*.md` 폴더 = 자동 스캔 → 작품 목록 반환
 *   - workId
 *   - title (= 01_제목.md 또는 = workId 자체)
 *   - 마지막 수정 시각
 *   - md 파일 수
 *   - 첫 줄 미리보기 (= 시놉시스 또는 = 로그라인)
 *
 * 작가가 = 폴더 옮기면 = 그 위치 자동 read (= process.cwd() 또는 = WORKS_DIR env).
 */
interface WorkInfo {
  workId: string;
  title: string;
  genre?: string;     // workId 첫 글자 = 매체 (A·B·...)
  preview?: string;   // 시놉시스 또는 로그라인 첫 100자
  fileCount: number;
  updatedAt: number;  // unix ms
  size: number;       // bytes
}

export async function GET() {
  const worksDir = process.env.WORKS_DIR || path.join(process.cwd(), "_works");

  if (!existsSync(worksDir)) {
    return NextResponse.json({ works: [], worksDir });
  }

  try {
    const entries = readdirSync(worksDir);
    const works: WorkInfo[] = [];

    for (const entry of entries) {
      // .DS_Store 등 숨김 파일 skip
      if (entry.startsWith(".")) continue;
      const workPath = path.join(worksDir, entry);
      let s;
      try {
        s = statSync(workPath);
      } catch { continue; }
      if (!s.isDirectory()) continue;

      // 폴더 내 .md 파일들
      let mdFiles: string[];
      try {
        mdFiles = readdirSync(workPath).filter(f => f.endsWith(".md")).sort();
      } catch {
        continue;
      }

      // workId 형식: "{매체}-{제목slug}" (예: "A-나의_드라마")
      const genreLetter = entry.split("-")[0]?.toUpperCase() || "";
      const slug = entry.split("-").slice(1).join("-").replace(/_/g, " ");

      // 제목 추출: 01_제목.md 첫 줄 또는 = workId slug
      let title = slug || entry;
      let preview = "";
      let totalSize = 0;
      let latestMtime = s.mtimeMs;

      for (const md of mdFiles) {
        const mdPath = path.join(workPath, md);
        try {
          const ms = statSync(mdPath);
          totalSize += ms.size;
          if (ms.mtimeMs > latestMtime) latestMtime = ms.mtimeMs;
          // 01_제목.md = 작품 제목
          if (md.includes("제목") || md.startsWith("01_")) {
            const content = readFileSync(mdPath, "utf-8");
            const firstLine = content.split("\n").find(l => l.trim()) || "";
            // 첫 비어있지 않은 줄 = 제목 (마크다운 # 제거)
            const cleaned = firstLine.replace(/^#+\s*/, "").trim();
            if (cleaned && cleaned.length < 80) title = cleaned;
          }
          // 시놉시스 또는 로그라인 = preview
          if (!preview && (md.includes("시놉") || md.includes("로그라인"))) {
            const content = readFileSync(mdPath, "utf-8");
            const cleaned = content
              .replace(/^#+.*$/gm, "")
              .replace(/\n+/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (cleaned) preview = cleaned.slice(0, 120);
          }
        } catch { /* skip */ }
      }

      works.push({
        workId: entry,
        title,
        genre: genreLetter,
        preview,
        fileCount: mdFiles.length,
        updatedAt: Math.floor(latestMtime),
        size: totalSize,
      });
    }

    // 최근 수정 순으로 정렬
    works.sort((a, b) => b.updatedAt - a.updatedAt);

    return NextResponse.json({ works, worksDir });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "작품 list 실패",
      works: [],
    }, { status: 500 });
  }
}
