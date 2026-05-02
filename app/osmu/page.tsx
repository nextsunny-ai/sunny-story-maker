"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { streamAgent } from "@/lib/stream-agent";

export default function OsmuPage() {
  return (
    <AppShell>
      <OsmuMain />
    </AppShell>
  );
}

interface SampleResult {
  score: number;
  headline: string;
  note: string;
  strength: string;
}

function OsmuMain() {
  const router = useRouter();
  const I = ICONS;

  const [source, setSource] = useState("F");
  const [depth, setDepth] = useState<"A" | "B" | "C">("A");
  const [title, setTitle] = useState("달빛 정원");
  const [body, setBody] = useState(
    "달빛이 비치는 정원에서 사라진 소녀를 찾아 나선 정원사. 잃어버린 기억을 가진 인물과 함께 정원의 비밀을 풀어가며 서로의 진짜 이름을 되찾아 간다. 로맨스 + 미스터리 + 성장 서사의 3축 구조."
  );
  const [running, setRunning] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const targetCount = GENRES.length - 1; // 원본 제외
  const depthInfo = {
    A: { label: "매트릭스 분석", desc: "각 매체 1단락 · 빠른 스캔", eta: "1~3분", pages: "1단락" },
    B: { label: "트리트먼트", desc: "각 매체 A4 1쪽 · 핵심 잡기", eta: `${targetCount * 1}~${targetCount * 2}분`, pages: "A4 1쪽" },
    C: { label: "풀 패키지", desc: "시놉+캐릭터+첫 부분 · 본격", eta: `${targetCount * 3}~${targetCount * 5}분`, pages: "패키지" },
  } as const;
  const cur = depthInfo[depth];

  // 데모: 결과 데이터 (12장르)
  const sampleResults: Record<string, SampleResult> = {
    A: { score: 95, headline: "원작 — 그대로 살림", note: "캐릭터·세계관·정서 모두 유지. 16부 가장 자연스러움.", strength: "정서·캐릭터" },
    B: { score: 78, headline: "압축형 영화화", note: "2시간 안에 핵심 갈등만. 조연 대거 정리 필요.", strength: "임팩트" },
    C: { score: 88, headline: "세로 숏드라마", note: "회당 1~2분 · 100화. 후크 매 회차마다.", strength: "확장성" },
    D: { score: 72, headline: "감성 애니 영화", note: "비주얼 메타포로 정서 증폭. 어른 관객.", strength: "비주얼" },
    F: { score: 82, headline: "원작 웹툰", note: "65컷·100화. 컷 단위 호흡 살리기.", strength: "비주얼·호흡" },
    G: { score: 65, headline: "메이킹 다큐", note: "원작자 인터뷰 + 제작 과정. 부속물.", strength: "브랜딩" },
    H: { score: 92, headline: "장르 웹소설", note: "회당 5천자 · 200화. 내면 묘사 강점.", strength: "내면" },
    I: { score: 70, headline: "주크박스 뮤지컬", note: "넘버 12곡. 핵심 감정 장면만 발췌.", strength: "정서" },
    J: { score: 84, headline: "유튜브 시리즈", note: "10분짜리 · 캐릭터 채널 운영. 팬덤 직접 소통.", strength: "팬덤" },
    K: { score: 76, headline: "체험형 전시", note: "9개 존 · 주요 장면 재현 + 굿즈.", strength: "오프라인" },
    L: { score: 89, headline: "비주얼 노벨 게임", note: "선택지 분기. 멀티엔딩 5종. 호감도 시스템.", strength: "인터랙션" },
    M: { score: 58, headline: "예능 콜라보", note: "캐릭터 ↔ 셀럽 매칭. 단발성 스페셜.", strength: "화제성" },
  };

  const sourceGenre = GENRES.find(g => g.letter === source) || GENRES[0];

  const startMatrix = async () => {
    if (running) return;
    if (!body.trim()) {
      setError("원본 작품 본문을 입력해주세요.");
      return;
    }
    setError(null);
    setStreamText("");
    setRunning(true);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await streamAgent({
        body: {
          mode: "osmu",
          idea: body,
          sourceIp: title || "원본 작품",
          genreLetter: source,
          fast: false,
        },
        signal: ac.signal,
        onDelta: (chunk) => setStreamText(prev => prev + chunk),
        onError: (msg) => setError(msg),
      });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const stopMatrix = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = String(ev.target?.result || "");
      setBody(text.slice(0, 50_000));
      if (!title || title === "달빛 정원") {
        setTitle(file.name.replace(/\.[^.]+$/, ""));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const resultRows = GENRES
    .filter(g => g.letter !== source)
    .map(g => ({ g, r: sampleResults[g.letter] }))
    .filter(x => x.r)
    .sort((a, b) => b.r.score - a.r.score);

  const top3 = resultRows.slice(0, 3);

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — OSMU"
        title='하나의 이야기, <em style="font-style:italic">열두 가지 매체</em>'
        sub="원본 한 작품을 12개 매체로 동시 분석 — 적합도·강점·전환 룰을 매트릭스로 한 번에."
      />

      {/* INPUT CARD */}
      <div className="osmu-input">
        <div className="osmu-input-grid">
          <div className="osmu-input-source is-demo">
            <div className="osmu-input-label">원본 작품</div>
            <div className="osmu-input-source-meta">
              <input
                type="text"
                className="osmu-input-source-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="작품명"
              />
              <div className="osmu-input-source-tags">
                <span className="osmu-input-tag is-genre">
                  {I[sourceGenre.letter]} {sourceGenre.letter}. {sourceGenre.name}
                </span>
                <span className="osmu-input-tag">12,400자</span>
              </div>
            </div>
            <textarea
              className="osmu-input-source-text"
              rows={4}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="시놉시스 또는 1화 본문 — 자유롭게 붙여넣기"
            />
            <div className="osmu-input-source-actions">
              <button
                className="osmu-link-btn"
                type="button"
                onClick={() => router.push("/library")}
              >
                {I.library}<span>라이브러리에서 가져오기</span>
              </button>
              <button
                className="osmu-link-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                {I.upload}<span>파일 업로드</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,text/plain"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="osmu-input-config">
            <div className="osmu-config-block">
              <div className="osmu-input-label">원본 매체</div>
              <select
                className="osmu-config-select"
                value={source}
                onChange={e => setSource(e.target.value)}
              >
                {GENRES.map(g => (
                  <option key={g.letter} value={g.letter}>
                    {g.letter}. {g.name}
                  </option>
                ))}
              </select>
              <div className="osmu-config-hint">
                나머지 <strong>{targetCount}개 매체</strong>로 자동 분석
              </div>
            </div>

            <div className="osmu-config-block">
              <div className="osmu-input-label">분석 깊이</div>
              <div className="osmu-depth-row">
                {(["A", "B", "C"] as const).map(k => {
                  const info = depthInfo[k];
                  return (
                    <button
                      key={k}
                      className={"osmu-depth-pill" + (depth === k ? " is-on" : "")}
                      onClick={() => setDepth(k)}
                      title={info.desc}
                    >
                      <span className="osmu-depth-pill-name">{info.label}</span>
                      <span className="osmu-depth-pill-pages">{info.pages}</span>
                    </button>
                  );
                })}
              </div>
              <div className="osmu-config-hint">
                {cur.desc} · 예상 <strong>{cur.eta}</strong>
              </div>
            </div>

            <button
              className="osmu-run-cta"
              type="button"
              onClick={running ? stopMatrix : startMatrix}
              disabled={!body.trim() && !running}
            >
              <span className="osmu-run-cta-icon">{I.spark}</span>
              <span className="osmu-run-cta-label">
                {running ? "중지" : "12개 매체 매트릭스 시작"}
              </span>
              <span className="osmu-run-cta-meta">
                {running ? "스트리밍 중…" : cur.eta}
              </span>
            </button>
            {error && (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--coral, #d96a5a)" }}>
                ⚠ {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {(running || streamText) && (
        <div style={{ marginTop: 24 }}>
          <SectionHead
            title="매트릭스 분석 결과"
            sub={running ? "스트리밍 중 — Opus 4.7가 12개 매체로 분석 중" : `완료 · ${streamText.length.toLocaleString()}자`}
          />
          <div
            style={{
              padding: 20,
              background: "var(--surface-2, #fafaf7)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-script, ui-monospace, monospace)",
              fontSize: 13,
              lineHeight: 1.7,
              color: "var(--ink-1, #111)",
              maxHeight: 560,
              overflow: "auto",
            }}
          >
            {streamText || "잠시만요…"}
          </div>
        </div>
      )}

      {/* RESULT MATRIX */}
      <SectionHead
        title="OSMU 매트릭스"
        sub="적합도 순 정렬 — 각 카드 클릭하면 해당 매체로 작업실 진입"
        right={
          <div className="osmu-result-meta">
            <span className="osmu-demo-badge">예시 데이터</span>
            <span>{resultRows.length}개 매체 · 2분 14초</span>
          </div>
        }
      />

      <div className="osmu-result-grid is-demo">
        {resultRows.map(({ g, r }) => {
          const tier = r.score >= 85 ? "is-top" : r.score >= 75 ? "is-mid" : "is-low";
          return (
            <div key={g.letter} className={`osmu-result-card ${tier}`}>
              <div className="osmu-result-head">
                <div className="osmu-result-genre">
                  <div className="osmu-result-icon">{I[g.letter]}</div>
                  <div>
                    <div className="osmu-result-name">
                      <span className="osmu-result-letter">{g.letter}.</span> {g.name}
                    </div>
                    <div className="osmu-result-sub">{g.sub}</div>
                  </div>
                </div>
                <div className="osmu-result-score">
                  <div className="osmu-result-score-num">{r.score}</div>
                  <div className="osmu-result-score-label">적합도</div>
                </div>
              </div>

              <div className="osmu-result-headline">{r.headline}</div>
              <div className="osmu-result-note">{r.note}</div>

              <div className="osmu-result-foot">
                <span className="osmu-result-strength">{r.strength}</span>
                <button
                  className="osmu-result-go"
                  onClick={() => router.push("/write")}
                >
                  작업실로 {I.arrow}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* TOP 3 */}
      <SectionHead
        title="전개 우선순위"
        sub="매트릭스 기반 — 어디부터 풀어가면 좋을지"
      />

      <div className="osmu-top3 is-demo">
        {top3.map(({ g, r }, i) => (
          <div key={g.letter} className="osmu-top3-card">
            <div className="osmu-top3-rank">{String(i + 1).padStart(2, "0")}</div>
            <div className="osmu-top3-icon">{I[g.letter]}</div>
            <div className="osmu-top3-body">
              <div className="osmu-top3-name">
                <span className="osmu-top3-letter">{g.letter}.</span> {g.name}
              </div>
              <div className="osmu-top3-headline">{r.headline}</div>
              <div className="osmu-top3-note">{r.note}</div>
            </div>
            <div className="osmu-top3-score">
              <div className="osmu-top3-score-num">{r.score}</div>
              <div className="osmu-top3-score-tag">{r.strength}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
