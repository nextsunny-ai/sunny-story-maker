"use client";

import { useEffect, useRef, useState } from "react";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Btn } from "@/components/ui";
import { GENRES } from "@/lib/genres";
import type { TargetPersona } from "@/lib/storymaker/prompts";
import { KEY, usePersistedState, saveJSON } from "@/lib/persist";
import { REVIEWERS, recommendForGenre, type Reviewer } from "@/lib/storymaker/reviewers";
import { Markdown } from "@/components/Markdown";

export default function ReviewPage() {
  return (
    <AppShell>
      <ReviewMain />
    </AppShell>
  );
}

interface PersonaCard {
  id: number | string;
  reviewerId?: string;       // REVIEWERS 풀 출처 ID (중복 추가 방지)
  libraryPersonaId?: number | string;  // 라이브러리 페르소나 출처 ID (중복 추가 방지)
  name: string;
  tags: string[];
  on: boolean;
  likes: string;     // → loves
  dislikes: string;  // → hates
  lens: string;      // → voice_tone (시각/말투)
  age?: string;
  gender?: string;
  lifestyle?: string;
  preference?: string;
  consumption?: string;
}

// 라이브러리 카드용 — library/page.tsx의 LibraryPersona와 동일 구조
interface LibraryPersonaLite {
  id: number | string;
  name: string;
  tags: string[];
  used: number;
  likes?: string;
  dislikes?: string;
  lens?: string;
  age?: string;
  gender?: string;
  lifestyle?: string;
  preference?: string;
  consumption?: string;
}

// 고정 default 제거 — 작가가 매체 선택하면 풀(20명)에서 추천 4명 자동.
// 작가가 모달에서 직접 추가/제거 (토글) 가능.
const DEFAULT_PERSONAS: PersonaCard[] = [];

function toTargetPersona(p: PersonaCard): TargetPersona {
  return {
    name: p.name,
    age: p.age,
    gender: p.gender,
    lifestyle: p.lifestyle,
    preference: p.preference,
    consumption: p.consumption,
    loves: p.likes,
    hates: p.dislikes,
    voice_tone: p.lens,
  };
}

interface ReviewResult {
  personaName: string;
  text: string;
  done: boolean;
}

