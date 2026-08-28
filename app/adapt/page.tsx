"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES, isLaunchGenre } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Btn } from "@/components/ui";
import { AdaptSameMode, type ToneChip, type AdaptVersion } from "@/components/AdaptSameMode";
import { AdaptCrossMode, type AdaptScore } from "@/components/AdaptCrossMode";
import { LibraryPicker } from "@/components/LibraryPicker";
import { KEY, usePersistedState, loadJSON, saveJSON, type WorkConversation } from "@/lib/persist";
import { getWorkId, appendTurns } from "@/lib/storymaker/work-id";
import { stripControlMarkers, extractManuscript, fixCommonTypos } from "@/lib/storymaker/strip-markers";
import { Markdown } from "@/components/Markdown";
import { todayStamp } from "@/lib/storymaker/export";

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

    // ★ V3.1.1 — Vercel 4.5MB 사전 차단 (= 옛 grant·write와 동일 path)
    const VERCEL_MAX = 4.5 * 1024 * 1024;
    if (file.size > VERCEL_MAX) {
      setUploadStatus({
        kind: "error",
        message: `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB / 최대 4.5MB).\n\n해결: 본문만 복사해서 아래 텍스트 칸에 붙여넣기 (= 크기 제한 X, 100% 작동).`,
      });
      return;
    }

    setUploadStatus({ kind: "loading", message: `${file.name} 분석 중…` });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });

      // ★ V3.1.1 — content-type 검증 (= Vercel platform 413 응답 = 평문 = JSON.parse 실패 방지)
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const raw = await res.text();
        let msg = `서버 응답 오류 (${res.status})`;
        if (res.status === 413 || /entity\s*too\s*large/i.test(raw)) {
          msg = `파일이 서버 제한(4.5MB)을 초과합니다.\n\n해결: 본문만 복사해서 아래 텍스트 칸에 붙여넣기.`;
        } else if (res.status >= 500) {
          msg = `서버 오류 (${res.status}). 잠시 후 재시도 또는 = 본문 붙여넣기.`;
        } else {
          msg = `${msg}: ${raw.slice(0, 150)}`;
        }
        setUploadStatus({ kind: "error", message: msg });
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setUploadStatus({ kind: "error", message: json.error || "업로드 실패" });
        return;
      }
      // ★ 같은 원고를 두 번 올리면 조용히 두 배가 되던 문제 (실측 2026-08-26)
      //   기·승·전·결처럼 나눠 올리는 경우가 있어 이어붙이기는 유지하되,
      //   이미 들어 있는 내용이면 막고, 이어붙였으면 총량을 알려준다.
      if (sourceText && sourceText.includes(json.text.slice(0, 200))) {
        setUploadStatus({
          kind: "error",
          message: `${json.meta.filename} — 이미 올린 원고입니다. 다시 올리지 않았습니다.`,
        });
        return;
      }
      // ★ 다른 작품을 올렸는데 말없이 이어붙던 문제 (실측 2026-08-27)
      //   기·승·전·결을 나눠 올리는 경우와 아예 다른 작품을 새로 여는 경우를 구분할 방법이
      //   없어서 두 작품이 한 원고로 섞였다. 각색이 섞인 원고를 읽었고,
      //   이전 작품의 각색 버전까지 새 작품 화면에 그대로 남았다. 그래서 작가에게 묻는다.
      const newTitle = file.name.replace(/\.[^.]+$/, "");
      if (sourceText.trim()) {
        const keepAppending = window.confirm(
          "이미 원고가 들어 있습니다 (" + sourceText.length.toLocaleString() + "자" +
          (sourceTitle ? " · " + sourceTitle : "") + ")." + "\n\n" +
          "[확인] 이어붙이기 — 같은 작품의 다음 부분입니다 (기·승·전·결처럼 나눠 올릴 때)\n" +
          "[취소] 새 작품으로 시작 — 지금 원고와 각색 기록을 치우고 「" + newTitle + "」로 새로 시작합니다\n\n" +
          "※ 새로 시작해도 지금 작업은 보관되며 되살릴 수 있습니다."
        );
        if (!keepAppending) {
          // 옛 작업은 지우지 않는다 — 보관해두고 알린다
          try {
            const snapshot = { savedAt: Date.now(), title: sourceTitle, text: sourceText, versions };
            saveJSON(KEY.adaptBackup, snapshot);
            setBackup(snapshot);  // 새로고침 없이도 바로 되살릴 수 있게
          } catch { /* 보관 실패해도 새 작업은 계속 */ }
          setSourceText(json.text);
          setSourceTitle(newTitle);
          setVersions([]);
          setOpenVer(null);
          setUploadStatus({
            kind: "ok",
            message: json.meta.filename + " — 「" + newTitle + "」로 새로 시작합니다 (" +
                     json.meta.chars.toLocaleString() + "자). 이전 작업은 보관해 두었습니다.",
          });
          return;
        }
      }
      const merged = (sourceText ? sourceText + "\n\n" : "") + json.text;
      setSourceText(merged);
      if (!sourceTitle) setSourceTitle(newTitle);
      setUploadStatus({
        kind: "ok",
        message: sourceText
          ? `${json.meta.filename} — 기존 원고 뒤에 이어붙였습니다 (총 ${merged.length.toLocaleString()}자)`
          : `${json.meta.filename} — ${json.meta.chars.toLocaleString()}자 불러왔습니다`,
      });
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

  // 버전 누적 (대표님이 본문 입력 시 v1 = 원본 자동 생성, 디렉션마다 v2/v3/... 누적)
  // ★ 각색 결과도 저장한다. 옛엔 화면 state 뿐이라
  //   2~3분 기다려 받은 변환본이 새로고침 한 번에 사라졌다 (실측 2026-08-26).
  const [versions, setVersions] = usePersistedState<AdaptVersion[]>(KEY.adaptVersions, []);
  // 새 작품으로 시작하며 보관해 둔 이전 작업 — 되살릴 수 있게 배너로 알린다
  const [backup, setBackup] = useState<{ savedAt: number; title: string; text: string; versions: AdaptVersion[] } | null>(null);
  useEffect(() => {
    const b = loadJSON<{ savedAt: number; title: string; text: string; versions: AdaptVersion[] } | null>(KEY.adaptBackup, null);
    if (b && b.text) setBackup(b);
  }, []);
  const [crossDirection, setCrossDirection] = usePersistedState<string>(KEY.adaptCrossDirection, "");
  const [dropIntro, setDropIntro] = usePersistedState<boolean>(KEY.adaptDropIntro, false);
  const [adapting, setAdapting] = useState(false);
  // 각색은 1~2분 걸린다 — 작가가 중간에 그만둘 수 있어야 한다
  const adaptAbortRef = useRef<AbortController | null>(null);
  const stopAdapt = () => {
    adaptAbortRef.current?.abort();
    adaptAbortRef.current = null;
    setAdapting(false);
    setAdaptError("중지했습니다. 지금까지 나온 부분은 그대로 있습니다.");
  };
  const [adaptError, setAdaptError] = useState<string | null>(null);
  // ★ V3.1.1 — 2단계 path 진행 상태 + Haiku 분석 결과 (작가 인지·재활용)
  const [adaptStage, setAdaptStage] = useState<"idle" | "analyzing" | "converting" | "polishing">("idle");
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
    if (adapting) return;
    // ★ 원고가 너무 짧으면 AI가 "원본 데이터 불완전" 안내문을 내고, 그게 각색 버전으로 남는다
    //   (실측 2026-08-27: 27자 원고 → 거절문 873자가 v4 로 저장됨). 시작 전에 막는다.
    const MIN_SOURCE = 200;
    if (sourceText.trim().length < MIN_SOURCE) {
      setAdaptError(
        `각색하려면 원고가 조금 더 필요합니다 (지금 ${sourceText.trim().length}자 / 최소 ${MIN_SOURCE}자).
` +
        `시나리오 본문이나 트리트먼트를 올리거나 붙여넣어 주세요.`
      );
      return;
    }
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
      const ac = new AbortController();
      adaptAbortRef.current = ac;
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        signal: ac.signal,
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
      const cleanRevised = fixCommonTypos(stripControlMarkers(body));
      setVersions(prev => [...prev, {
        v: nextV, date, label: `각색 v${nextV}`,
        brief: direction.split("\n")[0].slice(0, 30),
        direction,
        diff: `${cleanRevised.length.toLocaleString()}자 — 디렉션: ${direction.slice(0, 60)}…`,
        body: cleanRevised,
      }]);
      setOpenVer(nextV); // ★ 변환 결과 바로 펼쳐 보여주기
      setActiveChips([]);
      setFreeform("");
    } catch (e) {
      // 작가가 「중지」를 눌렀을 때는 오류가 아니다 (안내 문구를 덮어쓰지 않는다)
      if ((e as Error)?.name === "AbortError") return;
      setAdaptError(e instanceof Error ? e.message : "각색 실패");
    } finally {
      setAdapting(false);
    }
  };

  // ★ V3.1.1 — SSE 응답 = 텍스트로 모음 (analyze·adapt 2단계 path에서 공용)
  const streamCollect = async (body: Record<string, unknown>): Promise<string> => {
    const ac = new AbortController();
    adaptAbortRef.current = ac;
    const res = await fetch("/api/agent/stream", {
      method: "POST",
      signal: ac.signal,
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
    if (adapting) return;
    // ★ 원고가 너무 짧으면 AI가 "원본 데이터 불완전" 안내문을 내고, 그게 각색 버전으로 남는다
    //   (실측 2026-08-27: 27자 원고 → 거절문 873자가 v4 로 저장됨). 시작 전에 막는다.
    const MIN_SOURCE = 200;
    if (sourceText.trim().length < MIN_SOURCE) {
      setAdaptError(
        `각색하려면 원고가 조금 더 필요합니다 (지금 ${sourceText.trim().length}자 / 최소 ${MIN_SOURCE}자).
` +
        `시나리오 본문이나 트리트먼트를 올리거나 붙여넣어 주세요.`
      );
      return;
    }
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
        ...((() => {
          // 체크했을 때만 인트로를 뺀다. 기본은 원작 그대로.
          const parts = [dropIntro ? "인트로(원작 첫 장면)는 빼고 본편부터 시작한다." : "", crossDirection.trim()]
            .filter(Boolean);
          return parts.length ? { direction: parts.join(" ") } : {};
        })()),
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
      // ★ 각색 결과에도 문장 교정을 건다 (본문 생성과 동일 기준).
      //   옛엔 원고지(write)에만 걸려 있어 각색본에는 비문이 그대로 남았다.
      let cleanBody = fixCommonTypos(stripControlMarkers(body));
      if (cleanBody.trim().length >= 400) {
        setAdaptStage("polishing");
        try {
          const polished = fixCommonTypos(stripControlMarkers(await streamCollect({
            mode: "polish",
            text: cleanBody,
            genreLetter: targetLetter,
          })));
          const ratio = polished.length / Math.max(1, cleanBody.length);
          if (polished && ratio >= 0.7 && ratio <= 1.4) cleanBody = polished;
        } catch { /* 교정 실패 = 원문 유지 */ }
      }
      setVersions(prev => [...prev, {
        v: nextV, date, label: `${sourceGenre.name} → ${targetGenre.name}`,
        brief: `${targetGenre.name} 변환`,
        direction: `${sourceGenre.name} → ${targetGenre.name}`,
        diff: `${cleanBody.length.toLocaleString()}자 — 매체 변환`,
        body: cleanBody,
      }]);
      setOpenVer(nextV); // ★ 변환 결과 바로 펼쳐 보여주기
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
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
            {GENRES.map(g => <option key={g.letter} value={g.letter} disabled={!isLaunchGenre(g.letter)}>{g.letter}. {g.name}{isLaunchGenre(g.letter) ? "" : " — 2차 오픈 예정"}</option>)}
          </select>
        </Field>
      </div>

      <div
        className="form-grid cols-1"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={async (e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          // V3.1.1 — onFileChange와 동일 path = drag-drop도 4.5MB 사전 차단 + 친절 에러
          const VERCEL_MAX = 4.5 * 1024 * 1024;
          if (file.size > VERCEL_MAX) {
            setUploadStatus({
              kind: "error",
              message: `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB / 최대 4.5MB).\n\n해결: 본문만 복사해서 아래 텍스트 칸에 붙여넣기.`,
            });
            return;
          }
          setUploadStatus({ kind: "loading", message: `${file.name} 분석 중…` });
          try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const ct = res.headers.get("content-type") || "";
            if (!ct.includes("application/json")) {
              const raw = await res.text();
              setUploadStatus({
                kind: "error",
                message: res.status === 413 || /entity\s*too\s*large/i.test(raw)
                  ? "파일이 서버 제한(4.5MB)을 초과합니다. 본문을 텍스트 칸에 붙여넣기 권장."
                  : `서버 오류 (${res.status})`,
              });
              return;
            }
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
        }}
      >
        <Field label="원본 본문" help={sourceText ? `${sourceText.length.toLocaleString()}자` : "붙여넣기 또는 파일 끌어다 놓기 또는 = 아래 [파일 업로드] 버튼"}>
          <textarea
            className="field-textarea script"
            rows={6}
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            placeholder="시나리오를 여기에 붙여넣거나, 파일을 이 영역에 끌어다 놓으세요 (.pdf · .docx · .hwpx · .txt · 최대 4.5MB)"
          />
        </Field>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.fountain,.fdx,.hwpx"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {backup && (
        <div style={{
          marginTop: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13,
          background: "var(--card-soft)", color: "var(--ink-2)", border: "1px solid var(--line)",
          display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
        }}>
          <span>
            이전 작업이 보관돼 있습니다
            {backup.title ? ` — 「${backup.title}」` : ""} ({backup.text.length.toLocaleString()}자
            {backup.versions?.length ? ` · 각색 ${backup.versions.length}개` : ""})
          </span>
          <button type="button" onClick={() => {
            setSourceText(backup.text);
            setSourceTitle(backup.title || "");
            setVersions(backup.versions || []);
            setBackup(null);
            saveJSON(KEY.adaptBackup, null);
            setUploadStatus({ kind: "ok", message: "이전 작업을 되살렸습니다." });
          }} style={{
            marginLeft: "auto", padding: "5px 12px", fontSize: 12, cursor: "pointer",
            background: "var(--coral)", color: "#fff", border: "none", borderRadius: 6,
          }}>되살리기</button>
          <button type="button" onClick={() => setBackup(null)} style={{
            padding: "5px 12px", fontSize: 12, cursor: "pointer",
            background: "transparent", color: "var(--ink-3)", border: "1px solid var(--line)", borderRadius: 6,
          }}>닫기</button>
        </div>
      )}

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
          onStop={stopAdapt}
          onEditVersionBody={(vnum, body) => setVersions(prev => prev.map(x => x.v === vnum ? { ...x, body } : x))}
        />
      ) : (
        <>
          <AdaptCrossMode
            sourceLetter={sourceLetter}
            sourceGenre={sourceGenre}
            targetLetter={targetLetter}
            setTargetLetter={setTargetLetter}
            targetGenre={targetGenre}
            scores={adaptScores}
            sourceChars={sourceText.length}
          />
          {/* ★ 원작을 빼는 일은 체크로만 (2026-08-27 대표님 지시)
              — "누가 쓴 걸 빼겠나. 기본은 다 넣고, 빼고 싶으면 체크하게."
                그래서 기본값은 원작 그대로이고, 뺄 때만 작가가 체크한다. */}
          <label style={{
            marginTop: 16, display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, color: "var(--ink-2)", cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={dropIntro}
              onChange={e => setDropIntro(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--coral)" }}
            />
            <span>인트로(첫 장면)를 빼고 본편부터 시작</span>
            <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
              — 체크하지 않으면 원작 그대로 살립니다
            </span>
          </label>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
              작가 지시 <span style={{ color: "var(--ink-4)" }}>(선택)</span>
            </label>
            <textarea
              value={crossDirection}
              onChange={e => setCrossDirection(e.target.value)}
              placeholder="예: 인트로 빼고 본편부터 / 주인공 시점 1인칭으로 / 사투리 그대로 살려서"
              rows={2}
              style={{
                width: "100%", padding: "10px 12px", fontSize: 13, fontFamily: "inherit",
                borderRadius: 8, border: "1px solid var(--line)", background: "var(--card-soft)",
                color: "var(--ink-1)", resize: "vertical",
              }}
            />
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Btn kind="coral" icon={I.spark} onClick={handleAdaptCross} disabled={adapting}>
              {adapting ? "변환 중…" : `${sourceGenre.name} → ${targetGenre.name} 변환 시작`}
            </Btn>
            {adapting && <Btn onClick={stopAdapt}>중지</Btn>}
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
          {adaptError
            ? `⚠ ${adaptError}`
            : adapting
              ? (adaptStage === "analyzing"
                  ? "⏳ 1/3 — 원본을 읽는 중입니다 (캐릭터·복선·톤). 1~2분 걸립니다."
                  : adaptStage === "polishing"
                    ? "⏳ 3/3 — 문장을 다듬는 중입니다 (비문·조사·시제)."
                    : "⏳ 2/3 — 선택한 매체 양식으로 옮기는 중입니다.")
              : "⏳ 매체 적합도 분석 중…"}
        </div>
      )}

      {/* ★ 매체 변환 결과 본문 — 옛엔 화면에 뜨는 자리가 없어 작가가 결과를 못 봤다 (실측 2026-08-26) */}
      {mode === "cross" && displayVersions.length > 1 && !adapting && (() => {
        const last = displayVersions[displayVersions.length - 1];
        if (!last.body) return null;
        return (
          <div style={{
            marginTop: 18, padding: "20px 24px",
            background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14,
          }}>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline",
              marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--line)",
            }}>
              <strong style={{ fontSize: 15, color: "var(--ink-1)" }}>{last.label}</strong>
              <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{last.diff}</span>
            </div>
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <Markdown text={last.body} compact />
            </div>
          </div>
        );
      })()}

      {/* 결과 다운로드 + 작업실에서 이어 수정 (대표님 명시: 채팅으로 수정) */}
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
                // 원고지에는 설명 말고 **원고만** 넘긴다
                const manuscript = extractManuscript(last.body);
                const blocks = manuscript
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
                // ★ 2026-06-01 — 옛 사고: "anon" 하드코딩 → 로그인 작가는 currentUser 네임스페이스로 읽어 복원 실패.
                window.localStorage.setItem(KEY.writeProject(persistKey), JSON.stringify(snapshot));

                // 라이브러리 자동 등록
                const totalChars = manuscript.length;
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
                const libRaw = window.localStorage.getItem(KEY.libraryWorks);
                const libworks = libRaw ? JSON.parse(libRaw) : [];
                const idx = libworks.findIndex((w: { id: string }) => w.id === persistKey);
                if (idx >= 0) libworks[idx] = { ...libworks[idx], ...newWork };
                else libworks.push(newWork);
                window.localStorage.setItem(KEY.libraryWorks, JSON.stringify(libworks));

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
              const stamp = todayStamp();
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
              const stamp = todayStamp();
              const safeName = (sourceTitle || "각색") + "_v" + last.v + "_" + stamp;
              downloadTxt(`# ${sourceTitle || "각색"} v${last.v}\n${last.diff}\n\n${last.body}`, safeName);
            }}
          >텍스트</Btn>
          <Btn
            icon={I.download}
            onClick={async () => {
              // 전체 버전 합본 (v1 원본 ~ v최종)
              const { downloadDocx } = await import("@/lib/storymaker/export");
              const stamp = todayStamp();
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
