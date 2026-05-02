"use client";

import { useState } from "react";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { AdaptSameMode, type ToneChip, type AdaptVersion } from "@/components/AdaptSameMode";
import { AdaptCrossMode, type AdaptScore } from "@/components/AdaptCrossMode";

export default function AdaptPage() {
  return (
    <AppShell>
      <AdaptMain />
    </AppShell>
  );
}

const TONE_CHIPS: ToneChip[] = [
  { id: "darker",   label: "더 어둡게" },
  { id: "warmer",   label: "더 따뜻하게" },
  { id: "tense",    label: "긴장감 더" },
  { id: "comedy",   label: "유머 더" },
  { id: "emotion",  label: "감정 진하게" },
  { id: "restrain", label: "절제하게" },
  { id: "twist",    label: "반전 추가" },
  { id: "tragic",   label: "결말 비극" },
  { id: "happy",    label: "결말 해피" },
  { id: "open",     label: "결말 오픈" },
  { id: "first",    label: "1인칭 시점" },
  { id: "compress", label: "분량 압축" },
];

function AdaptMain() {
  const I = ICONS;

  const [mode, setMode] = useState<"same" | "cross">("same");
  const [sourceLetter] = useState("B"); // 영화

  // 같은 매체
  const [activeChips, setActiveChips] = useState<string[]>(["darker", "first"]);
  const [freeform, setFreeform] = useState(
    "주인공의 이름을 '도윤'으로 바꿔줘\n첫 장면을 정원이 아닌 도시 옥상으로\n회상 시퀀스를 1인칭 일기체로"
  );
  const [openVer, setOpenVer] = useState<number | null>(null);

  const toggleChip = (id: string) =>
    setActiveChips(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);

  const versions: AdaptVersion[] = [
    { v: 1, date: "11.18", label: "원본",      brief: "초고 그대로",       direction: "—",
      diff: "초고 — 96쪽 · 42,180자" },
    { v: 2, date: "11.19", label: "톤 조정",   brief: "엔딩 톤 변경",       direction: "더 어둡게 · 결말 비극",
      diff: "엔딩 3씬 재작성, 회상 1씬 삭제. 분량 -4쪽" },
    { v: 3, date: "11.20", label: "시점 전환", brief: "1인칭 일기체",      direction: "1인칭 시점 · 회상 일기체화",
      diff: "전 씬 시점 변환, 일기체 인서트 6개 추가. 분량 +2쪽" },
  ];

  // 다른 매체
  const [targetLetter, setTargetLetter] = useState("F"); // 웹툰

  const sourceGenre = GENRES.find(g => g.letter === sourceLetter) || GENRES[0];
  const targetGenre = GENRES.find(g => g.letter === targetLetter) || GENRES[0];

  const adaptScores: Record<string, AdaptScore> = {
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

  const rankedTargets = GENRES
    .filter(g => g.letter !== sourceLetter)
    .map(g => ({ g, s: adaptScores[g.letter] }))
    .filter(x => x.s)
    .sort((a, b) => b.s.score - a.s.score);

  const targetScore = adaptScores[targetLetter];

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — ADAPT"
        title='이미 있는 이야기, <em style="font-style:italic">다시 쓰거나 옮기기</em>'
        sub="자산은 그대로, 형식만 바뀝니다. 같은 매체 안에서 다듬거나 다른 매체로 옮기거나."
      />

      <div className="adapt-segment">
        <button
          className={"adapt-segment-btn" + (mode === "same" ? " is-on" : "")}
          onClick={() => setMode("same")}
        >
          <span className="adapt-segment-num">01</span>
          <span className="adapt-segment-label">같은 매체에서 다시 쓰기</span>
          <span className="adapt-segment-meta">v1 → v2 → v3 …</span>
        </button>
        <button
          className={"adapt-segment-btn" + (mode === "cross" ? " is-on" : "")}
          onClick={() => setMode("cross")}
        >
          <span className="adapt-segment-num">02</span>
          <span className="adapt-segment-label">다른 매체로 옮기기</span>
          <span className="adapt-segment-meta">영화 → 웹툰 · 드라마 · 웹소설 …</span>
        </button>
      </div>

      <div className="adapt-source-bar is-demo">
        <div className="adapt-source-bar-icon">{I[sourceLetter]}</div>
        <div className="adapt-source-bar-body">
          <div className="adapt-source-bar-title">달빛 정원</div>
          <div className="adapt-source-bar-meta">
            <span>{sourceLetter}. {sourceGenre.name}</span>
            <span>·</span>
            <span>v3 · 11월 20일 (최신)</span>
            <span>·</span>
            <span>96쪽 · 42,180자</span>
          </div>
        </div>
        <button className="adapt-source-bar-change">{I.library}<span>다른 작품으로 변경</span></button>
      </div>

      {mode === "same" ? (
        <AdaptSameMode
          versions={versions}
          openVer={openVer}
          setOpenVer={setOpenVer}
          TONE_CHIPS={TONE_CHIPS}
          activeChips={activeChips}
          toggleChip={toggleChip}
          freeform={freeform}
          setFreeform={setFreeform}
        />
      ) : (
        <AdaptCrossMode
          sourceLetter={sourceLetter}
          sourceGenre={sourceGenre}
          targetLetter={targetLetter}
          setTargetLetter={setTargetLetter}
          targetGenre={targetGenre}
          targetScore={targetScore}
          rankedTargets={rankedTargets}
        />
      )}
    </main>
  );
}
