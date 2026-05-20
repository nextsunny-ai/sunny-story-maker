// 작업별 모델 선호 — admin에서 작가가 선택. 각 페이지가 호출 시 model 결정.
//
// ★ 대표님 확정 (2026-05-19):
//   - develop(사전 자료) = Sonnet — 작품 뼈대라 똑똑해야. Haiku는 깊이 부족.
//   - write(본문)·adapt(각색) = Opus — 작가 작품의 핵심 = 최고 품질.
//   - chat(보조작가) = Haiku — 잡담·자료조사 = 빠름 우선.
//   작가는 admin에서 작업별로 직접 바꿀 수 있음.

import { KEY, loadJSON } from "@/lib/persist";

export type ModelChoice = "haiku" | "sonnet" | "opus";
export type TaskKind = "develop" | "write" | "adapt" | "review" | "osmu" | "chat";

export interface ModelPrefs {
  develop: ModelChoice; // 사전 자료 6단계 (제목·로그라인·캐릭터·주제·시놉시스·기승전결)
  write: ModelChoice;   // 본문 집필
  adapt: ModelChoice;   // 각색 (revise/adapt-cross)
  review: ModelChoice;  // 다중 타겟 리뷰
  osmu: ModelChoice;    // 12매체 매트릭스
  chat: ModelChoice;    // 보조작가 채팅
}

// ★ 작가용 정상 설정 (2026-05-20 V2.14.6 원복):
//   write·adapt = Opus (본문 집필·각색 = 작가 작품의 핵심 = 최고 품질)
//   나머지 = Haiku (한도 절약 + 한도 차면 자동 Haiku fallback이 받쳐줌)
//   작가는 admin Settings에서 작업별로 직접 변경 가능.
export const DEFAULT_MODEL_PREFS: ModelPrefs = {
  develop: "haiku", // 사전 자료 6단계 — Haiku
  write: "opus",    // ★ 본문 집필 = 작가 작품의 핵심
  adapt: "opus",    // ★ 각색 = 본문 변환 = 깊이 필요
  review: "haiku",  // 다중 페르소나 평가 — Haiku
  osmu: "haiku",    // 12매체 매트릭스 — Haiku
  chat: "haiku",    // 보조작가 채팅 — Haiku
};

export const MODEL_LABELS: Record<ModelChoice, string> = {
  haiku: "Haiku (빠름 · 토큰 절약)",
  sonnet: "Sonnet (균형 · 글쓰기 우수)",
  opus: "Opus (깊이 · 최고 품질)",
};

// ★ 모델 ID 매핑 — 단축어 → 최신 full ID. 한 곳에서만 관리 (옛엔 agent/stream + build-prompt 2곳 중복).
//   새 모델 나오면 여기만 갱신.
export const MODEL_IDS: Record<ModelChoice, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-7",
};

/** 모델 단축어 또는 full ID를 받아 최종 full ID로 정규화. */
export function resolveModelId(model: string | undefined, fastFallback = false): string {
  const raw = (model || (fastFallback ? "haiku" : "opus")).trim();
  if (raw in MODEL_IDS) return MODEL_IDS[raw as ModelChoice];
  return raw; // 이미 full ID면 그대로
}

export function loadModelPrefs(): ModelPrefs {
  const saved = loadJSON<Partial<ModelPrefs> | null>(KEY.adminModelPrefs, null);
  return { ...DEFAULT_MODEL_PREFS, ...(saved ?? {}) };
}

/** 페이지에서 호출: 작업 종류 → 모델 선택 (haiku/sonnet/opus). */
export function getModelChoice(kind: TaskKind): ModelChoice {
  return loadModelPrefs()[kind];
}

/**
 * 옛 호환 — fast(true=Haiku). sonnet·opus는 false.
 * ★ 신규 코드는 getModelChoice()로 model 필드를 보낼 것. fast는 점진 폐기.
 */
export function isFastModel(kind: TaskKind): boolean {
  return getModelChoice(kind) === "haiku";
}
