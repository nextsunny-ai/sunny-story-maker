"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Category = "bug" | "feature" | "praise" | "question" | "other";

const CATEGORY_LABEL: Record<Category, { emoji: string; text: string; placeholder: string }> = {
  bug: { emoji: "🐞", text: "버그 신고", placeholder: "어떤 문제가 발생했나요? 어떤 작업 중이었나요?" },
  feature: { emoji: "✨", text: "기능 제안", placeholder: "어떤 기능이 있으면 좋을까요?" },
  praise: { emoji: "💝", text: "칭찬·감사", placeholder: "어떤 점이 좋으셨나요?" },
  question: { emoji: "❓", text: "질문", placeholder: "무엇이 궁금하신가요?" },
  other: { emoji: "💬", text: "기타", placeholder: "자유롭게 의견을 들려주세요." },
};

const APP_VERSION = "v2.11";

/**
 * In-app 피드백 위젯 (= 우측 하단 floating)
 *
 * 로그인한 작가만 사용 가능. 미로그인 = 위젯 숨김.
 *
 * 카테고리 5종: 버그·기능제안·칭찬·질문·기타
 */
export function FeedbackWidget() {
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(): Promise<void> {
    setError(null);
    setInfo(null);
    const trimmed = message.trim();
    if (!trimmed) {
      setError("내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          message: trimmed,
          pageUrl: typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          appVersion: APP_VERSION,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `전송 실패 (HTTP ${res.status})`);
        return;
      }
      setInfo("의견 잘 받았습니다. 감사합니다 ✓");
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setInfo(null);
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authed) return null;

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="피드백 보내기"
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 9999,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--coral, #ff6b6b)",
          color: "white",
          border: "none",
          fontSize: 22,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(255, 107, 107, 0.35), 0 2px 6px rgba(0,0,0,0.18)",
          display: open ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 120ms ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        💬
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--card, #1a1a1d)",
              border: "1px solid var(--line, rgba(255,255,255,0.1))",
              borderRadius: 16,
              padding: 22,
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>
                의견 들려주세요<span style={{ color: "var(--coral)" }}>.</span>
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                style={{ background: "transparent", border: "none", color: "var(--ink-4)", fontSize: 20, cursor: "pointer", padding: 4 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
              {(Object.keys(CATEGORY_LABEL) as Category[]).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: "8px 10px",
                    fontSize: 12,
                    background: category === cat ? "var(--coral, #ff6b6b)" : "transparent",
                    color: category === cat ? "white" : "var(--ink-3, rgba(255,255,255,0.7))",
                    border: `1px solid ${category === cat ? "var(--coral, #ff6b6b)" : "var(--line, rgba(255,255,255,0.1))"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    justifyContent: "center",
                  }}
                >
                  <span>{CATEGORY_LABEL[cat].emoji}</span>
                  <span>{CATEGORY_LABEL[cat].text}</span>
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={CATEGORY_LABEL[category].placeholder}
              rows={5}
              maxLength={5000}
              autoFocus
              style={{
                width: "100%",
                padding: "12px 14px",
                fontSize: 14,
                background: "var(--card-soft, rgba(255,255,255,0.04))",
                border: "1px solid var(--line, rgba(255,255,255,0.1))",
                borderRadius: 8,
                color: "var(--ink-1, rgba(255,255,255,0.9))",
                fontFamily: "inherit",
                lineHeight: 1.55,
                resize: "vertical",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 11, color: "var(--ink-5, rgba(255,255,255,0.45))" }}>
              <span>{message.length} / 5000</span>
              <span>로그인 계정·페이지 정보가 함께 전송됩니다</span>
            </div>

            {error && (
              <div role="alert" style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255, 90, 90, 0.08)", border: "1px solid rgba(255, 90, 90, 0.35)", borderRadius: 6, color: "var(--coral, #ff6b6b)", fontSize: 12 }}>
                {error}
              </div>
            )}
            {info && (
              <div role="status" style={{ marginTop: 12, padding: "10px 12px", background: "rgba(120, 200, 140, 0.08)", border: "1px solid rgba(120, 200, 140, 0.35)", borderRadius: 6, color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                {info}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              style={{
                width: "100%",
                marginTop: 14,
                padding: "12px 18px",
                fontSize: 13,
                fontWeight: 600,
                color: "white",
                background: "var(--coral, #ff6b6b)",
                border: "none",
                borderRadius: 8,
                cursor: submitting || !message.trim() ? "not-allowed" : "pointer",
                opacity: submitting || !message.trim() ? 0.5 : 1,
              }}
            >
              {submitting ? "전송 중..." : "의견 보내기"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
