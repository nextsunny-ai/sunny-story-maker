"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Btn } from "@/components/ui";
import { getWorkflow } from "@/lib/workflows";
import {
  MediumFieldRenderer,
  buildDefaultValues,
  type FieldValues,
  type FieldValue,
} from "@/components/MediumFieldRenderer";

export default function DevelopPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <DevelopMain />
      </Suspense>
    </AppShell>
  );
}

type Phase = "brief" | "stages";

interface PreAsset {
  key: "title" | "logline" | "theme" | "synopsis" | "characters" | "structure";
  label: string;
  hint: string;
  text: string;
  status: "pending" | "active" | "done";
}

const STAGE_DEFS: Omit<PreAsset, "text" | "status">[] = [
  { key: "title",     label: "제목",       hint: "작품 제목 후보 + 한 줄 평" },
  { key: "logline",   label: "로그라인",    hint: "한 문장 핵심 컨셉" },
  { key: "theme",     label: "주제",       hint: "작품이 던지는 질문 / 메시지" },
  { key: "synopsis",  label: "시놉시스",    hint: "A4 1쪽 줄거리" },
  { key: "characters", label: "캐릭터 설정", hint: "주인공 + 핵심 인물 시트" },
  { key: "structure", label: "기승전결",    hint: "구성 (매체에 따라 3막/회차/8단 등)" },
];

