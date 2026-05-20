// ★ 모델 ID 매핑 — server-safe (lib/persist.ts·useState 의존 0).
//   agent/stream·build-prompt route(server)에서 import 가능.
//   client 페이지는 model-prefs.ts(usePersistedState 의존)를 import.

export type ModelChoice = "haiku" | "sonnet" | "opus";

// 단축어 → Anthropic 최신 full model ID. 한 곳에서만 관리.
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
