// V3.1 #13+#7 — 자동 .docx 백업 (작가 PC 로컬 폴더).
// Tauri 전용 — 웹은 자동 백업 X (대신 자동저장은 localStorage + Supabase 본문).
// 위치: ~/Documents/StoryMaker/{작품명}/{YYYY-MM-DD}_{HHMM}.docx
//
// 호출:
//   import { autoBackupDocx } from "@/lib/storymaker/auto-backup";
//   useEffect(() => {
//     const t = setInterval(() => autoBackupDocx(title, bodyMd), 60_000);
//     return () => clearInterval(t);
//   }, [title, bodyMd]);
//
// 룰:
//   - 첫 호출 = 즉시 1회 백업
//   - 이후 = 60초마다 본문이 변했을 때만 백업
//   - 작품당 보존 = 최근 50개 (옛 거 자동 archive — 글로벌 룰 14 = 자동 삭제 X = archive로만)
//   - 동시 호출 mutex = 마지막 호출만 실행
//   - 실패는 silent — 작가 작업 흐름 영향 X

import { Packer } from "docx";
import { markdownToDocx } from "@/lib/storymaker/export";
import { logWarn } from "@/lib/log";

function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

function sanitizeName(s: string): string {
  return s
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "작품";
}

function fmtTimestamp(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}${mi}`;
}

// 변경 감지용 — title+body의 SHA-256 hash 같지 않을 때만 백업
const lastHashByTitle = new Map<string, string>();
let running = false;

async function hashOf(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // fallback (= 충분치 못한 hash, 매번 변경으로 간주)
  return `len:${text.length}:${Date.now()}`;
}

export interface BackupResult {
  ok: boolean;
  path?: string;
  skipped?: "unchanged" | "empty" | "not-tauri" | "in-flight";
  error?: string;
}

/**
 * .docx 자동 백업. Tauri 환경에서만 동작. 웹에서는 skipped: "not-tauri" 리턴.
 *
 * @param title 작품명 (= 폴더명)
 * @param markdown 본문 markdown 문자열
 * @returns 결과 정보
 */
export async function autoBackupDocx(title: string, markdown: string): Promise<BackupResult> {
  if (!isTauri()) return { ok: false, skipped: "not-tauri" };
  if (running) return { ok: false, skipped: "in-flight" };
  if (!markdown || !markdown.trim()) return { ok: false, skipped: "empty" };

  running = true;
  try {
    const key = sanitizeName(title);
    const hash = await hashOf(markdown);
    if (lastHashByTitle.get(key) === hash) {
      return { ok: false, skipped: "unchanged" };
    }

    // (1) Tauri plugin-fs + path import
    const fs = await import("@tauri-apps/plugin-fs");
    const pathMod = await import("@tauri-apps/api/path");

    // (2) ~/Documents/StoryMaker/{작품명}/ 폴더 보장
    const documentsDir = await pathMod.documentDir();
    const folder = await pathMod.join(documentsDir, "StoryMaker", key);
    await fs.mkdir(folder, { recursive: true });

    // (3) .docx 생성 → Uint8Array
    const docName = title || "작품";
    const doc = markdownToDocx(markdown, docName);
    const blob = await Packer.toBlob(doc);
    const arrayBuf = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);

    // (4) 파일명 = {타임스탬프}.docx
    const filename = `${fmtTimestamp(new Date())}.docx`;
    const fullPath = await pathMod.join(folder, filename);
    await fs.writeFile(fullPath, bytes);

    // (5) 옛 파일 정리 = 50개 초과 시 가장 옛 거를 _archive/로 이동
    try {
      const entries = await fs.readDir(folder);
      const backups = entries
        .filter((e: { isFile: boolean; name?: string }) => e.isFile && e.name?.endsWith(".docx"))
        .map((e: { name?: string }) => e.name as string)
        .sort();
      if (backups.length > 50) {
        const archiveFolder = await pathMod.join(folder, "_archive");
        await fs.mkdir(archiveFolder, { recursive: true });
        for (const old of backups.slice(0, backups.length - 50)) {
          const from = await pathMod.join(folder, old);
          const to = await pathMod.join(archiveFolder, old);
          try { await fs.rename(from, to); } catch { /* skip if fails */ }
        }
      }
    } catch { /* archive 정리 실패는 silent */ }

    lastHashByTitle.set(key, hash);
    return { ok: true, path: fullPath };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logWarn(`autoBackupDocx failed: ${msg}`, "auto-backup");
    return { ok: false, error: msg };
  } finally {
    running = false;
  }
}

/**
 * 마지막 백업 폴더 경로 — 작가에게 "보기" 안내용.
 */
export async function getBackupFolder(title: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const pathMod = await import("@tauri-apps/api/path");
    const documentsDir = await pathMod.documentDir();
    return await pathMod.join(documentsDir, "StoryMaker", sanitizeName(title));
  } catch {
    return null;
  }
}
