"use client";

// V3.1 A5 — 로딩·streaming 상태 visual.
// 깡통 "응답 중…" 텍스트 → 살아있는 typing indicator (3개 점 호흡 + 매체별 placeholder)

interface TypingIndicatorProps {
  /** 매체 letter — 매체별 다른 placeholder 텍스트 */
  letter?: string;
  /** "응답 중" 라벨 */
  label?: string;
  /** 인라인 (= 채팅) / 카드 (= 본문 단락) */
  variant?: "inline" | "card";
}

const MEDIUM_PLACEHOLDER: Record<string, string> = {
  A: "TV 드라마 씬 구상 중…",
  B: "영화 시퀀스 짜는 중…",
  C: "숏드라마 후크 잡는 중…",
  D: "애니메이션 비주얼 노트 그리는 중…",
  E: "시즌 아크 정리하는 중…",
  F: "웹툰 컷 분할 중…",
  G: "다큐 큐시트 짜는 중…",
  H: "웹소설 회차 쓰는 중…",
  I: "뮤지컬 넘버 떠올리는 중…",
  J: "유튜브 후크 잡는 중…",
  K: "전시 동선 그리는 중…",
  L: "게임 분기 짜는 중…",
  M: "예능 큐시트 짜는 중…",
  N: "연극 무대지시 쓰는 중…",
  O: "소설 문장 다듬는 중…",
  P: "에세이 운율 잡는 중…",
};

export function TypingIndicator({ letter, label, variant = "inline" }: TypingIndicatorProps) {
  const placeholder = letter ? MEDIUM_PLACEHOLDER[letter] : null;
  const text = label || placeholder || "AI 작가팀이 글 쓰는 중…";

  if (variant === "card") {
    return (
      <div style={{
        padding: "20px 24px",
        background: "linear-gradient(135deg, var(--card-soft) 0%, var(--card) 100%)",
        border: "1px solid var(--coral)",
        borderRadius: 10,
        display: "flex", alignItems: "center", gap: 14,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* 좌측 빛띠 애니메이션 */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
          background: "linear-gradient(180deg, var(--coral), transparent, var(--coral))",
          backgroundSize: "100% 200%",
          animation: "shimmer 2s linear infinite",
        }} />
        <Dots />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--coral-deep)", marginBottom: 3 }}>{text}</div>
          <div style={{ fontSize: 11, color: "var(--ink-4)" }}>잠시만요 — 본문이 곧 흐르듯 채워져요</div>
        </div>
        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: 0% 0%; }
            100% { background-position: 0% 200%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ink-4)", fontSize: 13 }}>
      <Dots />
      <span>{text}</span>
    </span>
  );
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }} aria-label="응답 중">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--coral, #ff6b53)",
            animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            display: "inline-block",
          }}
        />
      ))}
      <style jsx>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}
