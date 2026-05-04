// 작업별 모델 선호 — admin에서 작가가 선택. 각 페이지에서 로드 후 fast 결정.
// 기본: 집필/각색 = Opus (퀄리티) / 리뷰·OSMU·채팅 = Haiku (빠름·토큰 절약)

import { KEY, loadJSON } from "@/lib/persist";

export type ModelChoice = "haiku" | "opus";
export type TaskKind = "write" | "adapt" | "review" | "osmu" | "chat";

export interface ModelPrefs {
  write: ModelChoice;   // 집필 (logline/treatment/synopsis/script)
  adapt: ModelChoice;   // 각색 (revise/adapt-cross)
  review: ModelChoice;  // 다중 타겟 리뷰
  osmu: ModelChoice;    // 12매체 매트릭스
  chat: ModelChoice;    // 보조작가 채팅
}

// 사장님 명시 (2026-05-03): 글쓰기 메인 작업 = Opus. 보조작가만 Haiku (자료조사·잡담 = 빠름).
export const DEFAULT_MODEL_PREFS: ModelPrefs = {
  write: "opus",   // 본문·트리트먼트·시놉·캐릭터·기승전결 — 퀄리티 우선
  adapt: "opus",   // 본문 변환·각색 — 깊이 필요
  review: "opus",  // 다중 타겟 리뷰 — 작가 quality 중요
  osmu: "opus",    // 12매체 매트릭스 — 매체별 정확도
  chat: "haiku",   // 보조작가 — 자료조사·이름추천·잡담 = 빠름 우선
};

export const MODEL_LABELS: Record<ModelChoice, string> = {
  haiku: "Haiku (빠름 · 토큰 절약)",
  opus: "Opus (깊이 · 퀄리티 우선)",
};

export function loadModelPrefs(): ModelPrefs {
  const saved = loadJSON<Partial<ModelPrefs> | null>(KEY.adminModelPrefs, null);
  return { ...DEFAULT_MODEL_PREFS, ...(saved ?? {}) };
}

/** 페이지에서 호출: 작업 종류 → fast(true=Haiku) 또는 false(Opus) */
export function isFastModel(kind: TaskKind): boolean {
  const prefs = loadModelPrefs();
  return prefs[kind] === "haiku";
}