function DevelopMain() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ideaParam = searchParams.get("idea") || "";
  const genreParam = searchParams.get("genre") || "A";
  const wf = getWorkflow(genreParam);

  // ─── Phase 관리 ───
  const [phase, setPhase] = useState<Phase>("brief");

  // ─── 의뢰 분석 폼 ───
  const [mediumFields, setMediumFields] = useState<FieldValues>(() =>
    buildDefaultValues(wf.fields),
  );
  const onChangeField = (key: string, value: FieldValue) => {
    setMediumFields((prev) => ({ ...prev, [key]: value }));
  };

  // ─── 사전 자료 6단계 ───
  const [stages, setStages] = useState<PreAsset[]>(
    STAGE_DEFS.map((s, i) => ({
      ...s,
      text: "",
      status: i === 0 ? "active" : "pending",
    })),
  );
  const [busyKey, setBusyKey] = useState<PreAsset["key"] | null>(null);

  // 단계별 mode 매핑 — route.ts의 mode와 일치 (다음 단계에서 실제 호출)
  const STAGE_MODE: Record<PreAsset["key"], string> = {
    title: "logline",        // 제목 + 한 줄 평 (logline에 포함되어 출력)
    logline: "logline",
    theme: "logline",        // 주제 — logline mode 안에서 함께 출력
    synopsis: "synopsis",
    characters: "characters",
    structure: "treatment",  // 기승전결 = 트리트먼트 본질
  };

  const onStageRun = async (key: PreAsset["key"]) => {
    const mode = STAGE_MODE[key];
    if (!mode) return;
    setBusyKey(key);
    setStages(prev => prev.map(s => s.key === key ? { ...s, status: "active" } : s));
    try {
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          idea: ideaParam,
          genreLetter: genreParam,
          mediumFields,
          fast: true,
        }),
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
          if (eventType === "delta" && dataLine) {
            try {
              const data = JSON.parse(dataLine);
              if (data.text) {
                collected += data.text;
                setStages(prev => prev.map(s => s.key === key ? { ...s, text: collected } : s));
              }
            } catch { /* ignore */ }
          }
        }
      }
      setStages(prev => prev.map(s => {
        if (s.key === key) return { ...s, status: "done" as const };
        // 다음 카드 active
        const idx = STAGE_DEFS.findIndex(d => d.key === key);
        const nextDef = STAGE_DEFS[idx + 1];
        if (nextDef && s.key === nextDef.key && s.status === "pending") {
          return { ...s, status: "active" as const };
        }
        return s;
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류";
      setStages(prev => prev.map(s => s.key === key ? { ...s, text: `(오류: ${msg})` } : s));
    } finally {
      setBusyKey(null);
    }
  };

  // ─── Phase 1: 의뢰 분석 폼 ───
  if (phase === "brief") {
    return (
      <main className="main">
        <Topbar
          eyebrow={`DEVELOP — ${wf.letter}. ${wf.name}`}
          title={`<em style="font-style:italic">${wf.name}</em> 프로젝트 개요<span class="dot">.</span>`}
          sub="개요를 작성하면 제목·로그라인·주제·시놉시스·캐릭터·기승전결 6단계로 사전 자료를 정리합니다. 끝나면 본문 시작 버튼으로 원고지(Write)로 넘어갑니다."
        />

        {ideaParam && (
          <div style={{
            padding: "14px 18px", marginBottom: 24,
            background: "var(--card-soft)", border: "1px solid var(--line)",
            borderRadius: 12, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 11, color: "var(--ink-5)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              한 줄 아이디어
            </div>
            {ideaParam}
          </div>
        )}

        <SectionHead num={1} title="개요 입력" sub={`${wf.name} 매체별 입력 — 표준: ${wf.export_format}`} />

        <MediumFieldRenderer
          fields={wf.fields}
          values={mediumFields}
          onChange={onChangeField}
        />

        <div style={{
          display: "flex", gap: 10, marginTop: 32, paddingTop: 24,
          borderTop: "1px solid var(--line)", alignItems: "center",
        }}>
          <Btn kind="coral" onClick={() => setPhase("stages")}>
            사전 자료 시작 →
          </Btn>
          <button
            type="button"
            className="btn"
            onClick={() => router.push("/")}
            style={{ background: "transparent", border: "1px solid var(--line)" }}
          >
            ← Home
          </button>
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--ink-5)" }}>
            사전 자료 단계: {STAGE_DEFS.length}개 → 본문 시작
          </span>
        </div>
      </main>
    );
  }

  // ─── Phase 2: 사전 자료 6단계 (placeholder — 2차에서 AI 호출 + 카드 채움) ───
  const allDone = stages.every(s => s.status === "done");
  return (
    <main className="main">
      <Topbar
        eyebrow={`DEVELOP — 사전 자료 (${wf.letter}. ${wf.name})`}
        title={`<em style="font-style:italic">기획</em> 작업 중<span class="dot">.</span>`}
        sub="6단계가 끝나면 본문 시작 버튼이 활성화됩니다. 단계마다 작가님이 컨펌하면 다음으로 넘어갑니다."
      />

      <SectionHead num={2} title="사전 자료 6단계" sub="제목 → 로그라인 → 주제 → 시놉시스 → 캐릭터 → 기승전결" />

      <div style={{ maxWidth: 1200 }}>
        {/* 사전 자료 6단계 카드 — 2차에서 AI 호출 + 응답 채울 자리 */}
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {stages.map((s, i) => (
            <div
              key={s.key}
              style={{
                padding: 20,
                border: `1px solid ${s.status === "active" ? "var(--coral)" : "var(--line)"}`,
                borderRadius: 14,
                background: s.status === "active" ? "var(--card)" : "var(--card-soft)",
                minHeight: 160,
                display: "flex", flexDirection: "column", gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "var(--ink-5)", letterSpacing: "0.1em",
                }}>
                  0{i + 1}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                  {s.label}
                </span>
                {busyKey === s.key && (
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 700,
                    color: "var(--coral)", letterSpacing: "0.1em",
                  }}>
                    AI 작성 중…
                  </span>
                )}
                {s.status === "done" && busyKey !== s.key && (
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 700,
                    color: "var(--ink-4)", letterSpacing: "0.1em",
                  }}>
                    완료 ✓
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-4)", lineHeight: 1.5 }}>
                {s.hint}
              </div>
              <div style={{
                fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7,
                flex: 1, padding: "10px 0",
                fontStyle: s.text ? "normal" : "italic",
                whiteSpace: "pre-wrap",
              }}>
                {s.text || (s.status === "active" ? "(이 단계 시작 — 아래 버튼 클릭)" : "(이전 단계 완료 후 시작)")}
              </div>
              {(s.status === "active" || s.status === "done") && (
                <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                  <Btn
                    kind="coral"
                    onClick={() => onStageRun(s.key)}
                    disabled={busyKey !== null}
                  >
                    {s.status === "done" ? "다시 만들기" : "AI로 만들기 →"}
                  </Btn>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          display: "flex", gap: 10, marginTop: 32, paddingTop: 24,
          borderTop: "1px solid var(--line)", alignItems: "center",
        }}>
          <Btn
            kind="coral"
            disabled={!allDone}
            onClick={() => {
              if (!allDone) return;
              // 사전 자료 6단계 결과를 localStorage에 저장 → /write 진입 시 prior로 활용
              try {
                const handoff = stages.reduce<Record<string, string>>((acc, s) => {
                  if (s.text && s.text.trim()) acc[s.key] = s.text;
                  return acc;
                }, {});
                window.localStorage.setItem("storyMaker.developHandoff", JSON.stringify(handoff));
              } catch { /* ignore */ }
              const params = new URLSearchParams({
                mode: "new",
                idea: ideaParam,
                genre: genreParam,
                fast: "1",
                from: "develop",
              });
              router.push(`/write?${params.toString()}`);
            }}
          >
            {allDone ? "본문 시작 →" : `본문 시작 (${stages.filter(s => s.status === "done").length}/${stages.length})`}
          </Btn>
          <button
            type="button"
            className="btn"
            onClick={() => setPhase("brief")}
            style={{ background: "transparent", border: "1px solid var(--line)" }}
          >
            ← 의뢰서 수정
          </button>
        </div>
      </div>
    </main>
  );
}
