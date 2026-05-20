"use client";

// V3.1 #6 — 다국어 i18n. 한국어가 기본, 영어 토글.
//
// 접근:
//   import { t, useLocale } from "@/lib/i18n";
//   const { locale, setLocale } = useLocale();
//   <span>{t("save")}</span>
//
// 한국어 키 = 자동 fallback (없으면 키 그대로). 영어는 STRINGS["en"][key].
//
// 룰:
//   - 새 문구는 한국어 그대로 박힘 OK (= fallback)
//   - 자주 등장하는 작가용 UI 문구만 우선 영어화 (이 파일에 추가)
//   - JSX 내 한국어 그대로 두면 안 되는 건 아님 = 점진적 마이그레이션

import { useEffect, useState, useCallback } from "react";

export type Locale = "ko" | "en";

const STORAGE_KEY = "sunny.storymaker.locale";

const STRINGS: Record<Locale, Record<string, string>> = {
  ko: {},
  en: {
    // 저장·내보내기
    "저장": "Save",
    "수동 저장": "Save Now",
    "저장됨": "Saved",
    "저장 중…": "Saving…",
    "내보내기": "Export",
    "다운로드": "Download",
    "워드(.docx)": "Word (.docx)",
    "텍스트(.txt)": "Text (.txt)",

    // 작업 흐름
    "이어가기 →": "Continue →",
    "새 작품": "New Project",
    "라이브러리": "Library",
    "다시 쓰기": "Rewrite",
    "이어 쓰기": "Continue Writing",
    "더 쓰기": "Add More",
    "수정": "Edit",
    "삭제": "Delete",
    "추가": "Add",
    "복사": "Copy",
    "붙여넣기": "Paste",
    "보기": "View",
    "닫기": "Close",
    "확인": "OK",
    "취소": "Cancel",
    "다시 시도": "Retry",

    // V3.1 — WriteWorkbook 한국어 → 영어 (중복 키 제거)
    "디렉션·메모": "Directions·Notes",
    "+ 디렉션 추가 (예: 회상은 1인칭)": "+ Add direction (e.g., flashback in 1st person)",
    "대화에서 자동으로 추가되거나 직접 입력": "Auto-added from chat or enter manually",
    "AI 작업 흐름": "AI Workflow",
    "디렉션·수정·자료조사·이름 추천 — 무엇이든. AI가 본문에 반영하거나 채팅으로 답합니다.":
      "Directions, edits, research, name suggestions — anything. AI reflects in body or replies in chat.",
    "이 단계로 진행 →": "Go to this step →",
    "AI 코멘트": "AI Comments",
    "답하기": "Reply",

    // 매체·장르
    "TV 드라마": "TV Drama",
    "영화": "Film",
    "숏드라마": "Short Drama",
    "애니메이션": "Animation",
    "유튜브": "YouTube",
    "웹툰": "Webtoon",
    "다큐멘터리": "Documentary",
    "웹소설": "Web Novel",
    "뮤지컬": "Musical",
    "유튜브 시리즈": "YouTube Series",
    "전시": "Exhibition",
    "게임": "Game",

    // 채팅·AI
    "전송": "Send",
    "보내기": "Send",
    "응답 중…": "Responding…",
    "생각 중…": "Thinking…",
    "중지": "Stop",
    "잠깐": "Pause",
    "이어 작성": "Continue",
    "AI 작가팀": "AI Writing Team",

    // 본문 PATCH
    "본문 PATCH 제안": "Body PATCH Suggestion",
    "수정 반영": "Apply Edit",
    "추가 반영": "Apply Add",
    "삭제 반영": "Apply Delete",

    // 에러·안내
    "로그인이 필요합니다.": "Login required.",
    "다시 로그인": "Log in again",
    "세션이 만료됐습니다.": "Session expired.",
    "인터넷 연결을 확인해주세요.": "Please check your internet connection.",
    "사용량 한도에 도달했습니다.": "Usage limit reached.",
    "응답이 비어있습니다.": "Empty response.",
    "잠시 후 다시 시도해주세요.": "Please try again later.",

    // 작가 노트·워크북
    "작가 노트": "Writer Notes",
    "흐름": "Flow",
    "채팅": "Chat",
    "노트 추가": "Add Note",
    "노트 삭제": "Delete Note",

    // 의뢰서·매체 필드
    "매체 선택": "Select Medium",
    "선택해주세요": "Please select",
    "필수": "Required",
    "선택 사항": "Optional",
  },
};

let cachedLocale: Locale | null = null;

export function getLocale(): Locale {
  if (cachedLocale) return cachedLocale;
  if (typeof window === "undefined") return "ko";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ko" || stored === "en") {
      cachedLocale = stored;
      return stored;
    }
  } catch { /* ignore */ }
  // 브라우저 언어 자동 감지 (= 영어권만 en, 나머지 ko)
  const lang = navigator.language?.toLowerCase() || "";
  cachedLocale = lang.startsWith("en") ? "en" : "ko";
  return cachedLocale;
}

export function setLocaleGlobal(locale: Locale): void {
  cachedLocale = locale;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("sunny:locale-change", { detail: locale }));
  }
}

/**
 * 번역 함수. 키 없으면 키 그대로 반환 (= 한국어가 fallback).
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const locale = getLocale();
  const dict = STRINGS[locale];
  let result = dict?.[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return result;
}

/**
 * React 훅 — locale 변경 시 컴포넌트 re-render.
 */
export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const [locale, setLocaleState] = useState<Locale>(getLocale);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<Locale>;
      if (ce.detail === "ko" || ce.detail === "en") setLocaleState(ce.detail);
    };
    window.addEventListener("sunny:locale-change", handler);
    return () => window.removeEventListener("sunny:locale-change", handler);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleGlobal(l);
    setLocaleState(l);
  }, []);

  return { locale, setLocale };
}