function ReviewMain() {
  const I = ICONS;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----- 본문/업로드 -----
  const [text, setText] = usePersistedState<string>(KEY.reviewText, "");
  const [uploadStatus, setUploadStatus] = useState<{
    kind: "idle" | "loading" | "error" | "ok"; message?: string;
  }>({ kind: "idle" });

  // ----- 매체/작품명 -----
  const [genreLetter, setGenreLetter] = usePersistedState<string>(KEY.reviewGenre, "A");
  const [title, setTitle] = usePersistedState<string>(KEY.reviewTitle, "");

  // ----- 페르소나 -----
  const [personas, setPersonas] = usePersistedState<PersonaCard[]>(KEY.reviewPersonas, DEFAULT_PERSONAS);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDraft, setCustomDraft] = useState({
    name: "", tags: "", likes: "", dislikes: "", lens: "",
  });

  // ----- 리뷰어 리스트 모달 -----
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  // ----- 라이브러리 페르소나 (사용자가 만든 커스텀) -----
  const [libraryPersonas] = usePersistedState<LibraryPersonaLite[]>(KEY.libraryPersonas, []);

  const libraryPersonaToCard = (lp: LibraryPersonaLite): PersonaCard => ({
    id: `lib-${lp.id}`,
    libraryPersonaId: lp.id,
    name: lp.name,
    tags: lp.tags || [],
    on: true,
    likes: lp.likes || "(없음)",
    dislikes: lp.dislikes || "(없음)",
    lens: lp.lens || "자연스러운 평가 시각",
    age: lp.age,
    gender: lp.gender,
    lifestyle: lp.lifestyle,
    preference: lp.preference,
    consumption: lp.consumption,
  });

  const addLibraryPersona = (lp: LibraryPersonaLite) => {
    setPersonas(prev => {
      if (prev.some(p => p.libraryPersonaId === lp.id)) return prev;
      return [...prev, libraryPersonaToCard(lp)];
    });
  };

  const removeLibraryPersonaFromActive = (libraryPersonaId: number | string) => {
    setPersonas(prev => prev.filter(p => p.libraryPersonaId !== libraryPersonaId));
  };

  const filteredLibraryPersonas = libraryPersonas.filter(lp => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      lp.name.toLowerCase().includes(q) ||
      (lp.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (lp.likes || "").toLowerCase().includes(q) ||
      (lp.lens || "").toLowerCase().includes(q)
    );
  });

  const reviewerToCard = (r: Reviewer): PersonaCard => ({
    id: r.id,
    reviewerId: r.id,
    name: r.name,
    tags: r.preference.split("·").map(t => t.trim()).filter(Boolean).slice(0, 3),
    on: true,
    likes: r.loves,
    dislikes: r.hates,
    lens: r.voice_tone,
    age: r.age,
    gender: r.gender,
    lifestyle: `${r.location} · ${r.occupation}`,
    preference: r.preference,
    consumption: r.consumption,
  });

  const addReviewerFromLibrary = (r: Reviewer) => {
    setPersonas(prev => {
      if (prev.some(p => p.reviewerId === r.id)) return prev;
      return [...prev, reviewerToCard(r)];
    });
  };

  // 모달에서 "추가됨" 카드 클릭 시 제거 (토글)
  const removeReviewerFromActive = (reviewerId: string) => {
    setPersonas(prev => prev.filter(p => p.reviewerId !== reviewerId));
  };

  // 매체 변경 시 추천 4명 자동 채움 (작가가 활성 리뷰어 모두 비웠을 때만)
  useEffect(() => {
    if (personas.length === 0) {
      const recommended = recommendForGenre(genreLetter, 4);
      setPersonas(recommended.map(reviewerToCard));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreLetter]);

  const filteredReviewers = REVIEWERS.filter(r => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.preference.toLowerCase().includes(q) ||
      r.loves.toLowerCase().includes(q)
    );
  });

  const recommended = recommendForGenre(genreLetter, 4);
  const recommendedIds = new Set(recommended.map(r => r.id));

  // ----- 리뷰 실행 -----
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [unifiedReview, setUnifiedReview] = useState<string>("");
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);

  // 마지막 리뷰 결과 복원 (페이지 재진입 시 보존)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY.reviewLastResult);
      if (raw) setUnifiedReview(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // 리뷰 결과 자동 저장
  useEffect(() => {
    if (unifiedReview) saveJSON(KEY.reviewLastResult, unifiedReview);
  }, [unifiedReview]);

  const selectedPersonas = personas.filter(p => p.on);

  const togglePersona = (id: number | string) => {
    setPersonas(prev => prev.map(p => p.id === id ? { ...p, on: !p.on } : p));
  };

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
      setText(prev => (prev ? prev + "\n\n" : "") + json.text);
      setUploadStatus({ kind: "ok", message: `${json.meta.filename} — ${json.meta.chars.toLocaleString()}자 추가됨` });
    } catch (err) {
      setUploadStatus({ kind: "error", message: err instanceof Error ? err.message : "네트워크 오류" });
    }
  };

  const addCustomPersona = () => {
    const name = customDraft.name.trim();
    if (!name) {
      alert("리뷰어 이름을 입력해 주세요.");
      return;
    }
    const newPersona: PersonaCard = {
      id: Date.now(),
      name,
      tags: customDraft.tags.split(",").map(t => t.trim()).filter(Boolean),
      on: true,
      likes: customDraft.likes || "(없음)",
      dislikes: customDraft.dislikes || "(없음)",
      lens: customDraft.lens || "자연스러운 평가 시각",
    };
    setPersonas(prev => [...prev, newPersona]);
    setCustomDraft({ name: "", tags: "", likes: "", dislikes: "", lens: "" });
    setShowCustomForm(false);
  };

  const onLibrary = () => {
    setShowLibrary(true);
  };

  const onRunReview = async () => {
    if (!text.trim()) {
      alert("시나리오 본문을 붙여넣거나 파일을 업로드해 주세요.");
      return;
    }
    if (selectedPersonas.length === 0) {
      alert("리뷰어를 1명 이상 선택해 주세요.");
      return;
    }

    setReviewing(true);
    setReviewError(null);
    setUnifiedReview("");
    setReviewResults(selectedPersonas.map(p => ({
      personaName: p.name, text: "", done: false,
    })));

    try {
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "targeted-review",
          text,
          targets: selectedPersonas.map(toTargetPersona),
          genreLetter,
          fast: (await import("@/lib/storymaker/model-prefs")).isFastModel("review"),
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `리뷰 요청 실패 (HTTP ${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.split("\n");
          let eventName = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventName = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr += line.slice(6);
          }
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (eventName === "delta" && typeof data.text === "string") {
              setUnifiedReview(prev => prev + data.text);
            } else if (eventName === "error") {
              throw new Error(data.message || "스트림 오류");
            } else if (eventName === "done") {
              setReviewResults(prev => prev.map(r => ({ ...r, done: true })));
            }
          } catch {
            // JSON parse 실패 — 무시 (incomplete chunk)
          }
        }
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "리뷰 생성 실패");
    } finally {
      setReviewing(false);
    }
  };

  // 리뷰어별 split — "## 🎯 타겟 N: <이름>" 헤딩으로 분리
  const splitByReviewer = (text: string): Array<{ name: string; body: string }> => {
    const sections: Array<{ name: string; body: string }> = [];
    // "## 🎯 타겟 N: ..." 또는 "### 타겟: ..." 패턴 모두 인식
    const re = /^##+\s*(?:🎯\s*)?타겟[\s:]*(?:\d+[\s:]*)?[:.]*\s*(.+?)\s*(?:의\s*리뷰지)?$/gm;
    const matches: Array<{ name: string; index: number; matchLen: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({ name: m[1].trim(), index: m.index, matchLen: m[0].length });
    }
    if (matches.length === 0) return [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      sections.push({
        name: matches[i].name,
        body: text.slice(start, end).trim(),
      });
    }
    return sections;
  };

  const buildHeader = (kind: "통합" | "익명" | string, withReviewerList = true): string => {
    const safeTitle = title.trim() || "리뷰";
    const stamp = new Date().toISOString().slice(0, 10);
    const mediumName = GENRES.find(g => g.letter === genreLetter)?.name ?? "";
    const reviewerList = withReviewerList
      ? `## 리뷰어 (${selectedPersonas.length}명)\n${selectedPersonas.map(p => `- ${p.name}`).join("\n")}\n\n`
      : "";
    return `# ${safeTitle} — ${kind === "통합" ? "다중 타겟 리뷰 (통합표)" : kind === "익명" ? "다중 타겟 리뷰 (익명)" : `리뷰 — ${kind}`}\n` +
      `> 생성일: ${stamp}  |  분석 매체: ${mediumName}\n\n` +
      reviewerList;
  };

  const baseFilename = (suffix: string): string => {
    const safeTitle = title.trim() || "리뷰";
    const stamp = new Date().toISOString().slice(0, 10);
    return `${safeTitle}_review_${suffix}_${stamp}`;
  };

  // 통합 — 리뷰어 정보 포함 (작가용)
  const onSaveAll = async (format: "docx" | "txt") => {
    if (!unifiedReview) return;
    const md = buildHeader("통합", true) + unifiedReview;
    const { exportDocument } = await import("@/lib/storymaker/export");
    await exportDocument(md, baseFilename("통합"), format);
  };

  // 개별 리뷰어 — 한 명만
  const onSaveOne = async (reviewerName: string, format: "docx" | "txt") => {
    if (!unifiedReview) return;
    const sections = splitByReviewer(unifiedReview);
    const found = sections.find(s => s.name.includes(reviewerName) || reviewerName.includes(s.name));
    if (!found) {
      alert(`"${reviewerName}" 섹션을 리뷰 결과에서 찾지 못했습니다.\n전체 다운로드를 시도해주세요.`);
      return;
    }
    const md = buildHeader(reviewerName, false) + found.body;
    const safeName = reviewerName.replace(/[\\/:*?"<>|]/g, "_").slice(0, 30);
    const { exportDocument } = await import("@/lib/storymaker/export");
    await exportDocument(md, baseFilename(safeName), format);
  };

  // 리뷰어별 섹션 (화면 표시용 + 개별 다운로드용)
  const reviewerSections = unifiedReview ? splitByReviewer(unifiedReview) : [];

  // 결과 화면 탭 — 통합 / 리뷰어별 (페르소나 이름 자체가 익명이라 별도 익명 탭 X)
  const [resultTab, setResultTab] = useState<string>("all");

  // 활성 탭의 표시 텍스트
  const displayedText = (() => {
    if (resultTab === "all") return unifiedReview;
    const found = reviewerSections.find(s => s.name === resultTab);
    return found ? found.body : unifiedReview;
  })();

  // 탭 다운로드 (활성 탭에 맞춰)
  const onSaveCurrent = async (format: "docx" | "txt") => {
    if (resultTab === "all") return onSaveAll(format);
    return onSaveOne(resultTab, format);
  };

  return (
    <main className="main">
      <Topbar
        eyebrow="REVIEW — MULTI-PERSONA"
        title='리뷰<span class="dot">.</span>'
        sub="배급사가 작가에게 보내는 다중 타겟 리뷰를 시뮬레이션. 연령·라이프스타일·취향별로 별도 의견을 즉시 받습니다."
      />

      <div className="hero-callout">
        <div className="hero-callout-num">
          {selectedPersonas.length || 0}
          <span style={{ fontSize: 28, color: "var(--ink-3)", fontStyle: "italic" }}>×</span>
        </div>
        <div className="hero-callout-text">
          <div className="hero-callout-title">왜 다중 타겟인가</div>
          <div className="hero-callout-sub">
            한 명의 의견은 편향됩니다. 여러 명이 동시에 보면 작품의 약점·강점이 입체적으로 드러납니다. 작가가 가장 궁금한 영역만 골라 즉시 무한 반복 가능합니다.
          </div>
        </div>
      </div>

      <SectionHead num={1} title="리뷰어 · 매체" sub="시나리오를 첨부하기 전에 누가 어떻게 볼지부터 정해두세요." />

      <div className="form-grid">
        <Field label="매체" required>
          <select
            className="field-select"
            value={genreLetter}
            onChange={e => setGenreLetter(e.target.value)}
          >
            {GENRES.map(g => (
              <option key={g.letter} value={g.letter}>
                {g.letter}. {g.name} ({g.sub})
              </option>
            ))}
          </select>
        </Field>
        <Field label="작품명 (저장용)" help="리뷰 결과 저장에 사용됩니다.">
          <input
            className="field-input"
            placeholder="작품명 입력"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Field>
      </div>

      <SectionHead
        num={2}
        title="리뷰어 선택"
        sub="여러 명을 동시에 켤 수 있습니다. 각자의 시각으로 따로 리뷰가 나옵니다."
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={onLibrary}>리뷰어 리스트</Btn>
            <Btn icon={I.plus} onClick={() => setShowCustomForm(v => !v)}>
              {showCustomForm ? "취소" : "직접 작성"}
            </Btn>
          </div>
        }
      />

      {showCustomForm && (
        <div className="output-item" style={{
          padding: "16px 18px", marginBottom: 10, display: "grid", gap: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>새 리뷰어 추가</div>
          <div className="form-grid">
            <Field label="이름" required>
              <input className="field-input" placeholder="예: 50대 주부 시청자"
                value={customDraft.name}
                onChange={e => setCustomDraft({ ...customDraft, name: e.target.value })} />
            </Field>
            <Field label="태그 (콤마 구분)" help="예: 정통드라마, 가족">
              <input className="field-input" placeholder="멜로, 드라마"
                value={customDraft.tags}
                onChange={e => setCustomDraft({ ...customDraft, tags: e.target.value })} />
            </Field>
          </div>
          <Field label="좋아함">
            <input className="field-input" placeholder="예: 가족애, 따뜻한 결말, 정통적 구성"
              value={customDraft.likes}
              onChange={e => setCustomDraft({ ...customDraft, likes: e.target.value })} />
          </Field>
          <Field label="싫어함">
            <input className="field-input" placeholder="예: 자극적 소재, 빠른 컷 편집"
              value={customDraft.dislikes}
              onChange={e => setCustomDraft({ ...customDraft, dislikes: e.target.value })} />
          </Field>
          <Field label="시각 / 평가 관점">
            <input className="field-input" placeholder="예: 가족·세대 갈등을 자기 인생 경험으로 본다"
              value={customDraft.lens}
              onChange={e => setCustomDraft({ ...customDraft, lens: e.target.value })} />
          </Field>
          <div className="btn-row">
            <Btn kind="primary" icon={I.plus} onClick={addCustomPersona}>리뷰어 추가</Btn>
            <Btn onClick={() => setShowCustomForm(false)}>닫기</Btn>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {personas.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => togglePersona(p.id)}
            className="output-item"
            data-on={p.on}
            style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto",
              gap: 16, padding: "16px 18px", alignItems: "flex-start",
              cursor: "pointer", textAlign: "left", width: "100%",
              background: "transparent", font: "inherit", color: "inherit",
            }}
          >
            <div className="output-check" style={{ marginTop: 4 }}>{I.check}</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span className="output-name" style={{ fontSize: 14 }}>{p.name}</span>
                {p.tags.map(t => <span key={t} className="chip">{t}</span>)}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.6, display: "grid", gap: 3 }}>
                <div><span style={{ color: "var(--ink-5)", marginRight: 6, fontWeight: 600 }}>좋아함</span>{p.likes}</div>
                <div><span style={{ color: "var(--ink-5)", marginRight: 6, fontWeight: 600 }}>싫어함</span>{p.dislikes}</div>
                <div><span style={{ color: "var(--ink-5)", marginRight: 6, fontWeight: 600 }}>관점</span>{p.lens}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{p.on ? "리뷰 ON" : "꺼짐"}</div>
          </button>
        ))}
      </div>

      <SectionHead num={3} title="작품 첨부" sub="텍스트 붙여넣기 또는 파일 업로드 — PDF · Word(.docx) · 텍스트(.txt) 지원." />

      <div className="form-grid cols-1">
        <Field label="시나리오 본문" help={text ? `${text.length.toLocaleString()}자` : undefined}>
          <textarea
            className="field-textarea script"
            rows={8}
            placeholder="시나리오 전체 또는 일부를 붙여넣어 주세요. 회차 단위, 또는 한 씬 단위도 가능합니다."
            value={text}
            onChange={e => setText(e.target.value)}
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
          {uploadStatus.kind === "ok" && <span>✓ {uploadStatus.message} (텍스트 영역 끝에 추가됨)</span>}
          {uploadStatus.kind === "error" && <span>⚠ {uploadStatus.message}</span>}
        </div>
      )}

      <div className="btn-row">
        <Btn kind="coral" icon={I.spark} onClick={onRunReview} disabled={reviewing}>
          {reviewing ? "리뷰 생성 중…" : "리뷰 받기"}
        </Btn>
        <Btn icon={I.download} onClick={onPickFile} disabled={reviewing}>파일 업로드</Btn>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-4)" }}>
          선택된 리뷰어 — {selectedPersonas.length}명
        </span>
      </div>

      {(reviewing || unifiedReview || reviewError) && (
        <>
          <SectionHead
            num={4}
            title="리뷰 결과"
            sub={reviewing
              ? `${selectedPersonas.length}명의 리뷰어가 작품을 평가하고 있습니다…`
              : reviewError
                ? "오류가 발생했습니다."
                : "각 리뷰어의 시각에서 본 평가입니다."}
            right={
              !reviewing && unifiedReview && !reviewError ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Btn icon={I.spark} onClick={onRunReview}>다시 리뷰</Btn>
                  <Btn kind="primary" icon={I.save} onClick={() => onSaveCurrent("docx")}>현재 워드</Btn>
                  <Btn icon={I.save} onClick={() => onSaveCurrent("txt")}>현재 txt</Btn>
                </div>
              ) : null
            }
          />

          {reviewError && (
            <div style={{
              padding: "14px 18px", borderRadius: 10, marginBottom: 12,
              background: "var(--coral-soft)", color: "var(--coral-deep)",
              border: "1px solid var(--coral)", fontSize: 13,
            }}>
              ⚠ {reviewError}
            </div>
          )}

          <div style={{
            display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap",
          }}>
            {selectedPersonas.map(p => (
              <span key={p.id} className="chip">
                {p.name}
              </span>
            ))}
          </div>

          {/* 리뷰어별 다운로드 (개별) */}
          {!reviewing && reviewerSections.length > 0 && (
            <div style={{
              marginBottom: 16, padding: "12px 16px",
              background: "var(--card-soft)", border: "1px solid var(--line)",
              borderRadius: 10, fontSize: 12.5, color: "var(--ink-3)",
            }}>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "var(--ink-2)" }}>
                리뷰어별 따로 받기 ({reviewerSections.length}명)
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {reviewerSections.map((s, i) => (
                  <span key={i} style={{
                    display: "inline-flex", gap: 4, alignItems: "center",
                    padding: "4px 8px", borderRadius: 6,
                    background: "var(--bg)", border: "1px solid var(--line)",
                  }}>
                    <span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
                      {s.name.length > 22 ? s.name.slice(0, 20) + "…" : s.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSaveOne(s.name, "docx")}
                      style={{
                        fontSize: 10.5, padding: "2px 6px",
                        background: "transparent", border: "1px solid var(--line)",
                        borderRadius: 4, cursor: "pointer", color: "var(--ink-3)",
                      }}
                      title={`${s.name} 워드 다운로드`}
                    >워드</button>
                    <button
                      type="button"
                      onClick={() => onSaveOne(s.name, "txt")}
                      style={{
                        fontSize: 10.5, padding: "2px 6px",
                        background: "transparent", border: "1px solid var(--line)",
                        borderRadius: 4, cursor: "pointer", color: "var(--ink-3)",
                      }}
                      title={`${s.name} 텍스트 다운로드`}
                    >txt</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {!reviewing && unifiedReview && (
            <div style={{
              display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap",
              padding: 4, background: "var(--card-soft)", borderRadius: 10,
              border: "1px solid var(--line)",
            }}>
              {[
                { id: "all", label: "📋 통합" },
                ...reviewerSections.map(s => ({
                  id: s.name,
                  label: `🎯 ${s.name.length > 18 ? s.name.slice(0, 16) + "…" : s.name}`,
                })),
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setResultTab(t.id)}
                  style={{
                    padding: "6px 12px", borderRadius: 6,
                    fontSize: 12, fontWeight: resultTab === t.id ? 600 : 400,
                    background: resultTab === t.id ? "var(--bg)" : "transparent",
                    border: "1px solid " + (resultTab === t.id ? "var(--coral)" : "transparent"),
                    color: resultTab === t.id ? "var(--ink-1)" : "var(--ink-3)",
                    cursor: "pointer",
                  }}
                >{t.label}</button>
              ))}
            </div>
          )}

          {(unifiedReview || reviewing) && (
            <div className="output-item" style={{
              padding: "20px 22px", display: "block",
              fontSize: 13.5, lineHeight: 1.75, color: "var(--ink-2)",
              fontFamily: "var(--font-sans, ui-sans-serif), system-ui",
              maxHeight: "70vh", overflowY: "auto",
            }}>
              <Markdown text={reviewing ? unifiedReview : displayedText} />
              {reviewing && (
                <span style={{
                  display: "inline-block", width: 8, height: 16,
                  background: "var(--coral, #ee6e55)", marginLeft: 2,
                  verticalAlign: "text-bottom",
                  animation: "blink 1s steps(2) infinite",
                }} />
              )}
            </div>
          )}

          <style jsx>{`
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
          `}</style>
        </>
      )}

      <div style={{ height: 60 }}></div>

      {showLibrary && (
        <div
          onClick={() => setShowLibrary(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(20, 22, 28, 0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg, #fff)", borderRadius: 16,
              maxWidth: 920, width: "100%", maxHeight: "88vh",
              display: "flex", flexDirection: "column",
              boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
          >
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid var(--line)",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-4)", marginBottom: 4 }}>
                  REVIEWER LIBRARY
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink-1)" }}>
                  리뷰어 리스트 <span style={{ color: "var(--ink-4)", fontWeight: 400, fontSize: 14 }}>
                    · 기본 {REVIEWERS.length}명{libraryPersonas.length > 0 ? ` + 내 페르소나 ${libraryPersonas.length}명` : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.6 }}>
                  연령·라이프·취향별 정밀 설계 페르소나. 카드 클릭으로 활성 리뷰어에 추가됩니다.
                  현재 매체 <strong>{genreLetter}</strong>에 추천된 리뷰어는 별표로 표시됩니다.
                  {libraryPersonas.length > 0 && " 내가 만든 페르소나는 상단에 모입니다."}
                </div>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                aria-label="닫기"
                style={{
                  background: "transparent", border: "1px solid var(--line)",
                  borderRadius: 8, padding: "8px 14px", cursor: "pointer",
                  fontSize: 13, color: "var(--ink-2)",
                }}
              >
                닫기
              </button>
            </div>

            <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--line)" }}>
              <input
                className="field-input"
                placeholder="이름·취향·키워드로 검색 (예: 30대, 웹툰, 작가, 글로벌)"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{
              flex: 1, overflowY: "auto", padding: "16px 24px 24px",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {/* ===== 내 라이브러리 섹션 (사용자 커스텀 페르소나) ===== */}
              {filteredLibraryPersonas.length > 0 && (
                <>
                  <div style={{
                    fontSize: 11, letterSpacing: "0.18em", color: "var(--coral, #ee6e55)",
                    fontWeight: 700, marginTop: 4, marginBottom: 2,
                  }}>
                    ★ 내 라이브러리 · {libraryPersonas.length}명
                  </div>
                  {filteredLibraryPersonas.map((lp) => {
                    const already = personas.some(p => p.libraryPersonaId === lp.id);
                    return (
                      <button
                        key={`lib-${lp.id}`}
                        type="button"
                        onClick={() => {
                          if (already) removeLibraryPersonaFromActive(lp.id);
                          else addLibraryPersona(lp);
                        }}
                        className="output-item"
                        title={already ? "클릭하면 활성 리뷰어에서 제거" : "클릭하면 활성 리뷰어에 추가"}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr auto",
                          gap: 16, padding: "14px 18px", alignItems: "flex-start",
                          cursor: "pointer",
                          textAlign: "left", width: "100%",
                          background: already ? "var(--card-soft)" : "transparent",
                          font: "inherit", color: "inherit",
                          border: "1px solid " + (already ? "var(--coral)" : "var(--line)"),
                          borderRadius: 12,
                        }}
                      >
                        <div>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            marginBottom: 6, flexWrap: "wrap",
                          }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                              color: "var(--coral, #ee6e55)",
                              padding: "2px 6px", border: "1px solid var(--coral, #ee6e55)",
                              borderRadius: 4,
                            }}>
                              내가 만든 페르소나
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>
                              {lp.name}
                            </span>
                          </div>
                          {lp.tags && lp.tags.length > 0 && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                              {lp.tags.map(t => <span key={t} className="chip">{t}</span>)}
                            </div>
                          )}
                          <div style={{
                            fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.65,
                            display: "grid", gap: 3,
                          }}>
                            <div>
                              <span style={{ color: "var(--ink-5)", marginRight: 6, fontWeight: 600 }}>좋아함</span>
                              {lp.likes || "(없음)"}
                            </div>
                            <div>
                              <span style={{ color: "var(--ink-5)", marginRight: 6, fontWeight: 600 }}>싫어함</span>
                              {lp.dislikes || "(없음)"}
                            </div>
                            <div style={{ marginTop: 4, paddingTop: 6, borderTop: "1px dashed var(--line)" }}>
                              <span style={{ color: "var(--ink-5)", marginRight: 6, fontWeight: 600 }}>관점</span>
                              <span style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>
                                {lp.lens || "자연스러운 평가 시각"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 600,
                          color: already ? "var(--ink-4)" : "var(--coral, #ee6e55)",
                          whiteSpace: "nowrap", marginTop: 4,
                        }}>
                          {already ? "✓ 빼기" : "+ 추가"}
                        </div>
                      </button>
                    );
                  })}
                  <div style={{
                    fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-4)",
                    fontWeight: 700, marginTop: 14, marginBottom: 2,
                    paddingTop: 10, borderTop: "1px dashed var(--line)",
                  }}>
                    기본 리뷰어 풀 · {REVIEWERS.length}명
                  </div>
                </>
              )}

              {/* ===== 기본 REVIEWERS 풀 ===== */}
              {filteredReviewers.length === 0 && filteredLibraryPersonas.length === 0 ? (
                <div style={{
                  padding: "40px 20px", textAlign: "center",
                  color: "var(--ink-3)", fontSize: 13,
                }}>
                  검색 결과가 없습니다.
                </div>
              ) : (
                filteredReviewers.map((r) => {
                  const already = personas.some(p => p.reviewerId === r.id);
                  const isRecommended = recommendedIds.has(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        if (already) removeReviewerFromActive(r.id);
                        else addReviewerFromLibrary(r);
                      }}
                      className="output-item"
                      title={already ? "클릭하면 활성 리뷰어에서 제거" : "클릭하면 활성 리뷰어에 추가"}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr auto",
                        gap: 16, padding: "14px 18px", alignItems: "flex-start",
                        cursor: "pointer",
                        textAlign: "left", width: "100%",
                        background: already ? "var(--card-soft)" : "transparent",
                        font: "inherit", color: "inherit",
                        border: "1px solid " + (already ? "var(--coral)" : "var(--line)"),
                        borderRadius: 12,
                      }}
                    >
                      <div>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8,
                          marginBottom: 6, flexWrap: "wrap",
                        }}>
                          {isRecommended && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                              color: "var(--coral, #ee6e55)",
                              padding: "2px 6px", border: "1px solid var(--coral, #ee6e55)",
                              borderRadius: 4,
                            }}>
                              ★ {genreLetter} 추천
                            </span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>
                            {r.name}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                          <span className="chip">{r.age}</span>
                          <span className="chip">{r.gender}</span>
                          <span className="chip">{r.location}</span>
                          <span className="chip">{r.occupation}</span>
                        </div>
                        <div style={{
                          fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.65,
                          display: "grid", gap: 3,
                        }}>
                          <div>
                            <span style={{ color: "var(--ink-5)", marginRight: 6, fontWeight: 600 }}>좋아함</span>
                            {r.loves}
                          </div>
                          <div>
                            <span style={{ color: "var(--ink-5)", marginRight: 6, fontWeight: 600 }}>싫어함</span>
                            {r.hates}
                          </div>
                          <div style={{ marginTop: 4, paddingTop: 6, borderTop: "1px dashed var(--line)" }}>
                            <span style={{ color: "var(--ink-5)", marginRight: 6, fontWeight: 600 }}>관점</span>
                            <span style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{r.voice_tone}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        color: already ? "var(--ink-4)" : "var(--coral, #ee6e55)",
                        whiteSpace: "nowrap", marginTop: 4,
                      }}>
                        {already ? "✓ 빼기" : "+ 추가"}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div style={{
              padding: "14px 24px", borderTop: "1px solid var(--line)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--card-soft)",
            }}>
              <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
                활성 리뷰어 — {personas.filter(p => p.on).length}명
              </span>
              <Btn kind="primary" onClick={() => setShowLibrary(false)}>완료</Btn>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
