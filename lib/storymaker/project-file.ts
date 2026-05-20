"use client";

// V3.1 — .smkr 작품 프로젝트 파일.
// 옛 편집 프로그램 (Premiere .prproj·After Effects .aep·Photoshop .psd)처럼
// 작가가 = 진짜 파일로 작품 = 보관·공유·이메일·USB·드라이브.
//
// 파일 = JSON (= 작가 친화적·간단). 확장자 = .smkr (Story Maker).
//
// 포함:
//   - meta: 버전·생성·수정 timestamp
//   - work: title·chapter·medium 등
//   - paras: 본문 단락 전체
//   - headerBlocks: 회차/장 헤더
//   - notes: 작가 노트
//   - flow: workflow steps
//   - chat: AI 채팅 history (= AI 협업 맥락 보존)
//   - mediumFields: 의뢰서 답변
//   - genreLetter: 매체 letter
//
// export = JSON.stringify + .smkr 확장자
// import = 파일 read + JSON.parse + 검증 + state 복원

import type { Para, WorkInfo } from "@/components/WriteCanvas";
import type { Note, FlowItem, ChatMsg } from "@/components/WriteWorkbook";
import type { HeaderBlock as HeaderBlockV3 } from "@/lib/storymaker/write-doc";
import type { FieldValues } from "@/components/MediumFieldRenderer";

export const SMKR_VERSION = 3;
export const SMKR_EXTENSION = ".smkr";
export const SMKR_MIME = "application/vnd.sunny.storymaker+json";

export interface SmkrProjectFile {
  /** 포맷 버전 = 3 (V3.0/V3.1) */
  v: number;
  /** Story Maker 앱 버전 (참고) */
  appVersion: string;
  /** 작품 정보 */
  work: WorkInfo;
  /** 매체 letter (A~P) */
  genreLetter: string;
  /** 본문 단락 */
  paras: Para[];
  /** 회차/장 헤더 (V3.0+) */
  headerBlocks?: HeaderBlockV3[];
  /** 작가 노트 */
  notes: Note[];
  /** workflow steps */
  flow: FlowItem[];
  /** AI 채팅 history */
  chat: ChatMsg[];
  /** 의뢰서 답변 */
  mediumFields?: FieldValues;
  /** 작가 의뢰서 작성 완료 여부 */
  briefDone?: boolean;
  /** 생성·수정 timestamp */
  createdAt: string;
  updatedAt: string;
  /** 옛 PC·작가 본인 (참고) */
  exportedBy?: { app: string; platform: string };
}

export interface SmkrExportInput {
  work: WorkInfo;
  genreLetter: string;
  paras: Para[];
  headerBlocks?: HeaderBlockV3[];
  notes: Note[];
  flow: FlowItem[];
  chat: ChatMsg[];
  mediumFields?: FieldValues;
  briefDone?: boolean;
}

/**
 * 작품 → JSON 문자열 (.smkr 파일 내용).
 */
export function serializeSmkr(input: SmkrExportInput): string {
  const now = new Date().toISOString();
  const file: SmkrProjectFile = {
    v: SMKR_VERSION,
    appVersion: "v3.1.0",
    work: input.work,
    genreLetter: input.genreLetter,
    paras: input.paras,
    headerBlocks: input.headerBlocks,
    notes: input.notes,
    flow: input.flow,
    chat: input.chat,
    mediumFields: input.mediumFields,
    briefDone: input.briefDone,
    createdAt: now,
    updatedAt: now,
    exportedBy: {
      app: "Story Maker",
      platform: typeof navigator !== "undefined" ? navigator.platform : "?",
    },
  };
  return JSON.stringify(file, null, 2);
}

/**
 * JSON 문자열 → 작품 (.smkr 파일 import).
 */
