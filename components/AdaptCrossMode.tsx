"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import type { Genre } from "@/lib/genres";

export interface AdaptScore { score: number; reason: string }
export interface RankedTarget { g: Genre; s: AdaptScore }

interface AdaptCrossModeProps {
  sourceLetter: string;
  sourceGenre: Genre;
  targetLetter: string;
  setTargetLetter: (v: string) => void;
  targetGenre: Genre;
  targetScore: AdaptScore;
  rankedTargets: RankedTarget[];
}

export function AdaptCrossMode({
  sourceLetter, sourceGenre,
  targetLetter, setTargetLetter, targetGenre, targetScore,
  rankedTargets,
}: AdaptCrossModeProps) {
  const router = useRouter();
  const I = ICONS;
  const [extra, setExtra] = useState("");

  const tierOf = (s: number) => s >= 85 ? "top" : s >= 70 ? "mid" : "low";

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
            <div className="acx-side-meta-row"><span>분량</span><strong>96쪽</strong></div>
            <div className="acx-side-meta-row"><span>자수</span><strong>42,180자</strong></div>
            <div className="acx-side-meta-row"><span>버전</span><strong>v3 · 11.20</strong></div>
          </div>
        </aside>

        {/* CENTER: 깔때기 */}
        <div className="acx-center">
          <div className="acx-center-lbl">매체 적합도 — 변환할 매체를 선택</div>

          <div className="acx-funnel">
            <div className="acx-funnel-rays">
              <span></span><span></span><span></span>
            </div>

            <div className="acx-bars">
              {rankedTargets.map(({ g, s }) => {
                const isTarget = g.letter === targetLetter;
                const tier = tierOf(s.score);
                return (
                  <button
                    key={g.letter}
                    type="button"
                    className={"acx-bar is-" + tier + (isTarget ? " is-target" : "")}
                    onClick={() => setTargetLetter(g.letter)}
                    title={s.reason}
                  >
                    <span className="acx-bar-icon">{I[g.letter]}</span>
                    <span className="acx-bar-letter">{g.letter}</span>
                    <span className="acx-bar-name">{g.name}</span>
                    <span className="acx-bar-track">
                      <span className="acx-bar-fill" style={{ width: s.score + "%" }}></span>
                    </span>
                    <span className="acx-bar-score">{s.score}</span>
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
              <span className="acx-funnel-out-score">적합도 {targetScore.score}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: TO + 실행 */}
        <aside className="acx-side acx-to">
          <div className="acx-side-lbl">TO · 변환 결과</div>
          <div className="acx-side-card">
            <div className="acx-side-icon">{I[targetLetter]}</div>
            <div className="acx-side-letter">{targetLetter}.</div>
            <div className="acx-side-name">{targetGenre.name}</div>
            <div className="acx-side-fmt">{targetGenre.standard || targetGenre.sub}</div>
          </div>
          <div className="acx-side-reason">&ldquo;{targetScore.reason}&rdquo;</div>

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

          <div className="acx-side-extra">
            <div className="acx-side-guide-lbl">추가 디렉션 (선택)</div>
            <textarea
              className="acx-side-extra-text"
              rows={3}
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder={"살릴 점·바꿀 점\n예: 주인공 30대 여성, 폭력 수위 낮춤"}
            />
          </div>

          <button
            className="acx-go"
            type="button"
            onClick={() => {
              const params = new URLSearchParams({
                mode: "adapt-cross",
                project: "달빛 정원",
                genre: sourceLetter,
                target: targetLetter,
              });
              router.push(`/write?${params.toString()}`);
            }}
          >
            <span className="acx-go-icon">{I.spark}</span>
            <span className="acx-go-text">
              <strong>{sourceGenre.name} → {targetGenre.name}</strong>
              <span>변환 시작 · 약 8분</span>
            </span>
          </button>
        </aside>
      </div>

      <div className="acx-foot">
        <span>전체 12개 매체를 가로/세로로 한눈에 보고 싶으면</span>
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
