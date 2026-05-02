"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";

export default function AdaptPage() {
  return (
    <AppShell>
      <AdaptMain />
    </AppShell>
  );
}

const TONE_CHIPS = [
  { id: "darker", label: "더 어둡게" },
  { id: "warmer", label: "더 따뜻하게" },
  { id: "tense", label: "긴장감 더" },
  { id: "comedy", label: "유머 더" },
  { id: "emotion", label: "감정 진하게" },
  { id: "restrain", label: "절제하게" },
  { id: "twist", label: "반전 추가" },
  { id: "tragic", label: "결말 비극" },
  { id: "happy", label: "결말 해피" },
  { id: "open", label: "결말 오픈" },
  { id: "first", label: "1인칭 시점" },
  { id: "compress", label: "분량 압축" },
];

function AdaptMain() {
  const router = useRouter();
  const I = ICONS;

  const [mode, setMode] = useState<"same" | "cross">("same");
  const [sourceLetter] = useState("B"); // 영화

  // 같은 매체 모드
  const [activeChips, setActiveChips] = useState<string[]>(["darker", "first"]);
  const [freeform, setFreeform] = useState(
    "주인공의 이름을 '도윤'으로 바꿔줘\n첫 장면을 정원이 아닌 도시 옥상으로\n회상 시퀀스를 1인칭 일기체로"
  );
  const toggleChip = (id: string) => {
    setActiveChips(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  };

  // 다른 매체 모드
  const [targetLetter, setTargetLetter] = useState("F"); // 웹툰

  const sourceGenre = GENRES.find(g => g.letter === sourceLetter) || GENRES[0];
  const targetGenre = GENRES.find(g => g.letter === targetLetter) || GENRES[0];

  // 데모: 버전 타임라인
  const versions = [
    { v: 1, date: "11.18", direction: "원본", brief: "초고 그대로" },
    { v: 2, date: "11.19", direction: "톤 더 어둡게 + 결말 비극", brief: "엔딩 톤 변경" },
    { v: 3, date: "11.20", direction: "1인칭 일기체로 시점 변경", brief: "시점 전환" },
  ];

  const adaptScores: Record<string, { score: number; reason: string }> = {
    A: { score: 95, reason: "원작의 정서·캐릭터 그대로 — 16부 미니 자연스러움" },
    C: { score: 81, reason: "회당 후크 강함 — 세로 숏드라마 100화 적합" },
    D: { score: 68, reason: "비주얼 메타포로 정서 증폭 — 어른 관객용 애니" },
    F: { score: 92, reason: "원작 정서·이미지 강점 그대로. 컷 단위 호흡 살아남" },
    G: { score: 42, reason: "다큐 형식엔 픽션 비중이 너무 큼" },
    H: { score: 88, reason: "1인칭 내면 묘사 핵심 — 200화 분량 잡기 좋음" },
    I: { score: 55, reason: "감정 장면 발췌해 12곡 넘버화 가능하나 무리수" },
    J: { score: 70, reason: "10분 단편 시리즈 — 캐릭터 채널 운영 가능" },
    K: { score: 72, reason: "공간성·정서 강함 — 9개 존 체험형 전시 가능" },
    L: { score: 76, reason: "선택지 분기 가능 — 비주얼 노벨 멀티엔딩 적합" },
    M: { score: 38, reason: "예능과는 톤이 너무 멈" },
  };

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — ADAPT"
        title='이미 있는 이야기, <em style="font-style:italic">다시 쓰거나 옮기기</em>'
        sub="자산은 그대로, 형식만 바뀝니다. 같은 매체 안에서 다듬거나 다른 매체로 옮기거나."
      />

      {/* MODE SEGMENT */}
      <div className="adapt-segment">
        <button
          className={"adapt-segment-btn" + (mode === "same" ? " is-on" : "")}
          onClick={() => setMode("same")}
        >
          <span className="adapt-segment-num">01</span>
          <span className="adapt-segment-label">같은 매체 안에서 다시 쓰기</span>
          <span className="adapt-segment-meta">v1 → v2 → v3 …</span>
        </button>
        <button
          className={"adapt-segment-btn" + (mode === "cross" ? " is-on" : "")}
          onClick={() => setMode("cross")}
        >
          <span className="adapt-segment-num">02</span>
          <span className="adapt-segment-label">다른 매체로 옮기기</span>
          <span className="adapt-segment-meta">영화 → 웹툰 · 웹소설 · 드라마 …</span>
        </button>
      </div>

      {/* 원본 작품 카드 */}
      <div className="adapt-source-bar is-demo">
        <div className="adapt-source-bar-icon">{I[sourceLetter]}</div>
        <div className="adapt-source-bar-body">
          <div className="adapt-source-bar-title">달빛 정원</div>
          <div className="adapt-source-bar-meta">
            <span>{sourceLetter}. {sourceGenre.name}</span>
            <span>·</span>
            <span>v3 · 11월 20일</span>
            <span>·</span>
            <span>96쪽 · 42,180자</span>
          </div>
        </div>
        <button className="adapt-source-bar-change">{I.library}<span>다른 작품으로 변경</span></button>
      </div>

      {mode === "same" ? (
        <Fragment>
          {/* 디렉션 입력 카드 */}
          <div className="adapt-direction-card">
            <div className="adapt-direction-grid">
              <div className="adapt-direction-left">
                <div className="adapt-direction-label">디렉션 칩 — 빠른 선택</div>
                <div className="adapt-chip-cloud">
                  {TONE_CHIPS.map(c => (
                    <button
                      key={c.id}
                      className={"adapt-chip" + (activeChips.includes(c.id) ? " is-on" : "")}
                      onClick={() => toggleChip(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="adapt-direction-label" style={{ marginTop: "18px" }}>
                  자유 디렉션 — 줄바꿈으로 여러 줄
                </div>
                <textarea
                  className="adapt-direction-text"
                  rows={4}
                  value={freeform}
                  onChange={e => setFreeform(e.target.value)}
                  placeholder="예: 주인공 이름을 '도윤'으로, 첫 장면을 옥상으로…"
                />
              </div>

              <div className="adapt-direction-right">
                <div className="adapt-direction-summary">
                  <div className="adapt-direction-summary-label">생성 요약</div>
                  <div className="adapt-direction-summary-row">
                    <span>다음 버전</span>
                    <strong>v4</strong>
                  </div>
                  <div className="adapt-direction-summary-row">
                    <span>활성 칩</span>
                    <strong>{activeChips.length}개</strong>
                  </div>
                  <div className="adapt-direction-summary-row">
                    <span>자유 디렉션</span>
                    <strong>{freeform.split("\n").filter(Boolean).length}줄</strong>
                  </div>
                  <div className="adapt-direction-summary-row">
                    <span>예상 시간</span>
                    <strong>~ 4분</strong>
                  </div>
                </div>
                <button className="adapt-run-btn-big">
                  <span className="adapt-run-btn-icon">{I.spark}</span>
                  <span>v4 생성하기</span>
                </button>
                <div className="adapt-run-foot-hint">생성 후 라이브러리에 자동 저장</div>
              </div>
            </div>
          </div>

          {/* 타임라인 */}
          <SectionHead
            title="버전 타임라인"
            sub="이 작품을 어떻게 다듬어 왔는지 — 클릭하면 해당 버전 열기"
            right={
              <div className="osmu-result-meta">
                <span className="osmu-demo-badge">예시 데이터</span>
                <span>3개 버전</span>
              </div>
            }
          />

          <div className="adapt-timeline is-demo">
            <div className="adapt-timeline-track">
              {versions.map((v, i) => (
                <Fragment key={v.v}>
                  <div className={"adapt-timeline-node" + (v.v === 3 ? " is-latest" : "")}>
                    <div className="adapt-timeline-dot"></div>
                    <div className="adapt-timeline-vnum">v{v.v}</div>
                    <div className="adapt-timeline-date">{v.date}</div>
                    <div className="adapt-timeline-brief">{v.brief}</div>
                    <div className="adapt-timeline-direction">{v.direction}</div>
                    {v.v === 3 && <div className="adapt-timeline-badge">최신</div>}
                  </div>
                  {i < versions.length - 1 && (
                    <div className="adapt-timeline-arrow">→</div>
                  )}
                </Fragment>
              ))}

              {/* v4 — 생성 예정 */}
              <div className="adapt-timeline-arrow is-pending">→</div>
              <div className="adapt-timeline-node is-pending">
                <div className="adapt-timeline-dot"></div>
                <div className="adapt-timeline-vnum">v4</div>
                <div className="adapt-timeline-date">생성 예정</div>
                <div className="adapt-timeline-brief">{activeChips.length}개 칩 + 자유 디렉션</div>
                <div className="adapt-timeline-direction">
                  {activeChips.length > 0
                    ? activeChips.slice(0, 2).map(id => TONE_CHIPS.find(c => c.id === id)?.label).join(" · ")
                    : "디렉션 입력 후 생성"}
                </div>
              </div>
            </div>
          </div>
        </Fragment>
      ) : (
        <Fragment>
          <SectionHead
            title="목표 매체 선택"
            sub="11개 매체 — 적합도 점수와 이유가 함께 표시됩니다"
            right={
              <div className="osmu-result-meta">
                <span className="osmu-demo-badge">예시 추천</span>
                <span>적합도 순 정렬</span>
              </div>
            }
          />

          <div className="adapt-cross-grid is-demo">
            {GENRES
              .filter(g => g.letter !== sourceLetter)
              .map(g => ({ g, s: adaptScores[g.letter] }))
              .filter(x => x.s)
              .sort((a, b) => b.s.score - a.s.score)
              .map(({ g, s }) => {
                const isTarget = g.letter === targetLetter;
                const tier = s.score >= 85 ? "is-top" : s.score >= 70 ? "is-mid" : "is-low";
                return (
                  <button
                    key={g.letter}
                    className={"adapt-cross-card-v2 " + tier + (isTarget ? " is-selected" : "")}
                    onClick={() => setTargetLetter(g.letter)}
                  >
                    <div className="adapt-cross-card-head">
                      <div className="adapt-cross-card-icon">{I[g.letter]}</div>
                      <div className="adapt-cross-card-name">
                        <span className="adapt-cross-card-letter">{g.letter}.</span>
                        <span>{g.name}</span>
                      </div>
                      <div className="adapt-cross-card-score">{s.score}</div>
                    </div>
                    <div className="adapt-cross-card-fmt">{g.standard || g.sub}</div>
                    <div className="adapt-cross-card-reason">{s.reason}</div>
                  </button>
                );
              })}
          </div>

          {/* 선택된 매체 가이드 + 실행 */}
          <div className="adapt-cross-action">
            <div className="adapt-cross-action-flow">
              <div className="adapt-cross-action-from">
                <div className="adapt-cross-action-lbl">FROM</div>
                <div className="adapt-cross-action-icon">{I[sourceLetter]}</div>
                <div className="adapt-cross-action-name">{sourceLetter}. {sourceGenre.name}</div>
              </div>
              <div className="adapt-cross-action-arrow">→</div>
              <div className="adapt-cross-action-to">
                <div className="adapt-cross-action-lbl">TO</div>
                <div className="adapt-cross-action-icon">{I[targetLetter]}</div>
                <div className="adapt-cross-action-name">{targetLetter}. {targetGenre.name}</div>
              </div>
            </div>

            <div className="adapt-cross-action-guide">
              <div className="adapt-cross-action-guide-title">{targetGenre.name} 매체 가이드 자동 적용</div>
              <div className="adapt-cross-action-guide-list">
                <div><span>분량</span><strong>{targetGenre.standard || targetGenre.sub}</strong></div>
                <div><span>양식</span><strong>{targetGenre.format || "장르 표준 양식"}</strong></div>
                <div><span>호흡</span><strong>{targetGenre.rhythm || "회당 후크 강조"}</strong></div>
              </div>
            </div>

            <div className="adapt-cross-action-direction">
              <div className="adapt-direction-label">추가 디렉션 (선택)</div>
              <textarea
                className="adapt-direction-text"
                rows={3}
                placeholder={"변환 시 살릴 점·바꿀 점을 자유롭게\n예: 주인공을 30대 여성으로, 폭력 수위 낮추고 가족 드라마 강조"}
              />
            </div>

            <button className="adapt-run-btn-big">
              <span className="adapt-run-btn-icon">{I.spark}</span>
              <span>{sourceGenre.name} → {targetGenre.name} 변환 시작</span>
              <span className="adapt-run-btn-meta">~ 8분</span>
            </button>
          </div>

          <div className="adapt-cross-foot-link">
            <span>전체 12개 매체 매트릭스가 필요하면</span>
            <button
              className="adapt-cross-foot-btn"
              onClick={() => router.push("/osmu")}
            >
              {I.osmu}<span>OSMU 매트릭스로 이동</span>{I.arrow}
            </button>
          </div>
        </Fragment>
      )}
    </main>
  );
}
