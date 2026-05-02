"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Btn } from "@/components/ui";
import { AdaptSameMode, type ToneChip, type AdaptVersion } from "@/components/AdaptSameMode";
import { AdaptCrossMode, type AdaptScore } from "@/components/AdaptCrossMode";
import { KEY, usePersistedState } from "@/lib/persist";

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
  const router = useRouter();
  const I = ICONS;

  const [mode, setMode] = useState<"same" | "cross">("same");

  // 원본 작품 (영속화)
  const [sourceTitle, setSourceTitle] = usePersistedState<string>(KEY.adaptTitle, "");
  const [sourceText, setSourceText] = usePersistedState<string>(KEY.adaptText, "");
  const [sourceLetter, setSourceLetter] = usePersistedState<string>(KEY.adaptGenre, "B");

  // 파일 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{ kind: "idle" | "loading" | "error" | "ok"; message?: string }>({ kind: "idle" });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadStatus({ kind: "loading", message: `${file.name} 분석 중…` });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setUploadStatus({ kind: "error", message: json.error || "업로드 실패" });
        return;
      }
      setSourceText(prev => (prev ? prev + "\n\n" : "") + json.text);
      if (!sourceTitle) setSourceTitle(file.name.replace(/\.[^.]+$/, ""));
      setUploadStatus({ kind: "ok", message: `${json.meta.filename} — ${json.meta.chars.toLocaleString()}자 추가됨` });
    } catch (err) {
      setUploadStatus({ kind: "error", message: err instanceof Error ? err.message : "네트워크 오류" });
    }
  };

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

      {/* 원본 작품 — 직접 입력 또는 파일 업로드 */}
      <SectionHead num={0} title="원본 작품" sub="시나리오 본문을 붙여넣거나 파일 업로드 (PDF · Word · TXT)" />

      <div className="form-grid">
        <Field label="작품명" required>
          <input
            className="field-input"
            value={sourceTitle}
            onChange={e => setSourceTitle(e.target.value)}
            placeholder="예: 달빛 정원"
          />
        </Field>
        <Field label="원본 매체">
          <select className="field-select" value={sourceLetter} onChange={e => setSourceLetter(e.target.value)}>
            {GENRES.map(g => <option key={g.letter} value={g.letter}>{g.letter}. {g.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="form-grid cols-1">
        <Field label="원본 본문" help={sourceText ? `${sourceText.length.toLocaleString()}자` : "붙여넣기 또는 파일 업로드"}>
          <textarea
            className="field-textarea script"
            rows={6}
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            placeholder="시나리오 전체 또는 일부를 붙여넣어 주세요."
          />
        </Field>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.fountain,.fdx"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {uploadStatus.kind !== "idle" && (
        <div style={{
          marginTop: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13,
          background: uploadStatus.kind === "error" ? "var(--coral-soft)" : "var(--card-soft)",
          color: uploadStatus.kind === "error" ? "var(--coral-deep)" : "var(--ink-2)",
          border: "1px solid " + (uploadStatus.kind === "error" ? "var(--coral)" : "var(--line)"),
        }}>
          {uploadStatus.kind === "loading" && <span>⏳ {uploadStatus.message}</span>}
          {uploadStatus.kind === "ok" && <span>✓ {uploadStatus.message}</span>}
          {uploadStatus.kind === "error" && <span>⚠ {uploadStatus.message}</span>}
        </div>
      )}

      <div className="btn-row">
        <Btn icon={I.download} onClick={() => fileInputRef.current?.click()}>파일 업로드</Btn>
        <Btn icon={I.library} onClick={() => router.push("/library")}>라이브러리에서 가져오기</Btn>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-4)" }}>
          {sourceTitle ? `${sourceTitle} — ${sourceLetter}. ${sourceGenre.name}` : "작품명 입력 필요"}
        </span>
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
