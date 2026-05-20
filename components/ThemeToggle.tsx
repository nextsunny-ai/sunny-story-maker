"use client";

// V3.1 A6 — Dark/Light/Auto 토글 위젯.

import { useTheme, type Theme } from "@/lib/use-theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
    const icon = theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "🌓";
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        title={`현재: ${theme} — 클릭하면 ${next}로`}
        style={{
          padding: "4px 8px", fontSize: 13,
          background: "transparent", color: "var(--ink-3)",
          border: "1px solid var(--line)", borderRadius: 6,
          cursor: "pointer", lineHeight: 1,
        }}
      >
        {icon}
      </button>
    );
  }

  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 3, background: "var(--card-soft)", borderRadius: 999, border: "1px solid var(--line)" }}>
      {(["light", "auto", "dark"] as const).map(t => (
        <button
          key={t}
          type="button"
          onClick={() => setTheme(t)}
          style={{
            padding: "4px 12px", fontSize: 11.5, fontWeight: 700,
            background: theme === t ? "var(--coral)" : "transparent",
            color: theme === t ? "#fff" : "var(--ink-3)",
            border: "none", borderRadius: 999, cursor: "pointer",
          }}
        >
          {t === "light" ? "☀️ 라이트" : t === "dark" ? "🌙 다크" : "🌓 자동"}
        </button>
      ))}
    </div>
  );
}
