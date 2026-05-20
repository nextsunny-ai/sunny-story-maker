"use client";

// V3.1 추가-1 — 작품 통계 (글자수·페이지·매체별 환산·완성도)
// 작가가 = 자신 작품의 분량·완성도를 = 한눈에 확인.

import { useMemo, useState } from "react";

interface WorkStatsProps {
  /** 본문 전체 텍스트 (마크다운·평문 OK) */
  body: string;
  /** 매체 letter (A~P) — 매체별 환산 결정 */
  mediumLetter?: string;
  /** className override */
  className?: string;
}

interface StatsResult {
  chars: number;          // 글자수 (공백 포함)
  charsNoSpace: number;   // 글자수 (공백 X)
  lines: number;          // 줄 수
  paragraphs: number;     // 단락 수 (빈 줄로 구분)
  // 매체별 환산
  estimate: string;       // 예: "약 32페이지 · 32분 분량" / "약 8화 · 4만 자"
  /** 매체별 표준 분량 대비 % (= 완성도 추정) */
  progressPct: number;
  progressLabel: string;  // 예: "60% (1화 기준 5,000자 중)"
}

function calculateStats(body: string, letter?: string): StatsResult {
  const chars = body.length;
  const charsNoSpace = body.replace(/\s/g, "").length;
  const lines = body.split("\n").length;
  const paragraphs = body.split(/\n\s*\n/).filter(p => p.trim()).length;

  let estimate = `${chars.toLocaleString()}자`;
  let progressPct = 0;
  let progressLabel = "";

  // 매체별 환산 (한국 실무 표준)
  if (!letter) {
    // 매체 모름 = 글자수만
    estimate = `${chars.toLocaleString()}자 (공백 제외 ${charsNoSpace.toLocaleString()}자)`;
  } else if (["A", "B", "C", "D", "E", "I", "N"].includes(letter)) {
    // 시나리오 매체 (TV·영화·숏드·애니·뮤지컬·연극) = 1페이지 ≈ 1분
    // 한국 시나리오 = A4 1쪽 평균 400~500자
    const pages = Math.round(chars / 450);
    const minutes = pages; // 1p ≈ 1분
    estimate = `약 ${pages}페이지 · ${minutes}분 분량`;
    // 표준 분량
    let stdPages = 100;
    if (letter === "A") stdPages = 32;      // TV 드라마 회당 30~35p
    else if (letter === "B") stdPages = 90; // 영화 70~110p
    else if (letter === "C") stdPages = 2;  // 숏드라마 회당 1~2p
    else if (letter === "D") stdPages = 80; // 극장 애니
    else if (letter === "E") stdPages = 24; // 애니 시리즈
    else if (letter === "I") stdPages = 90; // 뮤지컬
    else if (letter === "N") stdPages = 90; // 연극
    progressPct = Math.min(100, Math.round((pages / stdPages) * 100));
    progressLabel = `${progressPct}% (표준 ${stdPages}p 기준)`;
  } else if (letter === "H") {
    // 웹소설 — 회당 5,000자 / 200화 표준
    const episodes = Math.round(chars / 5000 * 10) / 10;
    estimate = `약 ${episodes}화 (${chars.toLocaleString()}자)`;
    progressPct = Math.min(100, Math.round((episodes / 200) * 100));
    progressLabel = `${progressPct}% (200화 기준)`;
  } else if (letter === "O") {
    // 소설 — 200자 원고지
    const sheets = Math.round(chars / 200);
    let category = "콩트";
    let target = 10;
    if (sheets >= 50 && sheets < 200) { category = "단편"; target = 100; }
    else if (sheets >= 200 && sheets < 700) { category = "중편"; target = 400; }
    else if (sheets >= 700) { category = "장편"; target = 1000; }
    estimate = `${sheets}매 (${category})`;
    progressPct = Math.min(100, Math.round((sheets / target) * 100));
    progressLabel = `${progressPct}% (${category} 표준 ${target}매)`;
  } else if (letter === "P") {
    // 에세이 — A4 자유
    const pages = Math.round(chars / 1200);
    estimate = `약 ${pages}쪽 (${chars.toLocaleString()}자)`;
    progressPct = pages >= 5 ? 100 : Math.round((pages / 5) * 100);
    progressLabel = `${pages}쪽`;
  } else if (letter === "F") {
    // 웹툰 — [컷N] 카운트
    const cutMatches = body.match(/\[컷\d+\]/g);
    const cuts = cutMatches ? cutMatches.length : 0;
    estimate = `${cuts}컷 (회당 65~75컷 표준)`;
    progressPct = Math.min(100, Math.round((cuts / 70) * 100));
    progressLabel = `${progressPct}% (70컷 기준)`;
  } else if (letter === "G" || letter === "M") {
    // 다큐·예능 = 큐시트 row 수
    const rowMatches = body.match(/^\|.*\|.*\|/gm);
    const rows = rowMatches ? Math.max(0, rowMatches.length - 1) : 0; // 헤더·구분 제외 추정
    estimate = `${rows} row · 큐시트`;
    progressPct = Math.min(100, Math.round((rows / 30) * 100));
    progressLabel = `${progressPct}% (30 row 기준)`;
  } else if (letter === "J") {
    // 유튜브 — [00:00-...] TC 블록 수
    const tcMatches = body.match(/\[\d{2}:\d{2}-\d{2}:\d{2}\]/g);
    const blocks = tcMatches ? tcMatches.length : 0;
    estimate = `${blocks} TC 블록 (10분물 표준)`;
    progressPct = Math.min(100, Math.round((blocks / 15) * 100));
    progressLabel = `${progressPct}% (15 블록 기준)`;
  } else if (letter === "K") {
    // 전시 — Zone 수
    const zoneMatches = body.match(/###\s*존\d+|### 존\s*\d+|존\d+\.\s/g);
    const zones = zoneMatches ? zoneMatches.length : 0;
    estimate = `${zones} Zone (9~12 표준)`;
    progressPct = Math.min(100, Math.round((zones / 10) * 100));
    progressLabel = `${progressPct}% (10 Zone 기준)`;
  } else if (letter === "L") {
    // 게임 — 대사 ID 행 수
    const idMatches = body.match(/^\|\s*[A-Z]\d{3}/gm);
    const ids = idMatches ? idMatches.length : 0;
    estimate = `${ids} 대사 (게임 시나리오)`;
    progressPct = Math.min(100, Math.round((ids / 100) * 100));
    progressLabel = `${progressPct}% (100 대사 기준)`;
  }

  return { chars, charsNoSpace, lines, paragraphs, estimate, progressPct, progressLabel };
}

export function WorkStats({ body, mediumLetter, className }: WorkStatsProps) {
  const [expanded, setExpanded] = useState(false);
  const stats = useMemo(() => calculateStats(body, mediumLetter), [body, mediumLetter]);

  if (!body || body.length < 10) return null;

  const barColor =
    stats.progressPct >= 100 ? "bg-emerald-500" :
    stats.progressPct >= 60 ? "bg-blue-500" :
    stats.progressPct >= 30 ? "bg-amber-500" :
    "bg-zinc-400";

  return (
    <div className={`work-stats text-xs ${className || ""}`}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        title="작품 통계 보기"
      >
        <span className="font-medium">📊 {stats.estimate}</span>
        {stats.progressLabel && (
          <span className="text-zinc-500">· {stats.progressLabel}</span>
        )}
        <span className="text-zinc-400">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="mt-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-2">
          {/* 진행도 바 */}
          {stats.progressPct > 0 && (
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-zinc-500">진행도</span>
                <span className="font-medium">{stats.progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(100, stats.progressPct)}%` }} />
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">{stats.progressLabel}</div>
            </div>
          )}

          {/* 상세 통계 그리드 */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">총 글자수</span>
              <span className="font-medium">{stats.chars.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">공백 제외</span>
              <span className="font-medium">{stats.charsNoSpace.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">줄 수</span>
              <span className="font-medium">{stats.lines.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">단락 수</span>
              <span className="font-medium">{stats.paragraphs.toLocaleString()}</span>
            </div>
          </div>

          {/* 안내 */}
          <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            매체별 한국 실무 표준 기준. 실제 분량은 양식·연출에 따라 ±20% 변동 가능.
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkStats;
