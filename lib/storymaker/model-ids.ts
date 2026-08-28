// ★ 모델 ID 매핑 — server-safe (lib/persist.ts·useState 의존 0).
//   agent/stream·build-prompt route(server)에서 import 가능.
//   client 페이지는 model-prefs.ts(usePersistedState 의존)를 import.

export type ModelChoice = "haiku" | "sonnet" | "opus";

// 단축어 → Anthropic 최신 full model ID. 한 곳에서만 관리.
// ★ V3.1.1 (2026-08-26) — 최신 세대로 갱신 (opus-5 = 4.7과 같은 가격, 성능↑ / sonnet-5).
//   두 모델 다 thinking 기본 ON = max_tokens가 생각+본문 합산 상한 → 호출부 여유 필요.
export const MODEL_IDS: Record<ModelChoice, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-5",
  opus: "claude-opus-5",
};

/** 모델 단축어 또는 full ID를 받아 최종 full ID로 정규화. */
export function resolveModelId(model: string | undefined, fastFallback = false): string {
  const raw = (model || (fastFallback ? "haiku" : "opus")).trim();
  if (raw in MODEL_IDS) return MODEL_IDS[raw as ModelChoice];
  return raw; // 이미 full ID면 그대로
}
