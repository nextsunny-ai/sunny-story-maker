// Lightweight localStorage persistence helper.
// SSR-safe, debounced setter, and React hook for state-binding.
//
// Key convention: `sunny.{page}.{userId or "anon"}.{field}`
// Today everything is anon (no auth surface yet).

import { useEffect, useRef, useState } from "react";

const PREFIX = "sunny";
const USER = "anon";

export const KEY = {
  // home
  homeIdea: `${PREFIX}.home.${USER}.idea`,

  // library
  libraryWorks: `${PREFIX}.library.${USER}.works`,
  libraryPersonas: `${PREFIX}.library.${USER}.personas`,

  // admin (writer tab)
  adminProfile: `${PREFIX}.admin.${USER}.profile`,
  adminLearning: `${PREFIX}.admin.${USER}.learning`,
  adminPrimaryMedium: `${PREFIX}.admin.${USER}.primaryMedium`,
  adminAssistantName: `${PREFIX}.admin.${USER}.assistantName`,
  adminModelPrefs: `${PREFIX}.admin.${USER}.modelPrefs`,

  // home medium override (instant card-switch on home, doesn't change admin default)
  homeMediumOverride: `${PREFIX}.home.${USER}.mediumOverride`,

  // review
  reviewText: `${PREFIX}.review.${USER}.text`,
  reviewTitle: `${PREFIX}.review.${USER}.title`,
  reviewGenre: `${PREFIX}.review.${USER}.genre`,
  reviewPersonas: `${PREFIX}.review.${USER}.personas`,
  reviewLastResult: `${PREFIX}.review.${USER}.lastResult`,

  // adapt
  adaptText: `${PREFIX}.adapt.${USER}.text`,
  adaptTitle: `${PREFIX}.adapt.${USER}.title`,
  adaptGenre: `${PREFIX}.adapt.${USER}.genre`,

  // osmu
  osmuText: `${PREFIX}.osmu.${USER}.text`,
  osmuTitle: `${PREFIX}.osmu.${USER}.title`,
  osmuGenre: `${PREFIX}.osmu.${USER}.genre`,

  // write — keyed per project (title or slug)
  writeProject: (id: string) => `${PREFIX}.write.${USER}.project.${id}`,
  // 마지막으로 작업한 작품 — Write 빈 mode로 진입 시 자동 복원
  writeLastProject: `${PREFIX}.write.${USER}.lastProject`,
  // 워크북 너비 (좌우 리사이즈)
  writeWorkbookWidth: `${PREFIX}.write.${USER}.workbookWidth`,
  // ★ 작품 1개 = AI conversation 1개 (홈·develop·write·chat·adapt 다 같은 통)
  //   매 호출 = 옛 user/assistant turn 다 박힘 + 새 user msg 추가
  //   Anthropic prompt cache 1h TTL = 옛 turn cached = 토큰 1/10
  //   AI = 작가의 작품 전체 + 모든 작업 흐름 다 인식
  workConversation: (id: string) => `${PREFIX}.conv.${USER}.work.${id}`,

  // ★ BYOK = 작가 본인 ANTHROPIC_API_KEY (Settings 페이지 입력 → stream-agent에서 자동 첨부) — 글로벌 룰 16
  userApiKey: `${PREFIX}.account.${USER}.apiKey`,
} as const;

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface WorkConversation {
  workId: string;
  messages: ConversationTurn[];
  // 자동 compaction 시 옛 turn들 요약본 (다음 라운드)
  compactedSummary?: string;
  updatedAt: number;
}

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / serialize errors silently ignored — UI shouldn't crash on persistence
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * usePersistedState — like useState, but mirrors to localStorage.
 *
 * - Reads stored value once on mount (after hydration) so SSR and first
 *   client render match (returns `initial` first).
 * - Writes on every change, debounced.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  debounceMs = 250,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage once, after mount.
  useEffect(() => {
    const stored = loadJSON<T | null>(key, null);
    if (stored !== null) {
      setValue(stored);
    }
    hydrated.current = true;
    // We deliberately don't depend on `key` changing — usage is per-mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist (debounced) after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveJSON(key, value);
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, value, debounceMs]);

  return [value, setValue];
}
