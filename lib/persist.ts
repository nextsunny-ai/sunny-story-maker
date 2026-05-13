// Lightweight localStorage persistence helper.
// SSR-safe, debounced setter, and React hook for state-binding.
//
// Key convention: `sunny.{page}.{userId or "anon"}.{field}`
//
// ★ 2026-05-14 — USER 동적화 (옛 anon 고정 사고 정정):
// 로그인 시 = `setUserNamespace(supabaseUserId)` 호출 → 모든 KEY가 user.id 네임스페이스로
// 자동 전환. 로그아웃 = `setUserNamespace(null)` → 다시 anon.
// `as const` 대신 getters 사용 = KEY.xxx 접근 시점에 동적 평가 (= 호출 site 변경 X).
// 옛 anon.* 키 = `migrateAnonToUser(userId)` 로 1회 마이그레이션 (= 옛 데이터 보존).

import { useEffect, useRef, useState } from "react";

const PREFIX = "sunny";
const USER_CACHE_KEY = `${PREFIX}.session.userNamespace`;

// 현재 user 네임스페이스 (= supabase user.id 또는 "anon")
// 모듈 로드 시 = localStorage에서 캐시 읽음 (= 빠른 hydration).
let currentUser: string = (() => {
  if (typeof window !== "undefined") {
    try {
      const cached = window.localStorage.getItem(USER_CACHE_KEY);
      if (cached && cached.length > 0) return cached;
    } catch { /* SSR or quota error */ }
  }
  return "anon";
})();

/** 현재 user 네임스페이스 setter — 로그인 시 호출 (= AppShell auth bootstrap). */
export function setUserNamespace(userId: string | null): void {
  const next = (userId && userId.length > 0) ? userId : "anon";
  if (next === currentUser) return;
  currentUser = next;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(USER_CACHE_KEY, next); } catch { /* ignore */ }
  }
}

/** 현재 user 네임스페이스 = 외부 read용. */
export function getUserNamespace(): string {
  return currentUser;
}

/**
 * 옛 anon.* 키 → user.id.* 키 1회 마이그레이션.
 * 로그인 시 = 옛 작품·세팅 보존 (= 같은 PC에서 작업하던 데이터 유지).
 * AppShell auth bootstrap에서 = setUserNamespace 호출 직후 자동 실행.
 */
export function migrateAnonToUser(userId: string): { migrated: number; skipped: number } {
  if (typeof window === "undefined") return { migrated: 0, skipped: 0 };
  if (!userId || userId === "anon") return { migrated: 0, skipped: 0 };

  const migratedFlag = `${PREFIX}.session.migrated.${userId}`;
  try {
    if (window.localStorage.getItem(migratedFlag)) {
      return { migrated: 0, skipped: 0 }; // 이미 마이그레이션 완료
    }
  } catch { return { migrated: 0, skipped: 0 }; }

  let migrated = 0;
  let skipped = 0;
  const anonPattern = new RegExp(`^${PREFIX}\\.[^.]+\\.anon\\.`);

  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && anonPattern.test(k)) keys.push(k);
    }
    for (const oldKey of keys) {
      const newKey = oldKey.replace(`.anon.`, `.${userId}.`);
      try {
        // 새 키에 이미 데이터 있으면 = 덮어쓰지 X (= 작가 결정에 맡김)
        if (window.localStorage.getItem(newKey)) {
          skipped++;
          continue;
        }
        const value = window.localStorage.getItem(oldKey);
        if (value != null) {
          window.localStorage.setItem(newKey, value);
          migrated++;
        }
      } catch { /* quota or serialize */ }
    }
    window.localStorage.setItem(migratedFlag, new Date().toISOString());
  } catch { /* ignore */ }

  return { migrated, skipped };
}

/**
 * KEY = 동적 getter 객체.
 * `KEY.libraryWorks` 접근 시점에 = 현재 user 네임스페이스로 string 평가.
 * 호출 site 변경 X (= 옛 코드 그대로 동작).
 */
export const KEY = {
  // home
  get homeIdea() { return `${PREFIX}.home.${currentUser}.idea`; },
  get homeMediumOverride() { return `${PREFIX}.home.${currentUser}.mediumOverride`; },

  // library
  get libraryWorks() { return `${PREFIX}.library.${currentUser}.works`; },
  get libraryPersonas() { return `${PREFIX}.library.${currentUser}.personas`; },

  // admin (writer tab)
  get adminProfile() { return `${PREFIX}.admin.${currentUser}.profile`; },
  get adminLearning() { return `${PREFIX}.admin.${currentUser}.learning`; },
  get adminPrimaryMedium() { return `${PREFIX}.admin.${currentUser}.primaryMedium`; },
  get adminAssistantName() { return `${PREFIX}.admin.${currentUser}.assistantName`; },
  get adminModelPrefs() { return `${PREFIX}.admin.${currentUser}.modelPrefs`; },

  // review
  get reviewText() { return `${PREFIX}.review.${currentUser}.text`; },
  get reviewTitle() { return `${PREFIX}.review.${currentUser}.title`; },
  get reviewGenre() { return `${PREFIX}.review.${currentUser}.genre`; },
  get reviewPersonas() { return `${PREFIX}.review.${currentUser}.personas`; },
  get reviewLastResult() { return `${PREFIX}.review.${currentUser}.lastResult`; },

  // adapt
  get adaptText() { return `${PREFIX}.adapt.${currentUser}.text`; },
  get adaptTitle() { return `${PREFIX}.adapt.${currentUser}.title`; },
  get adaptGenre() { return `${PREFIX}.adapt.${currentUser}.genre`; },

  // osmu
  get osmuText() { return `${PREFIX}.osmu.${currentUser}.text`; },
  get osmuTitle() { return `${PREFIX}.osmu.${currentUser}.title`; },
  get osmuGenre() { return `${PREFIX}.osmu.${currentUser}.genre`; },

  // write
  writeProject: (id: string) => `${PREFIX}.write.${currentUser}.project.${id}`,
  get writeLastProject() { return `${PREFIX}.write.${currentUser}.lastProject`; },
  get writeWorkbookWidth() { return `${PREFIX}.write.${currentUser}.workbookWidth`; },
  workConversation: (id: string) => `${PREFIX}.conv.${currentUser}.work.${id}`,

  // BYOK
  get userApiKey() { return `${PREFIX}.account.${currentUser}.apiKey`; },
};

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
