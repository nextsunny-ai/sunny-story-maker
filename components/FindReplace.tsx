"use client";

// V3.1 추가-2 — 본문 찾기/바꾸기 (Ctrl+F·Ctrl+H)
// 작가가 = 본문 안 단어·구절을 = 한 번에 검색·치환. 매체별 모든 block 횡단.

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * 정규식 안전 검증 (= ReDoS catastrophic backtracking 방어).
 * regex 옵션 켤 때만 호출. 일반 텍스트 검색은 자동 이스케이프되므로 검증 불필요.
 */
export function isSafeRegex(pattern: string): { ok: boolean; reason?: string } {
  if (pattern.length > 50) return { ok: false, reason: "정규식이 너무 깁니다 (50자 이내)" };
  // 중첩 quantifier (= (a+)+ / (.+)+ / (a*)+ 류)
  if (/\([^)]*[+*?][^)]*\)\s*[+*?]/.test(pattern)) {
    return { ok: false, reason: "중첩 quantifier — catastrophic backtracking 위험" };
  }
  // alternation + quantifier (= (a|aa)+ 류)
  if (/\([^|)]+\|[^)]+\)\s*[+*?]/.test(pattern)) {
    return { ok: false, reason: "분기 quantifier — catastrophic backtracking 위험" };
  }
  return { ok: true };
}

interface FindReplaceProps {
  /** 본문 전체 텍스트 (paras·doc.blocks 평탄화) */
  body: string;
  /** 검색·바꾸기 콜백 — write/page.tsx에서 paras 갱신 */
  onReplace: (find: string, replace: string, replaceAll: boolean, caseSensitive: boolean, regex: boolean) => void;
  /** 모달 닫기 */
  onClose: () => void;
  /** 다음/이전 결과로 이동 시 호출 (= 본문 스크롤) */
  onNavigate?: (matchIndex: number, totalMatches: number, find: string) => void;
}

export function FindReplace({ body, onReplace, onClose, onNavigate }: FindReplaceProps) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findRef.current?.focus();
    findRef.current?.select();
  }, []);

  // ESC = 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 매치 카운트 (실시간) + 정규식 안전 검증
  const safety = useMemo(() => regex && find ? isSafeRegex(find) : { ok: true as const }, [regex, find]);
  const matchCount = useMemo(() => {
    if (!find || !safety.ok) return 0;
    try {
      const pattern = regex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(pattern, caseSensitive ? "g" : "gi");
      const matches = body.match(re);
      return matches ? matches.length : 0;
    } catch {
      return 0;  // 정규식 오류
    }
  }, [body, find, caseSensitive, regex, safety]);

  // currentIdx 범위 자동 조정
  useEffect(() => {
    if (currentIdx >= matchCount && matchCount > 0) setCurrentIdx(0);
    if (matchCount === 0) setCurrentIdx(0);
  }, [matchCount, currentIdx]);

  const handleNext = () => {
    if (!find || matchCount === 0) return;
    const next = (currentIdx + 1) % matchCount;
    setCurrentIdx(next);
    onNavigate?.(next, matchCount, find);
  };

  const handlePrev = () => {
    if (!find || matchCount === 0) return;
    const prev = (currentIdx - 1 + matchCount) % matchCount;
    setCurrentIdx(prev);
    onNavigate?.(prev, matchCount, find);
  };

  const handleReplace = (all: boolean) => {
    if (!find || !safety.ok) return;
    onReplace(find, replace, all, caseSensitive, regex);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) handlePrev();
      else handleNext();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="찾기 / 바꾸기"
      className="find-replace-panel"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        width: 360,
        background: "var(--card, #fff)",
        border: "1px solid var(--line, #e5e5e5)",
        borderRadius: 10,
        boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
        padding: 12,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>🔍 찾기 / 바꾸기</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "var(--ink-2, #777)" }}
        >
          ×
        </button>
      </div>

      {/* 찾기 input */}
      <div style={{ marginBottom: 6 }}>
        <input
          ref={findRef}
          type="text"
          value={find}
          onChange={(e) => setFind(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="찾을 단어·구절"
          style={{
            width: "100%",
            padding: "6px 8px",
            border: "1px solid var(--line, #d4d4d4)",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "inherit",
            background: "var(--card-soft, #fafafa)",
          }}
        />
      </div>

      {/* 바꾸기 input */}
      <div style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          placeholder="바꿀 단어 (옵션)"
          style={{
            width: "100%",
            padding: "6px 8px",
            border: "1px solid var(--line, #d4d4d4)",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "inherit",
            background: "var(--card-soft, #fafafa)",
          }}
        />
      </div>

      {/* 옵션 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 11, color: "var(--ink-2, #555)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
          대소문자
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={regex} onChange={(e) => setRegex(e.target.checked)} />
          정규식
        </label>
      </div>

      {/* 결과 카운트 + 정규식 안전 안내 */}
      <div
        style={{
          padding: "4px 8px",
          background: !safety.ok ? "#fef2f2" : matchCount > 0 ? "var(--coral-tint, #fff5f3)" : "transparent",
          borderRadius: 6,
          fontSize: 12,
          marginBottom: 8,
          color: !safety.ok ? "#dc2626" : matchCount > 0 ? "var(--coral, #ff6b53)" : "var(--ink-3, #999)",
        }}
      >
        {!safety.ok ? (
          <>⚠ {safety.reason}</>
        ) : find ? (
          matchCount > 0 ? (
            <>매치 <strong>{currentIdx + 1} / {matchCount}</strong></>
          ) : (
            <>매치 없음</>
          )
        ) : (
          <>검색어 입력하세요</>
        )}
      </div>

      {/* 버튼 */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={matchCount === 0}
          style={btnStyle(false, matchCount === 0)}
          title="이전 (Shift+Enter)"
        >
          ▲ 이전
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={matchCount === 0}
          style={btnStyle(false, matchCount === 0)}
          title="다음 (Enter)"
        >
          ▼ 다음
        </button>
        <button
          type="button"
          onClick={() => handleReplace(false)}
          disabled={matchCount === 0 || !replace}
          style={btnStyle(false, matchCount === 0 || !replace)}
          title="현재 매치 1개만 바꾸기"
        >
          바꾸기
        </button>
        <button
          type="button"
          onClick={() => handleReplace(true)}
          disabled={matchCount === 0 || !replace}
          style={btnStyle(true, matchCount === 0 || !replace)}
          title={`모든 매치 ${matchCount}개 바꾸기`}
        >
          모두 바꾸기 ({matchCount})
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: "var(--ink-3, #999)" }}>
        Enter = 다음 · Shift+Enter = 이전 · ESC = 닫기
      </div>
    </div>
  );
}

function btnStyle(primary: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: "5px 10px",
    border: primary ? "none" : "1px solid var(--line, #d4d4d4)",
    borderRadius: 6,
    background: disabled
      ? "var(--card-soft, #f5f5f5)"
      : primary
        ? "var(--coral, #ff6b53)"
        : "var(--card, #fff)",
    color: disabled
      ? "var(--ink-3, #aaa)"
      : primary
        ? "#fff"
        : "var(--ink, #222)",
    fontSize: 12,
    fontWeight: primary ? 600 : 500,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}

export default FindReplace;
