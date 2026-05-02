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
} as const;

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
