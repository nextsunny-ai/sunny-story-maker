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

export default function ReviewPage() {
  return (
    <AppShell>
      <ReviewMain />
    </AppShell>
  );
}

interface PersonaCard {
  id: number;
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

const DEFAULT_PERSONAS: PersonaCard[] = [
  {
    id: 1, name: "30대 도시 직장인 여성",
    tags: ["멜로", "드라마", "웹툰"], on: true,
    likes: "긴 디테일, 위로받는 결말, 캐릭터의 성장",
    dislikes: "공감 안 가는 재벌물, 비현실적 신데렐라",
    lens: "직장·연애·동거의 디테일을 기준으로 평가. 자기 또래 워킹우먼의 현실 잣대로 본다.",
    age: "30대 초중반", gender: "여성",
    lifestyle: "서울/수도권 직장인, 1인가구 또는 동거",
    preference: "현실 멜로, 캐릭터 드라마, 인기 웹툰",
    consumption: "퇴근 후 OTT, 출퇴근 웹툰",
  },
  {
    id: 2, name: "40대 남성 PD",
    tags: ["기획", "상업성"], on: true,
    likes: "기획 의도 명확, 회차 후크, 글로벌 가능성",
    dislikes: "한국 한정 소재, 1화 늘어짐",
    lens: "편성 가능성·시청률 곡선·CP 매력 — 채널 편성표를 머릿속에 깔고 본다.",
    age: "40대", gender: "남성",
    lifestyle: "방송사/제작사 기획PD",
    preference: "기획 강한 미니시리즈, 글로벌 IP 가능 작품",
    consumption: "방송사 시청률 자료, 글로벌 OTT 차트",
  },
  {
    id: 3, name: "20대 OTT 헤비유저",
    tags: ["글로벌", "빠른전개"], on: false,
    likes: "12부 단축 포맷, 첫 5분 사건, 비주얼",
    dislikes: "16부 늘어짐, 한국적 개그",
    lens: "넷플릭스·디즈니+ 알고리즘 적합성. 다른 글로벌 작품과 즉시 비교한다.",
    age: "20대", gender: "여성/남성 모두",
    lifestyle: "대학생~사회초년생, OTT 다수 구독",
    preference: "글로벌 K-드라마, 짧은 시즌제, 자극적 1화",
    consumption: "넷플릭스/디즈니+/티빙 동시 구독, 1.5배속 시청",
  },
];

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

  const togglePersona = (id: number) => {
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
    alert("라이브러리 페이지에서 페르소나 선택 — 곧 출시");
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
          fast: false,
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

  const onSaveResult = () => {
    if (!unifiedReview) return;
    const safeTitle = title.trim() || "리뷰";
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([
      `# ${safeTitle} — 다중 타겟 리뷰\n생성일: ${stamp}\n\n`,
      `## 분석 매체: ${GENRES.find(g => g.letter === genreLetter)?.name ?? ""}\n\n`,
      `## 리뷰어 (${selectedPersonas.length}명)\n`,
      ...selectedPersonas.map(p => `- ${p.name}\n`),
      `\n---\n\n`,
      unifiedReview,
    ], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}_review_${stamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
            <Btn onClick={onLibrary}>라이브러리에서</Btn>
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
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn icon={I.spark} onClick={onRunReview}>다시 리뷰</Btn>
                  <Btn kind="primary" icon={I.save} onClick={onSaveResult}>저장 (.md)</Btn>
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

          {(unifiedReview || reviewing) && (
            <div className="output-item" style={{
              padding: "20px 22px", display: "block", whiteSpace: "pre-wrap",
              fontSize: 13.5, lineHeight: 1.75, color: "var(--ink-2)",
              fontFamily: "var(--font-sans, ui-sans-serif), system-ui",
              maxHeight: "70vh", overflowY: "auto",
            }}>
              {unifiedReview}
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
    </main>
  );
}
