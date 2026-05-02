"use client";

import { useRef, useState } from "react";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Tip, Btn } from "@/components/ui";
import { streamAgent } from "@/lib/stream-agent";

interface OutputItem {
  k: string;
  name: string;
  meta: string;
  spec: string;
}

const ITEMS: OutputItem[] = [
  { k: "treatment", name: "트리트먼트", meta: "5~7p · 줄거리 산문체", spec: "A4 · 한글" },
  { k: "synopsis",  name: "시놉시스",   meta: "1~2p · 한 줄 ~ 한 페이지", spec: "A4 · 한글" },
  { k: "character", name: "캐릭터 시트", meta: "3~6명 · 동기·아크",       spec: "A4 · 한글" },
  { k: "structure", name: "구성안",     meta: "회차별 / 막별 비트",        spec: "표 · 한글" },
  { k: "scene",     name: "씬 리스트",   meta: "씬 헤딩 + 한 줄 요약",      spec: "엑셀" },
  { k: "pitch",     name: "피치덱",     meta: "10~15장 · 비주얼 중심",     spec: "PPT" },
];

const STEP_LABEL: Record<string, string> = {
  analyze: "의뢰 분석",
  treatment: "트리트먼트",
  synopsis: "시놉시스",
  character: "캐릭터 시트",
  structure: "구성안",
  scene: "씬 리스트",
  pitch: "피치덱",
};

export default function PackagePage() {
  return (
    <AppShell>
      <PackageMain />
    </AppShell>
  );
}

