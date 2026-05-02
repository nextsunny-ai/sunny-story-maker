"use client";

import { useRef, useState } from "react";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Tip } from "@/components/ui";
import { streamAgent } from "@/lib/stream-agent";

type PhaseKey = "logline" | "treatment" | "synopsis" | "script";
type PhaseState = "idle" | "running" | "done" | "error";

interface PhaseDef {
  n: number;
  key: PhaseKey;
  name: string;
  out: string;
  time: string;
}

const PHASES: PhaseDef[] = [
  { n: 1, key: "logline",   name: "로그라인",     out: "한 줄 컨셉",    time: "10초" },
  { n: 2, key: "treatment", name: "트리트먼트",   out: "5~7p 줄거리",  time: "60초" },
  { n: 3, key: "synopsis",  name: "시놉시스",     out: "1~2p",         time: "30초" },
  { n: 4, key: "script",    name: "첫 부분 샘플", out: "1화 또는 첫 10p", time: "90초" },
];

export default function PitchPage() {
  return (
    <AppShell>
      <PitchMain />
    </AppShell>
  );
}

function PitchMain() {
  const I = ICONS;
  const G = GENRES;
  const [idea, setIdea] = useState("번아웃으로 퇴사한 30대 직장인이 시골 마을 작은 카페를 인수하면서 벌어지는 일");
  const [genre, setGenre] = useState("A");
  const [project, setProject] = useState("");

  const [results, setResults] = useState<Record<PhaseKey, string>>({
    logline: "", treatment: "", synopsis: "", script: "",
  });
  const [states, setStates] = useState<Record<PhaseKey, PhaseState>>({
    logline: "idle", treatment: "idle", synopsis: "idle", script: "idle",
  });
  const [running, setRunning] = useState(false);
  const [activePhase, setActivePhase] = useState<PhaseKey | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const samples = [
    "잃어버린 약혼반지를 추적하는 도둑이 진짜 도둑은 자신이었다는 걸 깨닫는 이야기",
    "AI 작가가 작성한 시나리오가 실제 살인사건과 일치한다는 신고가 들어온다",
    "엘리트 입시 학원에서 1등을 한 번도 놓친 적 없는 학생이, 어느 날 자기 시험지가 백지로 제출됐다는 걸 알게 된다",
  ];

  const currentGenre = G.find(g => g.letter === genre) || G[0];

  const setPhaseState = (key: PhaseKey, state: PhaseState) =>
    setStates(prev => ({ ...prev, [key]: state }));
  const appendResult = (key: PhaseKey, chunk: string) =>
    setResults(prev => ({ ...prev, [key]: prev[key] + chunk }));
  const setResult = (key: PhaseKey, text: string) =>
    setResults(prev => ({ ...prev, [key]: text }));

  const runPhase = async (
    key: PhaseKey,
    prior: Record<string, string>,
    signal: AbortSignal
  ): Promise<string> => {
    setActivePhase(key);
    setPhaseState(key, "running");
    setResult(key, "");

    const baseBody: Record<string, unknown> = {
      mode: key,
      idea,
      genreLetter: genre,
      fast: true,
      userInput: project ? { project } : {},
    };
    if (Object.keys(prior).length > 0) {
      baseBody.prior = prior;
    }
    if (key === "script") {
      baseBody.targetSection = "EP01 첫 부분 샘플 (5~10페이지)";
    }

    let errored = false;
    const full = await streamAgent({
      body: baseBody,
      signal,
      onDelta: (chunk) => appendResult(key, chunk),
      onError: (msg) => {
        errored = true;
        appendResult(key, `\n\n⚠ ${key} 단계 오류: ${msg}`);
        setPhaseState(key, "error");
      },
    });

    if (!errored) setPhaseState(key, "done");
    return full;
  };

  const runAll = async () => {
    if (running || !idea.trim()) return;
    setRunning(true);
    setResults({ logline: "", treatment: "", synopsis: "", script: "" });
    setStates({ logline: "idle", treatment: "idle", synopsis: "idle", script: "idle" });

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const logline = await runPhase("logline", {}, ac.signal);
      if (ac.signal.aborted) return;

      const treatment = await runPhase("treatment", { 로그라인: logline }, ac.signal);
      if (ac.signal.aborted) return;

      const synopsis = await runPhase("synopsis", { 로그라인: logline, 트리트먼트: treatment }, ac.signal);
      if (ac.signal.aborted) return;

      await runPhase("script", { 로그라인: logline, 트리트먼트: treatment, 시놉시스: synopsis }, ac.signal);
    } finally {
      setRunning(false);
      setActivePhase(null);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const completedCount = Object.values(states).filter(s => s === "done").length;

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — AI PITCH"
        title='AI <em style="font-style:italic">기획</em>'
        sub="한 줄 아이디어만. SUNNY가 로그라인부터 트리트먼트, 시놉시스, 첫 부분 샘플까지 처음부터 끝까지 씁니다."
      />

      <div className="pitch-hero">
        <div className="pitch-hero-eyebrow">
          <span className="pitch-hero-bullet"></span>
          머릿속 한 문장을 적어주세요
        </div>

        <textarea
          className="pitch-hero-input"
          rows={3}
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="예) 번아웃으로 퇴사한 30대 직장인이 시골 마을 작은 카페를 인수하면서 벌어지는 일"
          disabled={running}
        />

        <div className="pitch-hero-meta">
          <span className="pitch-hero-count">
            <span className="num">{idea.length}</span> / 200자
          </span>
          <div className="pitch-hero-samples">
            <span className="pitch-hero-samples-label">또는 — 영감</span>
            {samples.map((s, i) => (
              <button key={i} className="pitch-sample-chip" onClick={() => setIdea(s)} disabled={running}>
                {s.length > 38 ? s.slice(0, 38) + "…" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SectionHead num={1} title="매체" sub="매체에 따라 SUNNY가 적용할 공식이 달라집니다. (장르는 다음 단계에서)" />

      <div className="form-grid">
        <Field label="매체" required>
          <select className="field-select" value={genre} onChange={e => setGenre(e.target.value)} disabled={running}>
            {G.map(g => (
              <option key={g.letter} value={g.letter}>{g.letter}. {g.name} ({g.sub})</option>
            ))}
          </select>
        </Field>
        <Field label="작품명" help="저장용 — 나중에 라이브러리에서 찾기 쉽도록.">
          <input
            className="field-input"
            placeholder={"예: " + (idea.split(" ").slice(0, 3).join("") || "시골카페 일기")}
            value={project}
            onChange={e => setProject(e.target.value)}
            disabled={running}
          />
        </Field>
      </div>

      <div className="pitch-cheat">
        <div className="pitch-cheat-head">
          <span className="pitch-cheat-icon">{I[genre]}</span>
          <div>
            <div className="pitch-cheat-title">{currentGenre.name}</div>
            <div className="pitch-cheat-sub">{currentGenre.sub}</div>
          </div>
          <div className="pitch-cheat-spec">
            <div><span>분량</span>{currentGenre.pages}</div>
            <div><span>포맷</span>{currentGenre.format}</div>
          </div>
        </div>
      </div>

      <SectionHead num={2} title="SUNNY가 만들 것" sub="버튼 한 번에 4단계 산출물이 순서대로 흘러나옵니다." />

      <div className="pitch-phases">
        {PHASES.map((p, i) => {
          const st = states[p.key];
          const isActive = activePhase === p.key;
          return (
            <div key={p.n} className="pitch-phase" style={{
              borderColor: isActive ? "var(--coral)" : st === "done" ? "var(--ink-5)" : undefined,
              opacity: st === "idle" && running && !isActive ? 0.55 : 1,
            }}>
              <div className="pitch-phase-head">
                <span className="pitch-phase-num">— {String(p.n).padStart(2, "0")}</span>
                <span className="pitch-phase-time">
                  {st === "running" ? "생성 중…" :
                   st === "done"    ? "완료" :
                   st === "error"   ? "오류" :
                                       p.time}
                </span>
              </div>
              <div className="pitch-phase-name">{p.name}</div>
              <div className="pitch-phase-out">{p.out}</div>
              {i < PHASES.length - 1 && <div className="pitch-phase-arrow">{I.arrow}</div>}
            </div>
          );
        })}
      </div>

      <SectionHead num={3} title="실행" sub="평균 소요 — 약 3분. 글자가 흘러내리는 걸 실시간으로 볼 수 있습니다." />

      <div className="pitch-launch">
        <button
          className="pitch-launch-btn"
          disabled={!idea.trim() || running}
          onClick={runAll}
        >
          <span className="pitch-launch-icon">{I.spark}</span>
          <span>
            <div className="pitch-launch-title">
              {running
                ? `생성 중 (${completedCount}/4)…`
                : completedCount === 4 ? "다시 생성" : "AI 작가에게 맡기기"}
            </div>
            <div className="pitch-launch-sub">{currentGenre.name} · 4단계 산출물 자동 생성</div>
          </span>
          <span className="pitch-launch-arrow">{I.arrow}</span>
        </button>

        <div className="pitch-launch-side">
          <div className="kv"><div className="kv-k">예상 소요</div><div className="kv-v">~3분</div></div>
          <div className="kv"><div className="kv-k">진행</div><div className="kv-v">{completedCount} / 4 단계</div></div>
          <div className="kv"><div className="kv-k">현재</div><div className="kv-v">{activePhase ? PHASES.find(p => p.key === activePhase)?.name : "—"}</div></div>
          {running && (
            <button className="btn" style={{ marginTop: 6 }} onClick={stop}>중지</button>
          )}
        </div>
      </div>

      {(completedCount > 0 || running) && (
        <>
          <SectionHead num={4} title="결과" sub="단계별 산출물 — 생성되는 대로 누적됩니다." />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PHASES.map(p => {
              const st = states[p.key];
              const text = results[p.key];
              if (st === "idle" && !text) return null;
              return (
                <article
                  key={p.key}
                  style={{
                    background: "var(--card)",
                    border: "1px solid " + (activePhase === p.key ? "var(--coral)" : "var(--line)"),
                    borderRadius: 14,
                    padding: "20px 22px",
                  }}
                >
                  <header style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                      color: "var(--ink-5)", textTransform: "uppercase",
                    }}>
                      — {String(p.n).padStart(2, "0")} · {p.name}
                    </span>
                    <span style={{ fontSize: 11, color: st === "error" ? "var(--coral-deep)" : "var(--ink-5)" }}>
                      {st === "running" ? "생성 중…" : st === "done" ? "완료" : st === "error" ? "오류" : ""}
                    </span>
                  </header>
                  <div style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--font-display)",
                    fontSize: 14, lineHeight: 1.8,
                    color: "var(--ink-2)",
                    minHeight: 24,
                  }}>
                    {text || (st === "running" ? "…" : "")}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <div style={{ marginTop: 28 }}>
        <Tip>
          한 줄이 구체적일수록 결과가 정확합니다. 인물 · 욕망 · 장애물이 포함되면 좋아요. 막연하면 SUNNY가 너무 많은 걸 가정합니다.
        </Tip>
      </div>

      <div style={{ height: 60 }}></div>
    </main>
  );
}
