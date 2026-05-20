"use client";

// V3.1 #3 — 첫 사용자 onboarding 가이드.
// localStorage에 "sunny.storymaker.onboarded" 키 = 완료 후 다시 안 뜸.
// 5단계: 환영 → 매체 선택 → AI 작가팀 → 채팅·patch → 시작!
//
// 스킵 가능. 진행 중에도 X로 닫기 가능. 다시 보려면 admin 페이지에서 reset.

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "sunny.storymaker.onboarded";
const VERSION = "v3.0"; // version 올리면 = 옛 작가 다시 한 번 표시

interface Step {
  title: string;
  body: React.ReactNode;
  emoji: string;
}

const STEPS: Step[] = [
  {
    emoji: "✨",
    title: "환영합니다, 작가님",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          <strong>SUNNY Story Maker</strong>는 12개 매체 한국 작가팀이 함께 만든
          AI 협업 도구입니다.
        </p>
        <p>30초만 투자해서 핵심 기능을 둘러봐주세요.</p>
      </>
    ),
  },
  {
    emoji: "🎬",
    title: "12개 매체 선택",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          왼쪽 사이드바 또는 홈에서 작품의 <strong>매체</strong>를 고르세요.
        </p>
        <p style={{ marginBottom: 10 }}>
          TV 드라마·영화·웹툰·웹소설·게임 등 — 각 매체에 맞는 표준 형식으로
          AI가 본문을 작성합니다.
        </p>
        <p style={{ fontSize: 12, color: "var(--ink-4)" }}>
          📍 매체별로 본문 구조가 자동 적용됩니다 (S#·컷·큐시트 등).
        </p>
      </>
    ),
  },
  {
    emoji: "🤖",
    title: "AI 작가팀 협업",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          <strong>좌측 본문</strong> + <strong>우측 채팅</strong> = 진짜 작가팀과 일하듯이.
        </p>
        <ul style={{ paddingLeft: 18, margin: "8px 0", color: "var(--ink-3)" }}>
          <li style={{ marginBottom: 4 }}>채팅에 자연어로 디렉션 — "이 씬 더 어둡게"</li>
          <li style={{ marginBottom: 4 }}>본문 단락 옆 ✏️ 직접 수정 / ↻ 다시 쓰기</li>
          <li>대사·지문 인라인 수정 (블록 클릭 시)</li>
        </ul>
      </>
    ),
  },
  {
    emoji: "📥",
    title: "채팅 → 본문 정밀 적용",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          AI가 본문 수정·추가를 제안하면 <strong>「📥 N번째 수정」</strong> 버튼이 나타납니다.
        </p>
        <p style={{ marginBottom: 10 }}>1클릭으로 본문에 정확히 적용 — 작가님이 다시 손볼 필요 X.</p>
        <p style={{ fontSize: 12, color: "var(--ink-4)" }}>
          💾 모든 변경은 자동 저장됩니다. <kbd style={{ padding: "1px 6px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontSize: 11 }}>Ctrl+S</kbd>로 수동 저장도 가능.
        </p>
      </>
    ),
  },
  {
    emoji: "🚀",
    title: "준비 완료!",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>이제 작품 하나 시작해볼까요?</p>
        <p style={{ marginBottom: 10 }}>
          홈에서 <strong>「✨ 새 작품 시작」</strong> 또는 사이드바
          <strong>「Develop / Write」</strong>로 들어가세요.
        </p>
        <p style={{ fontSize: 12, color: "var(--ink-4)" }}>
          ❓ 문제·아이디어는 우측 하단 <strong>피드백</strong> 버튼으로 보내주세요.
        </p>
      </>
    ),
  },
];

export function OnboardingOverlay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === VERSION) return; // 이미 본 작가
      // 첫 진입 = 1초 후 표시 (= 화면 그리기 안정 후)
      const t = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(t);
    } catch { /* ignore */ }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try { window.localStorage.setItem(STORAGE_KEY, VERSION); } catch { /* ignore */ }
  }, []);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) { close(); return; }
    setStep(s => s + 1);
  }, [step, close]);

  const prev = useCallback(() => {
    setStep(s => Math.max(0, s - 1));
  }, []);

  // Esc 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close, next, prev]);

  if (!open) return null;

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.25s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{
        maxWidth: 520, width: "100%",
        background: "var(--bg, #fff)",
        borderRadius: 16,
        padding: "28px 28px 22px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        position: "relative",
      }}>
        {/* 닫기 (skip) */}
        <button
          type="button"
          onClick={close}
          aria-label="가이드 닫기"
          style={{
            position: "absolute", top: 12, right: 12,
            width: 28, height: 28, border: "none",
            background: "transparent", cursor: "pointer",
            color: "var(--ink-4)", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 6,
          }}
        >
          ×
        </button>

        {/* progress dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 28 : 8, height: 8,
                background: i <= step ? "var(--coral, #ff6b53)" : "var(--line, #e5e5e0)",
                borderRadius: 4, transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* emoji + title */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>{cur.emoji}</div>
          <h2
            id="onboarding-title"
            style={{ fontSize: 22, fontWeight: 700, color: "var(--ink-1)", margin: 0 }}
          >
            {cur.title}
          </h2>
        </div>

        {/* body */}
        <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 22 }}>
          {cur.body}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button
            type="button"
            onClick={close}
            style={{
              padding: "8px 14px",
              background: "transparent",
              border: "none",
              color: "var(--ink-4)",
              fontSize: 12, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            건너뛰기
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={prev}
                style={{
                  padding: "8px 16px",
                  background: "var(--card-soft, #f5f4ee)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  color: "var(--ink-2)",
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ← 이전
              </button>
            )}
            <button
              type="button"
              onClick={next}
              style={{
                padding: "8px 20px",
                background: "var(--coral, #ff6b53)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isLast ? "시작하기 →" : "다음 →"}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/**
 * Admin 페이지에서 호출 = 가이드 리셋 (다음 진입 시 다시 표시)
 */
export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
