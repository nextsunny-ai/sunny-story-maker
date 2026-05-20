"use client";

// V3.1 — 작가 저장 위치 설정.
// 디폴트:
//   - localStorage = 항상 (= 그 PC 브라우저 = 즉시·빠름)
//   - Supabase 클라우드 = 로그인 시 자동
//   - 데스크탑 .docx 백업 = ~/Documents/StoryMaker/ (Tauri만)
//
// 작가 변경 가능 (이 모듈):
//   - 백업 폴더 = OS dialog로 선택 (Google Drive·Dropbox·USB 등)
//   - Supabase 동기화 = ON/OFF 토글 (= 본 PC만 쓰고 싶을 때)
//   - 백업 빈도 = 60s (디폴트) / 30s / 300s

const STORAGE_KEY = "sunny.storymaker.storage.prefs.v1";

export interface StoragePrefs {
  /** 작가가 지정한 백업 폴더 (Tauri 데스크탑). 없으면 = ~/Documents/StoryMaker/ */
  backupFolder: string | null;
  /** Supabase 클라우드 동기화 (= works·snapshots 저장) */
  cloudSync: boolean;
  /** 자동 .docx 백업 빈도 (초) */
  backupIntervalSec: number;
}

const DEFAULT_PREFS: StoragePrefs = {
  backupFolder: null,
  cloudSync: true,
  backupIntervalSec: 60,
};

export function loadStoragePrefs(): StoragePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<StoragePrefs>;
    return {
      backupFolder: typeof parsed.backupFolder === "string" ? parsed.backupFolder : null,
      cloudSync: typeof parsed.cloudSync === "boolean" ? parsed.cloudSync : true,
      backupIntervalSec: typeof parsed.backupIntervalSec === "number" ? parsed.backupIntervalSec : 60,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveStoragePrefs(prefs: Partial<StoragePrefs>): void {
  if (typeof window === "undefined") return;
  const current = loadStoragePrefs();
  const next = { ...current, ...prefs };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("sunny:storage-prefs-change", { detail: next }));
  } catch { /* ignore */ }
}

/**
 * 작가가 OS 다이얼로그로 백업 폴더 선택 (Tauri 전용).
 * @returns 선택된 폴더 절대 경로 또는 null (취소·웹)
 */
export async function pickBackupFolder(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("__TAURI_INTERNALS__" in window)) {
    alert("저장 폴더 지정 = 데스크탑 앱에서만 가능합니다.\n웹에서는 = 브라우저 다운로드 폴더에 자동 저장.");
    return null;
  }
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const result = await open({
      directory: true,
      multiple: false,
      title: "작품 .docx 자동 백업 폴더 선택",
    });
    if (typeof result === "string" && result) {
      saveStoragePrefs({ backupFolder: result });
      return result;
    }
    return null;
  } catch (e) {
    console.error("[pickBackupFolder] 실패:", e);
    return null;
  }
}

/**
 * 현재 사용 중인 백업 폴더 경로 (display용).
 */
export async function getCurrentBackupFolder(): Promise<string> {
  const prefs = loadStoragePrefs();
  if (prefs.backupFolder) return prefs.backupFolder;
  // 디폴트 = ~/Documents/StoryMaker/
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return "(웹 = 브라우저 다운로드 폴더)";
  }
  try {
    const pathMod = await import("@tauri-apps/api/path");
    const documentsDir = await pathMod.documentDir();
    return await pathMod.join(documentsDir, "StoryMaker");
  } catch {
    return "~/Documents/StoryMaker/";
  }
}
