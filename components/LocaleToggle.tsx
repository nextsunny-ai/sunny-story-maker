"use client";

// V3.1 #6 — 다국어 토글 위젯. 우측 하단 또는 헤더에 박을 수 있음.

import { useLocale } from "@/lib/i18n";

export function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
        title={locale === "ko" ? "Switch to English" : "한국어로 변경"}
        style={{
          padding: "4px 8px",
          fontSize: 11, fontWeight: 600,
          background: "transparent",
          color: "var(--ink-3)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {locale === "ko" ? "한 / EN" : "EN / 한"}
      </button>
    );
  }

  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 3, background: "var(--card-soft)", borderRadius: 999, border: "1px solid var(--line)" }}>
      {(["ko", "en"] as const).map(l => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          style={{
            padding: "4px 12px",
            fontSize: 11.5, fontWeight: 700,
            background: locale === l ? "var(--coral)" : "transparent",
            color: locale === l ? "#fff" : "var(--ink-3)",
            border: "none",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          {l === "ko" ? "한국어" : "English"}
        </button>
      ))}
    </div>
  );
}
