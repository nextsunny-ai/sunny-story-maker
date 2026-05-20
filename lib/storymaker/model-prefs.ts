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

// ★★★ 테스트용 임시 (2026-05-20 대표님 명시): 전부 Haiku.
//   이유 — 테스트 중 토큰 구독 한도(5시간/7일)에 안 막히게. 테스트 끝나면 원복.
//   ▶ 원복값: develop=haiku / write=opus / adapt=opus / review=haiku / osmu=haiku / chat=haiku
//     (write·adapt만 Opus = 본문·각색은 작가 작품의 핵심 = 최고 품질)
export const DEFAULT_MODEL_PREFS: ModelPrefs = {
  develop: "haiku",
  write: "haiku",    // 테스트용 임시 — 원복 시 opus
  adapt: "haiku",    // 테스트용 임시 — 원복 시 opus
  review: "haiku",
  osmu: "haiku",
  chat: "haiku",
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
