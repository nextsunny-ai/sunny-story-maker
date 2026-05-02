"use client";

import { useRef, useState } from "react";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Tip, Btn } from "@/components/ui";
import { streamAgent } from "@/lib/stream-agent";
import { Markdown } from "@/components/Markdown";
import { downloadDocx, downloadTxt } from "@/lib/storymaker/export";

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
  // ── 지원사업 신청서용 (정부 지원사업 / 영진위 / 콘진원 / 문진원 등) ──
  { k: "intent",     name: "기획 의도서", meta: "왜 이 작품인가 · 사회적 의의",   spec: "A4 · 한글" },
  { k: "production", name: "제작 계획",   meta: "일정·인력·예산·로케이션",       spec: "A4 · 한글" },
  { k: "bio",        name: "제출자 이력", meta: "작가 소개 · 대표 작품 · 수상",    spec: "A4 · 한글" },
  { k: "impact",     name: "예상 효과",   meta: "관객·시장·문화적 효과",         spec: "A4 · 한글" },
];

const STEP_LABEL: Record<string, string> = {
  analyze: "의뢰 분석",
  treatment: "트리트먼트",
  synopsis: "시놉시스",
  character: "캐릭터 시트",
  structure: "구성안",
  scene: "씬 리스트",
  pitch: "피치덱",
  intent: "기획 의도서",
  production: "제작 계획",
  bio: "제출자 이력",
  impact: "예상 효과",
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
  const [project, setProject] = useState("");
  const [runtime, setRuntime] = useState("");
  const [platform, setPlatform] = useState("");
  const [target, setTarget] = useState("");
  const [tone, setTone] = useState("");
  const [pov, setPov] = useState("");
  const [logline, setLogline] = useState("");
  const [story, setStory] = useState("");

  const [result, setResult] = useState("");
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // 파일 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    kind: "idle" | "loading" | "error" | "ok"; message?: string;
  }>({ kind: "idle" });

  const onPickFile = () => fileInputRef.current?.click();
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
      setStory(prev => (prev ? prev + "\n\n" : "") + json.text);
      setUploadStatus({ kind: "ok", message: `${json.meta.filename} — ${json.meta.chars.toLocaleString()}자 추가됨` });
    } catch (err) {
      setUploadStatus({ kind: "error", message: err instanceof Error ? err.message : "네트워크 오류" });
    }
  };

  // 다운로드
  const downloadName = (project || "기획_패키지") + "_" + new Date().toISOString().slice(0, 10);
  const downloadHtml = () => {
    if (!result) return;
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${project || "기획 패키지"}</title>
<style>
  body { font-family: "맑은 고딕", "Malgun Gothic", -apple-system, sans-serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.75; background: #fafaf7; }
  h1 { font-size: 28px; border-bottom: 2px solid #ee6e55; padding-bottom: 8px; margin-top: 32px; }
  h2 { font-size: 22px; margin-top: 28px; color: #2a2a2a; }
  h3 { font-size: 18px; margin-top: 22px; color: #444; }
  p { margin: 12px 0; }
  strong { color: #ee6e55; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f3ed; font-weight: 600; }
  blockquote { border-left: 4px solid #ee6e55; padding: 8px 16px; margin: 16px 0; background: #fff8f5; color: #555; }
  hr { border: none; border-top: 1px solid #ddd; margin: 32px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 6px 0; }
  code { background: #f0eee8; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  .meta { font-size: 12px; color: #888; margin-top: 60px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
</style>
</head>
<body>
<h1>${project || "기획 패키지"}</h1>
<div>${result
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^---$/gm, "<hr>")
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
}</div>
<div class="meta">Story Maker · ${new Date().toLocaleDateString("ko-KR")} 생성</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${downloadName}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

      <SectionHead num={2} title="이야기 핵심" sub="자유롭게. 한 문장도 좋고, 한 페이지도 좋습니다. 또는 PDF/DOCX 자료 업로드." />

      <div style={{
        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
        padding: "14px 16px", marginBottom: 16,
        background: "var(--card-soft)", border: "1px dashed var(--line)",
        borderRadius: 12,
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
        <Btn icon={I.upload || I.plus} onClick={onPickFile} disabled={running || uploadStatus.kind === "loading"}>
          {uploadStatus.kind === "loading" ? "분석 중…" : "자료 업로드 (PDF / DOCX / TXT)"}
        </Btn>
        {uploadStatus.message && (
          <span style={{
            fontSize: 12,
            color: uploadStatus.kind === "error" ? "var(--coral-deep)"
                 : uploadStatus.kind === "ok" ? "var(--ink-3)" : "var(--ink-4)",
          }}>
            {uploadStatus.kind === "ok" ? "✓ " : uploadStatus.kind === "error" ? "⚠ " : ""}
            {uploadStatus.message}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-5)" }}>
          업로드한 텍스트는 아래 &quot;구체적인 내용&quot;에 추가됩니다.
        </span>
      </div>

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
          <SectionHead
            num={4}
            title="패키지 결과"
            sub={`선택한 ${selectedKeys.length}종 산출물이 한 번에 흘러나옵니다 — ${selectedNames.join(" · ")}`}
            right={result && !running ? (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn icon={I.download} onClick={() => downloadDocx(result, downloadName)}>워드</Btn>
                <Btn icon={I.download} onClick={() => downloadTxt(result, downloadName)}>텍스트</Btn>
                <Btn kind="coral" icon={I.download} onClick={downloadHtml}>HTML</Btn>
              </div>
            ) : undefined}
          />
          <article style={{
            background: "var(--card)",
            border: "1px solid " + (running ? "var(--coral)" : "var(--line)"),
            borderRadius: 14,
            padding: "24px 26px",
            minHeight: 200,
          }}>
            {result
              ? <Markdown text={result} />
              : <div style={{ color: "var(--ink-4)", fontSize: 13 }}>{running ? "…" : ""}</div>}
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