function PackageMain() {
  const I = ICONS;
  const [outputs, setOutputs] = useState<Record<string, boolean>>({
    treatment: true, synopsis: true, character: true,
    structure: true, scene: false, pitch: false,
  });

  const [genreLetter, setGenreLetter] = useState("A");
  const [project, setProject] = useState("트랑로제");
  const [runtime, setRuntime] = useState("16부작 (회당 60분)");
  const [platform, setPlatform] = useState("OTT (글로벌)");
  const [target, setTarget] = useState("30대 여성");
  const [tone, setTone] = useState("로맨틱 · 다소 무거움");
  const [pov, setPov] = useState("3인칭 제한");
  const [logline, setLogline] = useState('30대 직장인 여성이 옛 연인의 결혼식에서 첫사랑을 다시 만난다');
  const [story, setStory] = useState("회사 후배의 결혼식, 신랑이 옛 연인. 5년 전 갑자기 떠난 그가 왜 거기에 있는지 — 그날부터 매일 그를 마주쳐야 하는 일이 시작된다. 첫사랑·복수·자기증명이 한 데 얽힌 이야기.");

  const [result, setResult] = useState("");
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const toggle = (k: string) => {
    if (running) return;
    setOutputs(o => ({ ...o, [k]: !o[k] }));
  };

  const selectedKeys = Object.entries(outputs).filter(([, v]) => v).map(([k]) => k);
  const selectedNames = selectedKeys.map(k => ITEMS.find(i => i.k === k)?.name || k);

  const stepsForRun = ["analyze", ...selectedKeys];
  const steps = stepsForRun.map((k, i) => ({
    n: i + 1,
    key: k,
    label: STEP_LABEL[k] || k,
    state: completedSteps.includes(k) ? "done"
         : activeStep === k ? "active"
         : "",
  }));

  const generate = async () => {
    if (running) return;
    if (selectedKeys.length === 0) {
      setError("산출물을 1개 이상 선택해주세요.");
      return;
    }
    setError("");
    setResult("");
    setCompletedSteps([]);
    setActiveStep("analyze");
    setRunning(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // 분석 단계는 즉시 완료 처리 (실제 LLM 호출은 full-package에서 한 번에)
      await new Promise(r => setTimeout(r, 250));
      setCompletedSteps(["analyze"]);
      setActiveStep(selectedKeys[0]);

      let collected = "";
      const userInput: Record<string, string> = {
        project,
        runtime,
        platform,
        target,
        tone,
        pov,
      };
      if (logline.trim()) userInput.logline = logline.trim();
      if (story.trim())   userInput.story = story.trim();

      await streamAgent({
        body: {
          mode: "full-package",
          idea: logline.trim() || story.trim() || project,
          genreLetter,
          fast: false, // 패키지는 깊이 — Opus
          userInput,
          artifactKeys: selectedKeys,
        },
        signal: ac.signal,
        onDelta: (chunk) => {
          collected += chunk;
          setResult(prev => prev + chunk);

          // 산출물 헤더 감지 → 진행 표시 갱신
          for (const k of selectedKeys) {
            if (completedSteps.includes(k)) continue;
            const name = ITEMS.find(i => i.k === k)?.name;
            if (name && collected.includes(name)) {
              setActiveStep(prev => {
                if (prev === k) return prev;
                if (prev && prev !== "analyze") {
                  setCompletedSteps(cs => cs.includes(prev) ? cs : [...cs, prev]);
                }
                return k;
              });
            }
          }
        },
        onError: (msg) => {
          setError(msg);
        },
        onDone: () => {
          setActiveStep("");
          setCompletedSteps(["analyze", ...selectedKeys]);
        },
      });
    } catch {
      // streamAgent 안에서 onError 처리됨
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
    setActiveStep("");
  };

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — PLAN PACKAGE"
        title='기획 <em style="font-style:italic">패키지</em>'
        sub="의뢰 한 번으로 트리트먼트 · 시놉시스 · 캐릭터 시트 · 구성안 · 씬 리스트 · 피치덱까지 한 번에."
      />

      <div className="hero-callout">
        <div className="hero-callout-num">{String(selectedKeys.length).padStart(2, "0")}</div>
        <div className="hero-callout-text">
          <div className="hero-callout-title">한 번 의뢰하면 {selectedKeys.length}종 산출물</div>
          <div className="hero-callout-sub">
            매체에 맞춰 표준 포맷(한글·워드·엑셀·PPT)으로 자동 생성됩니다. 작가는 검토하고 다듬는 데에만 집중하세요.
          </div>
        </div>
        <Btn kind="coral" icon={I.spark} onClick={generate} disabled={running || selectedKeys.length === 0}>
          {running ? "생성 중…" : "의뢰 시작"}
        </Btn>
      </div>

      <div className="process-flow">
        {steps.map(s => (
          <div key={s.key} className={"process-step " + s.state}>
            <div className="process-step-num">
              {s.state === "done" ? <span style={{ display: "inline-flex", width: 10, height: 10, color: "#fff" }}>{I.check}</span> : s.n}
            </div>
            <span className="process-step-text">{s.label}</span>
          </div>
        ))}
      </div>

      <SectionHead num={1} title="작품 정보" sub="매체와 장르부터 정해주세요. 이후 모든 산출물에 적용됩니다." />

      <div className="form-grid">
        <Field label="매체" required>
          <select className="field-select" value={genreLetter} onChange={e => setGenreLetter(e.target.value)} disabled={running}>
            {GENRES.map(g => (
              <option key={g.letter} value={g.letter}>{g.letter}. {g.name} ({g.sub})</option>
            ))}
          </select>
        </Field>
        <Field label="작품명" required help="저장과 다운로드 파일명에 사용됩니다.">
          <input className="field-input" placeholder="예: 트랑로제" value={project} onChange={e => setProject(e.target.value)} disabled={running} />
        </Field>
        <Field label="러닝타임 / 분량" help="매체 표준에 자동 맞춤됩니다.">
          <input className="field-input" value={runtime} onChange={e => setRuntime(e.target.value)} disabled={running} />
        </Field>
        <Field label="편성·플랫폼">
          <input className="field-input" value={platform} onChange={e => setPlatform(e.target.value)} disabled={running} />
        </Field>
      </div>

      <SectionHead num={2} title="이야기 핵심" sub="자유롭게. 한 문장도 좋고, 한 페이지도 좋습니다." />

      <div className="form-grid cols-1">
        <Field label="이야기 한 줄" help="아직 정해지지 않았다면 비워두세요. SUNNY가 제안합니다.">
          <input className="field-input" placeholder='예: "30대 직장인 여성이 옛 연인의 결혼식에서 첫사랑을 다시 만난다"' value={logline} onChange={e => setLogline(e.target.value)} disabled={running} />
        </Field>
        <Field label="구체적인 내용·욕망·세계관">
          <textarea className="field-textarea script" rows={6} placeholder="머릿속의 이미지·대사·인물 단편을 자유롭게 적어주세요. 정리되어 있지 않아도 좋습니다." value={story} onChange={e => setStory(e.target.value)} disabled={running} />
        </Field>
      </div>

      <div className="form-grid cols-3">
        <Field label="타겟"><input className="field-input" value={target} onChange={e => setTarget(e.target.value)} disabled={running} /></Field>
        <Field label="톤"><input className="field-input" value={tone} onChange={e => setTone(e.target.value)} disabled={running} /></Field>
        <Field label="시점"><input className="field-input" value={pov} onChange={e => setPov(e.target.value)} disabled={running} /></Field>
      </div>

      <SectionHead
        num={3}
        title="산출물 선택"
        sub="기본 4종이 선택돼 있습니다. 필요한 것만 켜고 끄세요."
        right={<span style={{ fontSize: 12, color: "var(--ink-4)" }}>{selectedKeys.length} / 6 선택됨</span>}
      />

      <div className="output-grid">
        {ITEMS.map(it => (
          <div key={it.k} className="output-item" data-on={outputs[it.k]} onClick={() => toggle(it.k)}>
            <div className="output-check">{I.check}</div>
            <div>
              <div className="output-name">{it.name}</div>
              <div className="output-meta">{it.meta}</div>
            </div>
            <div className="output-spec">{it.spec}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Btn kind="coral" icon={I.spark} onClick={generate} disabled={running || selectedKeys.length === 0}>
          {running ? "생성 중…" : "패키지 생성"}
        </Btn>
        {running && <Btn onClick={stop}>중지</Btn>}
        <Btn icon={I.save} disabled>임시 저장</Btn>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-4)" }}>
          {running
            ? `진행 — ${activeStep ? STEP_LABEL[activeStep] : "준비 중"} (${completedSteps.filter(s => s !== "analyze").length}/${selectedKeys.length})`
            : "예상 소요 시간 — 약 2~3분"}
        </span>
      </div>

      {error && (
        <div style={{
          marginTop: 16,
          padding: "12px 16px",
          background: "var(--coral-soft)",
          border: "1px solid rgba(238,110,85,0.3)",
          borderRadius: 10,
          color: "var(--coral-deep)",
          fontSize: 13,
        }}>
          ⚠ {error}
        </div>
      )}

      {(result || running) && (
        <>
          <SectionHead num={4} title="패키지 결과" sub={`선택한 ${selectedKeys.length}종 산출물이 한 번에 흘러나옵니다 — ${selectedNames.join(" · ")}`} />
          <article style={{
            background: "var(--card)",
            border: "1px solid " + (running ? "var(--coral)" : "var(--line)"),
            borderRadius: 14,
            padding: "24px 26px",
            minHeight: 200,
          }}>
            <div style={{
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-display)",
              fontSize: 14, lineHeight: 1.8,
              color: "var(--ink-2)",
            }}>
              {result || (running ? "…" : "")}
            </div>
          </article>
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <Tip>
          작가의 의도가 충분히 적힐수록 결과물이 정확해집니다. 한 줄로 시작해서 작업하면서 채워도 됩니다.
        </Tip>
      </div>

      <div style={{ height: 60 }}></div>
    </main>
  );
}