export function parseSmkr(text: string): { ok: true; file: SmkrProjectFile } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(text) as Partial<SmkrProjectFile>;
    if (typeof parsed.v !== "number") {
      return { ok: false, error: "올바르지 않은 .smkr 파일입니다 (= 버전 정보 없음)." };
    }
    if (parsed.v > SMKR_VERSION) {
      return { ok: false, error: `이 파일은 신버전 ${parsed.v}로 만든 거라 = 현재 Story Maker (v${SMKR_VERSION})로 = 열 수 없습니다. 앱 업데이트 후 다시 시도해주세요.` };
    }
    if (!parsed.work || !Array.isArray(parsed.paras)) {
      return { ok: false, error: "본문 정보가 손상됐습니다." };
    }
    // 옛 v2 파일 호환 — headerBlocks 없을 수 있음
    if (!parsed.headerBlocks) parsed.headerBlocks = [];
    if (!parsed.notes) parsed.notes = [];
    if (!parsed.flow) parsed.flow = [];
    if (!parsed.chat) parsed.chat = [];
    if (!parsed.genreLetter) parsed.genreLetter = "A";
    return { ok: true, file: parsed as SmkrProjectFile };
  } catch (e) {
    return { ok: false, error: `파일 파싱 실패: ${e instanceof Error ? e.message : String(e)}\n\n.smkr 파일이 손상됐을 수 있습니다.` };
  }
}

function safeName(title: string): string {
  return (title.trim() || "작품").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 80);
}

/**
 * .smkr 파일 저장.
 * Tauri 데스크탑 = ~/Documents/StoryMaker/프로젝트/{작품명}.smkr (= 작가 라이브러리)
 *   + Settings의 backupFolder 박혀있으면 = 그 폴더의 프로젝트/ 사용
 * 웹 = 브라우저 다운로드 폴더 (= 옛 path)
 *
 * @returns 저장된 파일 절대 경로 (Tauri) 또는 null (웹)
 */
