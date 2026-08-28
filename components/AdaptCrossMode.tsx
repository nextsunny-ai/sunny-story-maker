"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES, isLaunchGenre, type Genre } from "@/lib/genres";

export interface AdaptScore { score: number; reason: string }
export interface RankedTarget { g: Genre; s: AdaptScore }

interface AdaptCrossModeProps {
  sourceLetter: string;
  sourceGenre: Genre;
  targetLetter: string;
  setTargetLetter: (v: string) => void;
  targetGenre: Genre;
  /** AI 적합도 점수 (선택 — 분석 전이면 비어있음). 있으면 배지로 표시. */
  scores?: Record<string, AdaptScore>;
  /** 원본 실제 자수 (하드코딩 대신). */
  sourceChars?: number;
}

export function AdaptCrossMode({
  sourceLetter, sourceGenre,
  targetLetter, setTargetLetter, targetGenre,
  scores = {}, sourceChars = 0,
}: AdaptCrossModeProps) {
  const router = useRouter();
  const I = ICONS;

  const tierOf = (s: number) => s >= 85 ? "top" : s >= 70 ? "mid" : "low";

  // 변환 대상 후보 = 원본 매체를 제외한 전체 장르. 점수가 있으면 점수순, 없으면 기본 순서.
  const candidates = GENRES
    .filter(g => g.letter !== sourceLetter)
    .map(g => ({ g, s: scores[g.letter] }))
    .sort((a, b) => (b.s?.score ?? 0) - (a.s?.score ?? 0));

  const targetScore = scores[targetLetter];
  const hasScores = Object.keys(scores).length > 0;

  return (
    <Fragment>
      <div className="acx-shell">
        {/* LEFT: FROM */}
        <aside className="acx-side acx-from">
          <div className="acx-side-lbl">FROM · 원본</div>
          <div className="acx-side-card">
            <div className="acx-side-icon">{I[sourceLetter]}</div>
            <div className="acx-side-letter">{sourceLetter}.</div>
            <div className="acx-side-name">{sourceGenre.name}</div>
            <div className="acx-side-fmt">{sourceGenre.standard || sourceGenre.sub}</div>
          </div>
          <div className="acx-side-meta">
            <div className="acx-side-meta-row"><span>원본 분량</span><strong>{sourceChars > 0 ? sourceChars.toLocaleString() + "자" : "—"}</strong></div>
            <div className="acx-side-meta-row"><span>원본 매체</span><strong>{sourceGenre.name}</strong></div>
          </div>
        </aside>

        {/* CENTER: 목표 매체 선택 */}
        <div className="acx-center">
          <div className="acx-center-lbl">
            {hasScores ? "매체 적합도 — 변환할 매체를 선택" : "변환할 매체를 선택하세요"}
          </div>

          <div className="acx-funnel">
            <div className="acx-bars">
              {candidates.map(({ g, s }) => {
                const isTarget = g.letter === targetLetter;
                const tier = s ? tierOf(s.score) : "mid";
                const launched = isLaunchGenre(g.letter);
                return (
                  <button
                    key={g.letter}
                    type="button"
                    className={"acx-bar is-" + tier + (isTarget ? " is-target" : "")}
                    onClick={() => setTargetLetter(g.letter)}
                    disabled={!launched}
                    title={launched ? (s?.reason || g.sub) : "2차 오픈 예정"}
                    style={launched ? undefined : { opacity: 0.45, cursor: "not-allowed" }}
                  >
                    <span className="acx-bar-icon">{I[g.letter]}</span>
                    <span className="acx-bar-letter">{g.letter}</span>
                    <span className="acx-bar-name">{g.name}</span>
                    {!launched ? (
                      <span className="acx-bar-sub">2차 오픈 예정</span>
                    ) : s ? (
                      <>
                        <span className="acx-bar-track">
                          <span className="acx-bar-fill" style={{ width: s.score + "%" }}></span>
                        </span>
                        <span className="acx-bar-score">{s.score}</span>
                      </>
                    ) : (
                      <span className="acx-bar-sub">{g.sub}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="acx-funnel-stem">
              <div className="acx-funnel-stem-line"></div>
              <div className="acx-funnel-stem-arrow">▼</div>
            </div>

            <div className="acx-funnel-out">
              <span className="acx-funnel-out-letter">{targetLetter}.</span>
              <span className="acx-funnel-out-name">{targetGenre.name}</span>
              {targetScore && <span className="acx-funnel-out-score">적합도 {targetScore.score}</span>}
            </div>
          </div>
        </div>

        {/* RIGHT: TO */}
        <aside className="acx-side acx-to">
          <div className="acx-side-lbl">TO · 변환 결과</div>
          <div className="acx-side-card">
            <div className="acx-side-icon">{I[targetLetter]}</div>
            <div className="acx-side-letter">{targetLetter}.</div>
            <div className="acx-side-name">{targetGenre.name}</div>
            <div className="acx-side-fmt">{targetGenre.standard || targetGenre.sub}</div>
          </div>
          {targetScore && <div className="acx-side-reason">&ldquo;{targetScore.reason}&rdquo;</div>}

          <div className="acx-side-guide">
            <div className="acx-side-guide-lbl">자동 적용 가이드</div>
            <div className="acx-side-guide-list">
              <div className="acx-side-guide-row">
                <span>분량</span>
                <strong>{targetGenre.standard || targetGenre.sub}</strong>
              </div>
              <div className="acx-side-guide-row">
                <span>양식</span>
                <strong>{targetGenre.format || "장르 표준 양식"}</strong>
              </div>
              <div className="acx-side-guide-row">
                <span>호흡</span>
                <strong>{targetGenre.rhythm || "회당 후크 강조"}</strong>
              </div>
            </div>
          </div>

          <p className="acx-side-hint" style={{ fontSize: 12.5, color: "var(--ink-4)", lineHeight: 1.6, margin: "12px 2px 0" }}>
            매체를 고른 뒤 아래 <strong>변환 시작</strong> 버튼을 누르면, 원본을 1차로 분석한 뒤 선택한 매체 표준에 맞춰 변환합니다.
          </p>
        </aside>
      </div>

      <div className="acx-foot">
        <span>전체 매체를 가로/세로로 한눈에 보고 싶으면</span>
        <button
          className="acx-foot-btn"
          onClick={() => router.push("/osmu")}
          type="button"
        >
          {I.osmu}<span>OSMU 매트릭스로 이동</span>{I.arrow}
        </button>
      </div>
    </Fragment>
  );
}
