"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Btn } from "@/components/ui";
import { AdaptSameMode, type ToneChip, type AdaptVersion } from "@/components/AdaptSameMode";
import { AdaptCrossMode, type AdaptScore } from "@/components/AdaptCrossMode";
import { LibraryPicker } from "@/components/LibraryPicker";
import { KEY, usePersistedState, loadJSON, saveJSON, type WorkConversation } from "@/lib/persist";
import { getWorkId, appendTurns } from "@/lib/storymaker/work-id";

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
  const router = useRouter();

  const [mode, setMode] = useState<"same" | "cross">("same");
  const [showLibrary, setShowLibrary] = useState(false);

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

  // 같은 매체 — 디렉션 입력 (V1 원칙: 디렉션 먼저, 원본 마지막)
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [freeform, setFreeform] = useState("");
  const [openVer, setOpenVer] = useState<number | null>(null);

  const toggleChip = (id: string) =>
    setActiveChips(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);

  // 버전 누적 (사장님이 본문 입력 시 v1 = 원본 자동 생성, 디렉션마다 v2/v3/... 누적)
  const [versions, setVersions] = useState<AdaptVersion[]>([]);
  const [adapting, setAdapting] = useState(false);
  const [adaptError, setAdaptError] = useState<string | null>(null);
  // ★ V3.1.1 — 2단계 path 진행 상태 + Haiku 분석 결과 (작가 인지·재활용)
  const [adaptStage, setAdaptStage] = useState<"idle" | "analyzing" | "converting">("idle");
  const [analysisText, setAnalysisText] = useState("");

  // 본문이 있을 때만 v1 (원본)을 자동으로 보여줌
  const displayVersions = useMemo<AdaptVersion[]>(() => {
    if (!sourceText.trim()) return [];
    const today = new Date();
    const date = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    const v1: AdaptVersion = {
      v: 1, date, label: "원본",
      brief: `${sourceText.length.toLocaleString()}자`,
      direction: "—",
      diff: `초고 — ${sourceText.length.toLocaleString()}자`,
      body: sourceText,
    };
    return [v1, ...versions];
  }, [sourceText, versions]);

  // 같은 매체 각색 — AI 호출
  const handleRevise = async (direction: string) => {
    if (adapting || !sourceText.trim()) return;
    setAdapting(true);
    setAdaptError(null);
    const today = new Date();
    const date = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    const nextV = displayVersions.length + 1;
    // ★ workConversation
    const workId = sourceTitle ? getWorkId(sourceLetter, sourceTitle) : "";
    const conv = workId
      ? loadJSON<WorkConversation>(KEY.workConversation(workId), { workId, messages: [], updatedAt: 0 })
      : null;
    const userSummary = `[각색 v${nextV}] ${direction}`.slice(0, 200);
    try {
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "revise",
          text: sourceText,
          direction,
          genreLetter: sourceLetter,
          versionNumber: nextV,
          fast: (await import("@/lib/storymaker/model-prefs")).isFastModel("adapt"),
          ...(workId ? { workId } : {}),
          ...(conv ? { conversationMessages: conv.messages } : {}),
        }),
      });
      if (!res.body) throw new Error("응답 없음 (revise)");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let body = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const evt of events) {
          const lines = evt.split("\n");
          const eventType = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
          const dataLine = lines.find(l => l.startsWith("data:"))?.slice(5).trim();
          if (!dataLine) continue;
          try {
            const data = JSON.parse(dataLine);
            if (eventType === "delta" && data.text) body += data.text;
            else if (eventType === "error") throw new Error(data.message);
          } catch { /* ignore parse */ }
        }
      }
      // ★ workConversation 누적
      if (workId && conv && body.trim()) {
        const updated = appendTurns(conv, [
          { role: "user", content: userSummary },
          { role: "assistant", content: body },
        ]);
        saveJSON(KEY.workConversation(workId), {
          workId,
          messages: updated.messages,
          compactedSummary: updated.compactedSummary,
          updatedAt: Date.now(),
        });
      }
      setVersions(prev => [...prev, {
        v: nextV, date, label: `각색 v${nextV}`,
        brief: direction.split("\n")[0].slice(0, 30),
        direction,
        diff: `${body.length.toLocaleString()}자 — 디렉션: ${direction.slice(0, 60)}…`,
        body,
      }]);
      setActiveChips([]);
      setFreeform("");
    } catch (e) {
      setAdaptError(e instanceof Error ? e.message : "각색 실패");
    } finally {
      setAdapting(false);
    }
  };

  // ★ V3.1.1 — SSE 응답 = 텍스트로 모음 (analyze·adapt 2단계 path에서 공용)
  const streamCollect = async (body: Record<string, unknown>): Promise<string> => {
    const res = await fetch("/api/agent/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.body) throw new Error("응답 없음");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let collected = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split("\n\n");
      buf = events.pop() || "";
      for (const evt of events) {
        const lines = evt.split("\n");
        const eventType = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
        const dataLine = lines.find(l => l.startsWith("data:"))?.slice(5).trim();
        if (!dataLine) continue;
        try {
          const data = JSON.parse(dataLine);
          if (eventType === "delta" && data.text) collected += data.text;
          else if (eventType === "error") throw new Error(data.message);
        } catch { /* ignore parse */ }
      }
    }
    return collected;
  };

  // 다른 매체 변환 — ★ V3.1.1 2단계 path: (1) Haiku 풀 컨텍스트 분석 → (2) Opus/Sonnet 변환
  const handleAdaptCross = async () => {
    if (adapting || !sourceText.trim()) return;
    setAdapting(true);
    setAdaptError(null);
    setAdaptStage("analyzing");
    const today = new Date();
    const date = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    const nextV = displayVersions.length + 1;
    // ★ workConversation
    const workId2 = sourceTitle ? getWorkId(sourceLetter, sourceTitle) : "";
    const conv2 = workId2
      ? loadJSON<WorkConversation>(KEY.workConversation(workId2), { workId: workId2, messages: [], updatedAt: 0 })
      : null;
    const userSummary2 = `[매체 변환] ${sourceLetter} → ${targetLetter}`.slice(0, 200);
    try {
      // ★ 1단계: Haiku로 원본 풀 컨텍스트 분석 (Pro fair use = 한도 거의 무제한)
      // 영화 1편(5만자), 드라마 시즌(30만자), 소설(10만자+) 다 풀 컨텍스트로 읽기 가능.
      const analysis = await streamCollect({
        mode: "analyze",
        text: sourceText,
        genreLetter: sourceLetter,
        fast: true, // Haiku 강제
      });
      setAnalysisText(analysis);

      // ★ 2단계: Opus/Sonnet으로 변환 (분석 결과 + 본문 발췌 = 작은 입력 = 작가 한도 절약 + 풀 컨텍스트 quality)
      setAdaptStage("converting");
      const body = await streamCollect({
        mode: "adapt",
        text: sourceText,
        genreLetter: sourceLetter,
        targetGenreLetter: targetLetter,
        analysis,
        fast: false,
        ...(workId2 ? { workId: workId2 } : {}),
        ...(conv2 ? { conversationMessages: conv2.messages } : {}),
      });
      // ★ workConversation 누적
      if (workId2 && conv2 && body.trim()) {
        const updated = appendTurns(conv2, [
          { role: "user", content: userSummary2 },
          { role: "assistant", content: body },
        ]);
        saveJSON(KEY.workConversation(workId2), {
          workId: workId2,
          messages: updated.messages,
          compactedSummary: updated.compactedSummary,
          updatedAt: Date.now(),
        });
      }
      setVersions(prev => [...prev, {
        v: nextV, date, label: `${sourceGenre.name} → ${targetGenre.name}`,
        brief: `${targetGenre.name} 변환`,
        direction: `${sourceGenre.name} → ${targetGenre.name}`,
        diff: `${body.length.toLocaleString()}자 — 매체 변환`,
        body,
      }]);
    } catch (e) {
      setAdaptError(e instanceof Error ? e.message : "변환 실패");
    } finally {
      setAdapting(false);
      setAdaptStage("idle");
    }
  };

  // 다른 매체
  const [targetLetter, setTargetLetter] = useState("F"); // 웹툰
  const [adaptScores, setAdaptScores] = useState<Record<string, AdaptScore>>({});
  const [scoring, setScoring] = useState(false);

  const sourceGenre = GENRES.find(g => g.letter === sourceLetter) || GENRES[0];
  const targetGenre = GENRES.find(g => g.letter === targetLetter) || GENRES[0];

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
        <Btn icon={I.library} onClick={() => setShowLibrary(true)}>라이브러리에서 가져오기</Btn>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-4)" }}>
          {sourceTitle ? `${sourceTitle} — ${sourceLetter}. ${sourceGenre.name}` : "작품명 입력 필요"}
        </span>
      </div>

      {!sourceText.trim() ? (
        <div className="output-item" style={{
          padding: "32px 24px", marginTop: 16, textAlign: "center",
          color: "var(--ink-3)", fontSize: 14, lineHeight: 1.7,
          border: "1px dashed var(--line)", borderRadius: 14,
          background: "var(--card-soft)",
        }}>
          위에 <strong style={{ color: "var(--ink-2)" }}>원본 본문</strong>을 입력하거나 <strong style={{ color: "var(--ink-2)" }}>파일을 업로드</strong>해 주세요.
          <br />
          <span style={{ fontSize: 12.5, color: "var(--ink-4)" }}>
            각색은 원작 위에 디렉션을 얹어 새 버전을 만드는 작업입니다.
          </span>
        </div>
      ) : mode === "same" ? (
        <AdaptSameMode
          versions={displayVersions}
          openVer={openVer}
          setOpenVer={setOpenVer}
          TONE_CHIPS={TONE_CHIPS}
          activeChips={activeChips}
          toggleChip={toggleChip}
          freeform={freeform}
          setFreeform={setFreeform}
          onLaunch={handleRevise}
          busy={adapting}
        />
      ) : (
        <>
          <AdaptCrossMode
            sourceLetter={sourceLetter}
            sourceGenre={sourceGenre}
            targetLetter={targetLetter}
            setTargetLetter={setTargetLetter}
            targetGenre={targetGenre}
            targetScore={targetScore}
            rankedTargets={rankedTargets}
          />
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Btn kind="coral" icon={I.spark} onClick={handleAdaptCross} disabled={adapting}>
              {adapting ? "변환 중…" : `${sourceGenre.name} → ${targetGenre.name} 변환 시작`}
            </Btn>
          </div>
        </>
      )}

      {(adaptError || adapting || scoring) && (
        <div style={{
          marginTop: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13,
          background: adaptError ? "var(--coral-soft)" : "var(--card-soft)",
          color: adaptError ? "var(--coral-deep)" : "var(--ink-2)",
          border: "1px solid " + (adaptError ? "var(--coral)" : "var(--line)"),
        }}>
          {adaptError ? `⚠ ${adaptError}` : adapting ? "⏳ AI가 변환하는 중…" : "⏳ 매체 적합도 분석 중…"}
        </div>
      )}

      {/* 결과 다운로드 + 작업실에서 이어 수정 (사장님 명시: 채팅으로 수정) */}
      {displayVersions.length > 1 && !adapting && (
        <div className="btn-row" style={{ marginTop: 18, padding: "12px 14px",
          background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10,
          display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {/* 작업실에서 이어 수정 — 마지막 각색 버전을 /write로 핸드오프 */}
          <Btn
            kind="coral"
            icon={I.write}
            onClick={() => {
              const last = displayVersions[displayVersions.length - 1];
              if (!last.body) { alert("각색 결과가 없습니다."); return; }
              try {
                // 작품 키 = adapt:${title slice} 식 (write/page.tsx의 projectKeyFor와 호환)
                const titleForKey = (sourceTitle || "각색").slice(0, 40);
                const persistKey = `new:${sourceLetter}:${titleForKey}_v${last.v}`;
                const today = new Date();
                const updatedStr = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

                // 본문을 = paras 형태로 split (빈 줄 기준)
                const blocks = last.body
                  .split(/\n\s*\n+/)
                  .map(b => b.trim())
                  .filter(Boolean);
                const paras = blocks.map((block, i) => ({
                  id: `p_adapt_${Date.now()}_${i}`,
                  n: i + 1,
                  label: "각색",
                  text: block,
                  status: "done" as const,
                }));
                if (paras.length === 0) {
                  paras.push({
                    id: `p_adapt_${Date.now()}_0`,
                    n: 1,
                    label: "각색",
                    text: last.body,
                    status: "done" as const,
                  });
                }

                // KEY.writeProject(persistKey)에 PersistedProject 형태로 박음
                const snapshot = {
                  work: {
                    title: `${sourceTitle || "각색"} v${last.v}`,
                    chapter: last.label || `v${last.v}`,
                    elapsed: "방금 옮겨옴",
                    medium: sourceGenre.name,
                  },
                  notes: [{ id: "n_adapt", label: `각색 디렉션: ${last.direction || "—"}` }],
                  flow: [{
                    id: "f_adapt", state: "done",
                    title: "각색 완료", hint: last.diff,
                  }],
                  paras,
                  chat: [{
                    id: "m_adapt_init",
                    role: "ai",
                    text: `${sourceTitle || "원작"}을 ${last.label}로 옮겨왔습니다. 채팅으로 디렉션 주시면 본문 이어 수정하겠습니다.`,
                    t: "방금",
                  }],
                  mediumFields: {},
                  briefDone: true,
                  updatedAt: new Date().toISOString(),
                };
                window.localStorage.setItem(`sunny.write.anon.project.${persistKey}`, JSON.stringify(snapshot));

                // 라이브러리 자동 등록
                const totalChars = last.body.length;
                const newWork = {
                  id: persistKey,
                  title: `${sourceTitle || "각색"} v${last.v}`,
                  genre: sourceGenre.name,
                  letter: sourceLetter,
                  stage: "집필 중",
                  prog: Math.min(1, totalChars / 5000),
                  updated: updatedStr,
                  size: `${totalChars.toLocaleString()}자`,
                };
                const libRaw = window.localStorage.getItem("sunny.library.anon.works");
                const libworks = libRaw ? JSON.parse(libRaw) : [];
                const idx = libworks.findIndex((w: { id: string }) => w.id === persistKey);
                if (idx >= 0) libworks[idx] = { ...libworks[idx], ...newWork };
                else libworks.push(newWork);
                window.localStorage.setItem("sunny.library.anon.works", JSON.stringify(libworks));

                // /write로 redirect
                router.push(`/write?mode=continue&project=${encodeURIComponent(persistKey)}`);
              } catch (e) {
                alert("작업실로 이동 실패: " + (e instanceof Error ? e.message : ""));
              }
            }}
          >작업실에서 이어 수정 →</Btn>
          <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>
            ↓ 또는 다운로드 (v{displayVersions[displayVersions.length - 1].v})
          </span>
          <Btn
            icon={I.download}
            onClick={async () => {
              const last = displayVersions[displayVersions.length - 1];
              if (!last.body) return;
              const { downloadDocx } = await import("@/lib/storymaker/export");
              const stamp = new Date().toISOString().slice(0, 10);
              const safeName = (sourceTitle || "각색") + "_v" + last.v + "_" + stamp;
              await downloadDocx(`# ${sourceTitle || "각색"} v${last.v}\n> ${last.label} · ${last.diff}\n\n${last.body}`, safeName);
            }}
          >워드</Btn>
          <Btn
            icon={I.download}
            onClick={async () => {
              const last = displayVersions[displayVersions.length - 1];
              if (!last.body) return;
              const { downloadTxt } = await import("@/lib/storymaker/export");
              const stamp = new Date().toISOString().slice(0, 10);
              const safeName = (sourceTitle || "각색") + "_v" + last.v + "_" + stamp;
              downloadTxt(`# ${sourceTitle || "각색"} v${last.v}\n${last.diff}\n\n${last.body}`, safeName);
            }}
          >텍스트</Btn>
          <Btn
            icon={I.download}
            onClick={async () => {
              // 전체 버전 합본 (v1 원본 ~ v최종)
              const { downloadDocx } = await import("@/lib/storymaker/export");
              const stamp = new Date().toISOString().slice(0, 10);
              const md = displayVersions
                .filter(v => v.body)
                .map(v => `# ${sourceTitle || "각색"} ${v.label} (v${v.v})\n> ${v.diff}\n\n${v.body}`)
                .join("\n\n---\n\n");
              await downloadDocx(md, (sourceTitle || "각색") + "_전체버전_" + stamp);
            }}
          >전체 합본</Btn>
        </div>
      )}

      <LibraryPicker
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        title="원본 작품 가져오기"
        subtitle="라이브러리 작품을 선택하면 본문이 원본 본문 영역에 자동으로 들어옵니다."
        onPick={(work, body) => {
          setSourceTitle(work.title);
          setSourceLetter(work.letter);
          if (body) {
            setSourceText(prev => (prev ? prev + "\n\n" : "") + body);
          }
        }}
      />
    </main>
  );
}
