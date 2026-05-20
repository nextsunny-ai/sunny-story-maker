"use client";

// V3.1 A6 — Dark mode 토글 훅.
// 룰:
//   - localStorage "sunny.storymaker.theme" 키 = "light" | "dark" | "auto"
//   - auto = prefers-color-scheme 따름
//   - <html data-theme="dark"> 박힘 (= globals.css의 [data-theme="dark"] 적용)
//   - 대표님 메모리 = "바탕 = 밝은 톤 (블랙 X)" = 디폴트 = "light"

import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "auto";

const STORAGE_KEY = "sunny.storymaker.theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch { /* ignore */ }
  return "light"; // ★ 대표님 메모리 = 디폴트 라이트
}

function resolveTheme(t: Theme): "light" | "dark" {
  if (t !== "auto") return t;
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: Theme): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(t);
  if (resolved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  // 마운트 시 + theme 변경 시 적용
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // auto = system 변경 따라가기
  useEffect(() => {
    if (theme !== "auto") return;
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, t);
      }
    } catch { /* ignore */ }
  }, []);

  return { theme, setTheme, resolved: resolveTheme(theme) };
}