export async function saveSmkrToProjectFolder(input: SmkrExportInput): Promise<string | null> {
  const json = serializeSmkr(input);
  const filename = `${safeName(input.work.title || "작품")}${SMKR_EXTENSION}`;

  // Tauri 데스크탑 = 디폴트 프로젝트 폴더에 박힘
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    try {
      const fs = await import("@tauri-apps/plugin-fs");
      const pathMod = await import("@tauri-apps/api/path");
      const { loadStoragePrefs } = await import("./storage-prefs");
      const prefs = loadStoragePrefs();
      const baseFolder = prefs.backupFolder
        || (await pathMod.join(await pathMod.documentDir(), "StoryMaker"));
      const projectFolder = await pathMod.join(baseFolder, "프로젝트");
      await fs.mkdir(projectFolder, { recursive: true });
      const fullPath = await pathMod.join(projectFolder, filename);
      await fs.writeTextFile(fullPath, json);
      return fullPath;
    } catch (e) {
      console.error("[saveSmkrToProjectFolder] Tauri 저장 실패, 브라우저 다운로드로 fallback:", e);
    }
  }

  // 웹 또는 Tauri 실패 = 브라우저 다운로드 폴더
  const blob = new Blob([json], { type: SMKR_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return null;
}

/**
 * 옛 호환 — 그냥 브라우저 다운로드.
 */
export function downloadSmkr(input: SmkrExportInput): void {
  const json = serializeSmkr(input);
  const filename = `${safeName(input.work.title || "작품")}${SMKR_EXTENSION}`;
  const blob = new Blob([json], { type: SMKR_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 프로젝트 폴더의 모든 .smkr 파일 listing (Tauri 데스크탑).
 * 라이브러리에서 목록 표시용.
 *
 * @returns 작품 메타데이터 배열 (없으면 [])
 */
export interface SmkrFileEntry {
  filename: string;
  fullPath: string;
  title: string;
  genreLetter: string;
  paraCount: number;
  noteCount: number;
  updatedAt: string;
  sizeKb: number;
}

export async function listProjectFolder(): Promise<SmkrFileEntry[]> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return [];
  try {
    const fs = await import("@tauri-apps/plugin-fs");
    const pathMod = await import("@tauri-apps/api/path");
    const { loadStoragePrefs } = await import("./storage-prefs");
    const prefs = loadStoragePrefs();
    const baseFolder = prefs.backupFolder
      || (await pathMod.join(await pathMod.documentDir(), "StoryMaker"));
    const projectFolder = await pathMod.join(baseFolder, "프로젝트");

    // 폴더 없으면 = 빈 배열
    try {
      const exists = await fs.exists(projectFolder);
      if (!exists) return [];
    } catch {
      return [];
    }

    const entries = await fs.readDir(projectFolder);
    const smkrFiles = entries.filter((e: { isFile: boolean; name?: string }) =>
      e.isFile && e.name?.endsWith(".smkr"));

    const result: SmkrFileEntry[] = [];
    for (const e of smkrFiles) {
      try {
        const fullPath = await pathMod.join(projectFolder, e.name as string);
        const text = await fs.readTextFile(fullPath);
        const parsed = JSON.parse(text) as Partial<SmkrProjectFile>;
        const sizeKb = Math.ceil(text.length / 1024);
        result.push({
          filename: e.name as string,
          fullPath,
          title: parsed.work?.title || (e.name as string).replace(/\.smkr$/, ""),
          genreLetter: parsed.genreLetter || "A",
          paraCount: parsed.paras?.length || 0,
          noteCount: parsed.notes?.length || 0,
          updatedAt: parsed.updatedAt || "",
          sizeKb,
        });
      } catch { /* 파싱 실패 = skip */ }
    }
    // 최근 수정순 정렬
    result.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return result;
  } catch (e) {
    console.error("[listProjectFolder] 실패:", e);
    return [];
  }
}

/**
 * 특정 경로의 .smkr 파일 read (= 라이브러리에서 클릭 시 호출).
 */
export async function loadSmkrFromPath(fullPath: string): Promise<{ ok: true; file: SmkrProjectFile } | { ok: false; error: string }> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return { ok: false, error: "데스크탑 앱에서만 지원" };
  }
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const text = await readTextFile(fullPath);
    return parseSmkr(text);
  } catch (e) {
    return { ok: false, error: `파일 열기 실패: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * 작가 PC에서 .smkr 파일 선택 → 파싱.
 * Tauri 데스크탑 = OS 다이얼로그.
 * 웹 = <input type="file">.
 */
export async function openSmkrFile(): Promise<{ ok: true; file: SmkrProjectFile } | { ok: false; error: string }> {
  if (typeof window === "undefined") return { ok: false, error: "브라우저 환경이 아닙니다." };

  // Tauri 데스크탑 = OS 다이얼로그 (★ 디폴트 = 프로젝트 폴더 자동 열림)
  if ("__TAURI_INTERNALS__" in window) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const pathMod = await import("@tauri-apps/api/path");
      const { loadStoragePrefs } = await import("./storage-prefs");
      const prefs = loadStoragePrefs();
      const baseFolder = prefs.backupFolder
        || (await pathMod.join(await pathMod.documentDir(), "StoryMaker"));
      const projectFolder = await pathMod.join(baseFolder, "프로젝트");
      const result = await open({
        multiple: false,
        filters: [{ name: "Story Maker 프로젝트", extensions: ["smkr", "json"] }],
        title: "프로젝트 파일 열기",
        defaultPath: projectFolder, // ★ 작가가 그 폴더 바로 보임
      });
      if (typeof result !== "string" || !result) return { ok: false, error: "취소됨" };
      const text = await readTextFile(result);
      return parseSmkr(text);
    } catch (e) {
      return { ok: false, error: `파일 열기 실패: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // 웹 = <input type="file">
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".smkr,.json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ ok: false, error: "취소됨" });
        return;
      }
      try {
        const text = await file.text();
        resolve(parseSmkr(text));
      } catch (e) {
        resolve({ ok: false, error: `파일 read 실패: ${e instanceof Error ? e.message : String(e)}` });
      }
    };
    input.click();
  });
}
