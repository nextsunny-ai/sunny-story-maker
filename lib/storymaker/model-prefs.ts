// 작업별 모델 선호 — admin에서 작가가 선택. 각 페이지가 호출 시 model 결정.
//
// ★ 대표님 확정 (2026-05-19):
//   - develop(사전 자료) = Sonnet — 작품 뼈대라 똑똑해야. Haiku는 깊이 부족.
//   - write(본문)·adapt(각색) = Opus — 작가 작품의 핵심 = 최고 품질.
//   - chat(보조작가) = Haiku — 잡담·자료조사 = 빠름 우선.
//   작가는 admin에서 작업별로 직접 바꿀 수 있음.

import { KEY, loadJSON } from "@/lib/persist";
// ★ V2.14.7 — MODEL_IDS·resolveModelId·ModelChoice는 server-safe lib/storymaker/model-ids.ts로 이전.
//   server route(agent/stream·build-prompt)는 model-ids.ts를 import. 이 파일은 client 전용(persist·useState 의존).
import type { ModelChoice } from "./model-ids";
export type { ModelChoice } from "./model-ids";
export { MODEL_IDS, resolveModelId } from "./model-ids";

export type TaskKind = "develop" | "write" | "adapt" | "review" | "osmu" | "chat" | "polish";

export interface ModelPrefs {
  develop: ModelChoice; // 사전 자료 6단계 (제목·로그라인·캐릭터·주제·시놉시스·기승전결)
  write: ModelChoice;   // 본문 집필
  adapt: ModelChoice;   // 각색 (revise/adapt-cross)
  review: ModelChoice;  // 다중 타겟 리뷰
  osmu: ModelChoice;    // 12매체 매트릭스
  chat: ModelChoice;    // 보조작가 채팅
  polish: ModelChoice;  // 문장 교정 (비문·조사·시제)
}

// ★ V3.1.1 (2026-08-26) 품질 우선 재설정 — 대표님: "전문 글작가 수준이어야, 일반 클로드면 넣을 필요 없다".
//   옛 Haiku 절약 설정(5/20)이 대화·기획 품질 저하("소통 안 됨")의 원인 중 하나.
//   write·adapt = Opus (본문 = 최고 품질) / develop·chat·review = Sonnet (글쓰기·대화 품질)
//   osmu만 Haiku (12매체 대량 매트릭스 = 물량 작업). 작가는 admin Settings에서 작업별 변경 가능.
export const DEFAULT_MODEL_PREFS: ModelPrefs = {
  develop: "sonnet", // 사전 자료 = 작품 뼈대 — 깊이 필요 (2026-05-19 대표님 확정과 동일)
  write: "opus",     // ★ 본문 집필 = 작가 작품의 핵심
  adapt: "opus",     // ★ 각색 = 본문 변환 = 깊이 필요
  review: "sonnet",  // 다중 페르소나 평가 — 평가 깊이
  osmu: "haiku",     // 12매체 매트릭스 — 물량 작업만 Haiku
  chat: "sonnet",    // ★ 보조작가·집필실 대화 = 작가와의 소통 품질
  polish: "sonnet",  // 문장 교정 = 한국어 어법 판단 — 빠르되 어법은 정확해야
};

export const MODEL_LABELS: Record<ModelChoice, string> = {
  haiku: "Haiku (빠름 · 토큰 절약)",
  sonnet: "Sonnet (균형 · 글쓰기 우수)",
  opus: "Opus (깊이 · 최고 품질)",
};

// (MODEL_IDS·resolveModelId는 model-ids.ts에서 re-export — 중복 정의 제거 V2.14.7)

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
