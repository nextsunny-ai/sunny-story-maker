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

/**
 * .smkr 파일 다운로드 (= 브라우저 다운로드 폴더로).
 */
export function downloadSmkr(input: SmkrExportInput): void {
  const json = serializeSmkr(input);
  const title = (input.work.title || "작품").trim() || "작품";
  const safeName = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 80);
  const filename = `${safeName}${SMKR_EXTENSION}`;
  const blob = new Blob([json], { type: SMKR_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 작가 PC에서 .smkr 파일 선택 → 파싱.
 * Tauri 데스크탑 = OS 다이얼로그.
 * 웹 = <input type="file">.
 */
export async function openSmkrFile(): Promise<{ ok: true; file: SmkrProjectFile } | { ok: false; error: string }> {
  if (typeof window === "undefined") return { ok: false, error: "브라우저 환경이 아닙니다." };

  // Tauri 데스크탑 = OS 다이얼로그
  if ("__TAURI_INTERNALS__" in window) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const result = await open({
        multiple: false,
        filters: [{ name: "Story Maker 프로젝트", extensions: ["smkr", "json"] }],
        title: "프로젝트 파일 열기",
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
