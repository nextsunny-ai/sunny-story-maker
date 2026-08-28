"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryParamsState } from "@/lib/use-query-params";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Btn } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { getWorkflow } from "@/lib/workflows";
import {
  MediumFieldRenderer,
  buildDefaultValues,
  type FieldValues,
  type FieldValue,
} from "@/components/MediumFieldRenderer";
import { KEY, loadJSON, saveJSON, type WorkConversation } from "@/lib/persist";
import { getWorkId, appendTurns } from "@/lib/storymaker/work-id";
import { ItemMiniChat } from "@/components/ItemMiniChat";
import { streamFetch } from "@/lib/stream-agent";
import { stripControlMarkers } from "@/lib/storymaker/strip-markers";
import { pickRecommendedTitle } from "@/lib/storymaker/pick-title";
import { todayStamp } from "@/lib/storymaker/export";

export default function DevelopPage() {
  return (
    <AppShell>
      <DevelopMain />
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

// ★ 대표님 명시 (2026-05-04 옛 의도 + 2026-05-13 V3 정정):
//   캐릭터 = 3번째 (= 옛 V2.4 코멘트 명시했지만 배열 실제 변경 X 사고).
//   캐릭터 일찍 잡으면 = 시놉시스·기승전결도 = 캐릭터 기반으로 자연스러움.
const STAGE_DEFS: Omit<PreAsset, "text" | "status">[] = [
  { key: "title",     label: "제목",       hint: "작품 제목 후보 + 한 줄 평" },
  { key: "logline",   label: "로그라인",    hint: "한 문장 핵심 컨셉" },
  { key: "characters", label: "캐릭터 설정", hint: "주인공 + 핵심 인물 시트" },
  { key: "theme",     label: "주제",       hint: "작품이 던지는 질문 / 메시지" },
  { key: "synopsis",  label: "시놉시스",    hint: "A4 1쪽 줄거리" },
  { key: "structure", label: "기승전결",    hint: "구성 (매체에 따라 3막/회차/8단 등)" },
];

function DevelopMain() {
  const router = useRouter();
  const { params: searchParams, ready: queryReady } = useQueryParamsState();
  const ideaParam = searchParams.get("idea") || "";
  const [briefWarn, setBriefWarn] = useState("");
  const genreParam = searchParams.get("genre") || "A";
  const wf = getWorkflow(genreParam);

  // ★ 옛 작업 자동 복원용 키 (대표님 명시: develop에 옛 작업 있으면 보여야)
  // V3.1.1 정정: 옛 코드 = ideaParam 없으면 developKey = "" = 의뢰서·6단계 자동저장 전부 누락 사고.
  //   아이디어 없이 Develop 직접 진입해도 = 장르별 "untitled" 키로 저장·복원.
  const developKey = `storyMaker.developProject:${genreParam}:${ideaParam ? ideaParam.slice(0, 40) : "untitled"}`;

  // ─── Phase 관리 ───
  const [phase, setPhase] = useState<Phase>("brief");

  // ─── 의뢰 분석 폼 (옛 작업 복원) ───
  const [mediumFields, setMediumFields] = useState<FieldValues>(() => {
    if (typeof window !== "undefined" && developKey) {
      try {
        const raw = window.localStorage.getItem(developKey);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.mediumFields) return saved.mediumFields;
        }
      } catch { /* ignore */ }
    }
    return buildDefaultValues(wf.fields);
  });
  const onChangeField = (key: string, value: FieldValue) => {
    setMediumFields((prev) => ({ ...prev, [key]: value }));
  };

  // ─── 사전 자료 6단계 (옛 작업 복원) ───
  const [stages, setStages] = useState<PreAsset[]>(() => {
    if (typeof window !== "undefined" && developKey) {
      try {
        const raw = window.localStorage.getItem(developKey);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.stages && Array.isArray(saved.stages) && saved.stages.length === STAGE_DEFS.length) {
            return saved.stages;
          }
        }
      } catch { /* ignore */ }
    }
    return STAGE_DEFS.map((s, i) => ({
      ...s,
      text: "",
      status: i === 0 ? "active" : "pending",
    }));
  });
  const [busyKey, setBusyKey] = useState<PreAsset["key"] | null>(null);
  // ★ 카드 덮어쓰기 직전 본문 — 「↩ 되돌리기」용.
  //   보조작가 답을 카드에 저장했다가 원본이 사라지는 사고를 되돌릴 수 있어야 한다.
  const [undoText, setUndoText] = useState<Partial<Record<PreAsset["key"], string>>>({});

  // ★★★ 작업 유실 방지 (실측 2026-08-26)
  //   첫 렌더에서는 주소의 아이디어·매체를 아직 못 읽어 developKey 가 엉뚱한 값이다.
  //   그 상태로 자동저장이 돌면 **빈 6단계가 진짜 작업물을 덮어쓴다.**
  //   (기획 6단계를 다 만들어 두고 다시 들어오면 전부 비어 있던 사고)
  //   그래서 ① 쿼리가 준비되고 ② 그 키로 한 번 복원한 뒤에만 저장한다.
  const restoredKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!queryReady || typeof window === "undefined") return;
    if (restoredKeyRef.current === developKey) return;
    try {
      const raw = window.localStorage.getItem(developKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.stages && Array.isArray(saved.stages) && saved.stages.length === STAGE_DEFS.length) {
          setStages(saved.stages);
        }
        if (saved?.mediumFields) setMediumFields(saved.mediumFields);
      }
    } catch { /* 복원 실패 = 현재 상태 유지 */ }
    restoredKeyRef.current = developKey;
  }, [queryReady, developKey]);

  // 변경 시 자동 저장 (debounced) — 다음 진입 시 자동 복원
  useEffect(() => {
    if (!developKey || typeof window === "undefined") return;
    if (!queryReady) return;                          // 주소를 읽기 전에는 저장하지 않는다
    if (restoredKeyRef.current !== developKey) return; // 복원 전에는 저장하지 않는다
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(developKey, JSON.stringify({
          mediumFields, stages,
          updatedAt: new Date().toISOString(),
        }));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [developKey, mediumFields, stages, queryReady]);

  // ★ 대표님 명시 (2026-05-04): 6항목 = 작가가 자유 선택 (강제 순차 X)
  //   - 작가가 = "시놉시스만 뽑기" / "캐릭터만 뽑기" 가능
  //   - 모든 카드 = 독립 작동
  //   - useEffect 룰:
  //     1) status=done인데 text 비어있는 카드 = pending reset
  //     2) ★ "첫 비어있는 카드 active" 강제 X (= 작가가 = 직접 선택)
  //     3) 모든 카드 = 그냥 「▶ 시작」 누르면 = 그 카드만 active로 박힘
  useEffect(() => {
    let hasRealDone = false;
    const cleaned = stages.map((s) => {
      if (s.status === "done" && (!s.text || !s.text.trim())) {
        return { ...s, status: "pending" as const };
      }
      if (s.status === "done") hasRealDone = true;
      return s;
    });
    // ★ 첫 비어있는 카드 active 강제 X — 작가 자유 선택 (대표님 명시)
    // 단, busyKey가 없고 = 모든 카드가 = pending이고 = done도 X면 = 첫 카드만 active 힌트 (작가 진입 가이드)
    const allPendingOrDone = cleaned.every(s => s.status !== "active");
    const noneDone = cleaned.every(s => s.status !== "done");
    let fixed = cleaned;
    if (allPendingOrDone && noneDone) {
      // 첫 진입 = 첫 카드만 = active 힌트 (이후 = 작가 자유)
      fixed = cleaned.map((s, i) => i === 0 ? { ...s, status: "active" as const } : s);
    }
    const changed = fixed.some((f, i) => f.status !== stages[i].status);
    if (changed) setStages(fixed);
    if (hasRealDone && phase !== "stages") setPhase("stages");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages]);

  // 단계별 mode 매핑 — route.ts의 mode와 일치 (다음 단계에서 실제 호출)
  const STAGE_MODE: Record<PreAsset["key"], string> = {
    title: "title",            // 제목 후보 5개 (별도 prompt)
    logline: "logline",        // 로그라인 3안
    theme: "theme",            // 주제·메시지 (별도 prompt)
    synopsis: "synopsis",      // A4 1쪽 줄거리
    characters: "characters",  // 캐릭터 시트
    structure: "treatment",    // 기승전결 = 트리트먼트 본질
  };

  const onStageRun = async (key: PreAsset["key"]) => {
    const mode = STAGE_MODE[key];
    if (!mode) return;
    setBusyKey(key);
    setStages(prev => prev.map(s => s.key === key ? { ...s, status: "active" } : s));
    try {
      // ★ 대표님 명시 — 사전 자료 6단계는 깊이 우선 = Opus.
      //   admin에서 "집필"을 Haiku로 설정한 작가는 = 그 설정 따름.
      const { isFastModel } = await import("@/lib/storymaker/model-prefs");
      const useFast = isFastModel("write");
      // ★ 한 클로드 conversation 모델 — 작품 단위 누적.
      //   develop·write·chat·adapt·review·package 모두 같은 workId 사용.
      const workId = getWorkId(genreParam, ideaParam);
      const conv = loadJSON<WorkConversation>(KEY.workConversation(workId), {
        workId, messages: [], updatedAt: 0,
      });
      const stageLabel = STAGE_DEFS.find(d => d.key === key)?.label || key;
      const userPromptSummary = `[${stageLabel}] 한 줄 아이디어: ${ideaParam} / 매체: ${genreParam}`;
      const res = await streamFetch({
          mode,
          idea: ideaParam,
          genreLetter: genreParam,
          mediumFields,
          fast: useFast,
          workId,
          conversationMessages: conv.messages,
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
      // ★ 빈 응답 = done 박힘 X (분당 토큰 한도·서버 끊김 등 = active 유지)
      //   내부 제어 마커([[다음:…]] 등)는 카드·내보내기에 그대로 보이므로 여기서 제거
      const finalText = stripControlMarkers(collected);
      if (!finalText) {
        setStages(prev => prev.map(s => s.key === key ? {
          ...s,
          text: "(응답이 비어있습니다 — 잠시 후 「↻ 다시」 눌러주세요. 분당 토큰 한도에 걸렸을 수 있습니다.)",
          status: "active" as const,
        } : s));
      } else {
        // ★ conversation 누적 + 자동 compaction (50 turn 넘으면 옛 30 truncate)
        const updated = appendTurns(conv, [
          { role: "user", content: userPromptSummary },
          { role: "assistant", content: finalText },
        ]);
        saveJSON(KEY.workConversation(workId), {
          workId,
          messages: updated.messages,
          compactedSummary: updated.compactedSummary,
          updatedAt: Date.now(),
        });

        setStages(prev => prev.map(s => {
          if (s.key === key) return { ...s, text: finalText, status: "done" as const };
          // 다음 카드 active
          const idx = STAGE_DEFS.findIndex(d => d.key === key);
          const nextDef = STAGE_DEFS[idx + 1];
          if (nextDef && s.key === nextDef.key && s.status === "pending") {
            return { ...s, status: "active" as const };
          }
          return s;
        }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류";
      setStages(prev => prev.map(s => s.key === key ? { ...s, text: `(오류: ${msg})`, status: "active" as const } : s));
    } finally {
      setBusyKey(null);
    }
  };

  // ─── Phase 1: 의뢰 분석 폼 ───
  if (phase === "brief") {
    return (
      <main className="main">
        <Topbar
          eyebrow="DEVELOP — 기획실"
          title='<em style="font-style:italic">Project</em> Brief<span class="dot">.</span>'
          sub="개요를 작성하면 제목·로그라인·캐릭터·주제·시놉시스·기승전결 6단계로 사전 자료를 정리합니다. 끝나면 본문 시작 버튼으로 원고지(Write)로 넘어갑니다."
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

        <SectionHead num={1} title="개요 입력" sub={`매체별 입력 — 표준 양식: ${wf.export_format}`} />

        <MediumFieldRenderer
          fields={wf.fields}
          values={mediumFields}
          onChange={onChangeField}
        />

        <div style={{
          display: "flex", gap: 10, marginTop: 32, paddingTop: 24,
          borderTop: "1px solid var(--line)", alignItems: "center",
        }}>
          <Btn kind="coral" onClick={() => {
            // ★ 아이디어도 개요도 없이 누르면 아무 일도 안 일어나고 안내도 없었다 (실측 2026-08-27).
            //   작가는 눌렀는데 왜 안 되는지 모른다.
            //   매체 필드에는 기본값(회차 수 등)이 들어 있어서 「채웠는지」 판단 근거가 못 된다.
            //   작가가 실제로 쓴 것 = 한 줄 아이디어 또는 자유 서술 칸.
            const hasIdea = !!ideaParam.trim();
            const freeText = String(
              (mediumFields as Record<string, unknown>)?.premise ??
              (mediumFields as Record<string, unknown>)?.logline ??
              (mediumFields as Record<string, unknown>)?.story ?? ""
            ).trim();
            if (!hasIdea && !freeText) {
              setBriefWarn("한 줄 아이디어나 개요를 먼저 적어주세요. 한 줄이면 충분합니다.");
              return;
            }
            setBriefWarn("");
            setPhase("stages");
          }}>
            사전 자료 시작 →
          </Btn>
          {briefWarn && (
            <span style={{ fontSize: 13, color: "var(--coral-deep)" }}>⚠ {briefWarn}</span>
          )}
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
        eyebrow="DEVELOP — 사전 자료"
        title={`<em style="font-style:italic">기획</em> 작업 중<span class="dot">.</span>`}
        sub="6단계가 끝나면 본문 시작 버튼이 활성화됩니다. 단계마다 작가님이 컨펌하면 다음으로 넘어갑니다."
      />

      <SectionHead
        num={2}
        title="사전 자료 6단계"
        sub="제목 → 로그라인 → 캐릭터 → 주제 → 시놉시스 → 기승전결"
        right={
          <button
            type="button"
            onClick={() => {
              if (!confirm("이 작품의 사전 자료 6단계 결과를 다 비우고 처음부터 다시 시작합니다. 진행할까요?")) return;
              if (developKey && typeof window !== "undefined") {
                window.localStorage.removeItem(developKey);
              }
              setStages(STAGE_DEFS.map((s, i) => ({
                ...s,
                text: "",
                status: i === 0 ? "active" : "pending",
              })));
              setBusyKey(null);
            }}
            style={{
              padding: "6px 12px", fontSize: 11.5, fontWeight: 600,
              background: "transparent", color: "var(--ink-3)",
              border: "1px solid var(--line)", borderRadius: 6,
              cursor: "pointer",
            }}
          >↻ 6단계 초기화</button>
        }
      />

      <div style={{ maxWidth: 1200 }}>
        {/* 사전 자료 6단계 카드 — 고정 높이 + 헤더 우측 액션 + 본문 스크롤 */}
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
          {stages.map((s, i) => {
            const onCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
              if (!s.text) return;
              try {
                await navigator.clipboard.writeText(s.text);
                const btn = e.currentTarget;
                const orig = btn.innerHTML;
                btn.textContent = "✓ 복사됨";
                setTimeout(() => { btn.innerHTML = orig; }, 1200);
              } catch { /* clipboard 실패 무시 */ }
            };
            return (
              <div
                key={s.key}
                style={{
                  border: `1px solid ${s.status === "active" ? "var(--coral)" : "var(--line)"}`,
                  borderRadius: 14,
                  background: s.status === "active" ? "var(--card)" : "var(--card-soft)",
                  // ★ V3.1.1 — 옛 minHeight만 있고 상한이 없어 내용만큼 카드가 무한정 늘어남
                  //   (대표님: "스크롤이 없어서 한도 끝도 없이 늘어난다"). 화면 비례 고정 높이
                  //   = 카드 사이즈 동일 + 내부 스크롤 실작동 (원래 의도 복원).
                  height: "clamp(420px, 62vh, 680px)",
                  display: "flex", flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* 헤더 — 번호·라벨·우측 액션 버튼 (대표님 명시: 버튼은 위에) */}
                <div style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--line)",
                  display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: "var(--ink-5)", letterSpacing: "0.1em",
                  }}>
                    0{i + 1}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                    {s.label}
                  </span>
                  {busyKey === s.key && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 6px",
                      borderRadius: 4, background: "var(--coral-soft)",
                      color: "var(--coral-deep)", letterSpacing: "0.05em",
                    }}>
                      작성 중…
                    </span>
                  )}
                  {s.status === "done" && busyKey !== s.key && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: "var(--ink-4)", letterSpacing: "0.05em",
                    }}>
                      완료 ✓
                    </span>
                  )}

                  {/* 우측 액션 버튼들 — 헤더에 작게 (대표님 명시) */}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
                    {/* ★ 모든 카드에서 바로 시작할 수 있어야 한다 (대표님 명시: 6항목 자유 선택).
                        옛 코드는 active 카드에만 버튼을 띄워, 안내문은 "「▶ 시작」 누르면"이라 해놓고
                        정작 누를 버튼이 없었다 — 시놉시스만 뽑고 싶어도 순서대로 가야 했다. */}
                    {true && (
                      <>
                        <button
                          type="button"
                          onClick={() => onStageRun(s.key)}
                          disabled={busyKey !== null}
                          title={s.status === "done" ? "다시 만들기" : "AI로 만들기"}
                          style={{
                            padding: "5px 10px", fontSize: 11, fontWeight: 600,
                            background: s.status === "done" ? "transparent" : "var(--coral)",
                            color: s.status === "done" ? "var(--ink-3)" : "#fff",
                            border: `1px solid ${s.status === "done" ? "var(--line)" : "var(--coral)"}`,
                            borderRadius: 6, cursor: busyKey !== null ? "not-allowed" : "pointer",
                            opacity: busyKey !== null ? 0.5 : 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.status === "done" ? "↻ 다시" : "▶ 시작"}
                        </button>
                        {undoText[s.key] !== undefined && undoText[s.key] !== s.text && (
                          <button
                            type="button"
                            onClick={() => {
                              const prevText = undoText[s.key];
                              if (prevText === undefined) return;
                              setUndoText(u => ({ ...u, [s.key]: s.text }));
                              setStages(prev => prev.map(x =>
                                x.key === s.key ? { ...x, text: prevText } : x
                              ));
                            }}
                            title="보조작가 답을 저장하기 직전 내용으로 되돌립니다"
                            style={{
                              padding: "4px 10px", fontSize: 11, fontWeight: 600,
                              background: "var(--card-soft)", color: "var(--ink-2)",
                              border: "1px solid var(--line)", borderRadius: 6,
                              cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            ↩ 되돌리기
                          </button>
                        )}
                        {s.status === "done" && i < stages.length - 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextKey = stages[i + 1]?.key;
                              if (nextKey) onStageRun(nextKey);
                            }}
                            disabled={busyKey !== null}
                            title="다음 단계로"
                            style={{
                              padding: "5px 10px", fontSize: 11, fontWeight: 700,
                              background: "var(--coral)", color: "#fff",
                              border: "1px solid var(--coral)",
                              borderRadius: 6, cursor: busyKey !== null ? "not-allowed" : "pointer",
                              opacity: busyKey !== null ? 0.5 : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            다음 →
                          </button>
                        )}
                        {s.text && (
                          <button
                            type="button"
                            onClick={onCopy}
                            title="이 단락 전체 복사"
                            aria-label="복사"
                            style={{
                              padding: "5px 8px", fontSize: 11,
                              background: "transparent", color: "var(--ink-3)",
                              border: "1px solid var(--line)",
                              borderRadius: 6, cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: 3,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* 부제 hint */}
                <div style={{
                  padding: "8px 18px 4px",
                  fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.5,
                  flexShrink: 0,
                }}>
                  {s.hint}
                </div>

                {/* 본문 — 스크롤 영역 (대표님 명시: 카드 사이즈 동일 + 내부 스크롤) */}
                <div style={{
                  flex: 1, padding: "10px 18px 12px",
                  fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, /* ★ 1.75 → 1.5 (시나리오 표준) */
                  overflowY: "auto",
                  overflowX: "hidden",
                }}>
                  {s.text ? (
                    <Markdown text={stripControlMarkers(s.text)} compact />
                  ) : (
                    <div style={{
                      height: "100%", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      flexDirection: "column", gap: 12,
                      color: "var(--ink-4)", textAlign: "center",
                    }}>
                      {s.status === "active" ? (
                        <>
                          <em style={{ fontSize: 12.5 }}>
                            우측 상단 「▶ 시작」 클릭하면<br/>AI가 작성을 시작합니다
                          </em>
                          <button
                            type="button"
                            onClick={() => onStageRun(s.key)}
                            disabled={busyKey !== null}
                            style={{
                              padding: "10px 20px", fontSize: 13, fontWeight: 700,
                              background: "var(--coral)", color: "#fff",
                              border: "1px solid var(--coral)",
                              borderRadius: 10, cursor: busyKey !== null ? "not-allowed" : "pointer",
                              opacity: busyKey !== null ? 0.5 : 1,
                            }}
                          >
                            ▶ AI로 만들기
                          </button>
                        </>
                      ) : (
                        <em style={{ fontSize: 12.5 }}>
                          우측 「▶ 시작」을 누르면 이 항목만 만듭니다
                        </em>
                      )}
                    </div>
                  )}
                </div>

                {/* ★ 미니 채팅 — 대표님 명시: 카드 결과 = 같이 다듬기 (협업 워크룸) */}
                {s.text && s.text.trim() && (
                  <div style={{ padding: "0 14px 12px" }}>
                    <ItemMiniChat
                      workId={getWorkId(genreParam, ideaParam)}
                      cardKey={s.key}
                      cardLabel={s.label}
                      currentText={s.text}
                      mode={STAGE_MODE[s.key]}
                      idea={ideaParam}
                      genreLetter={genreParam}
                      mediumFields={mediumFields}
                      onApply={(newText) => {
                        setUndoText(prev => ({ ...prev, [s.key]: s.text }));
                        setStages(prev => prev.map(x =>
                          x.key === s.key ? { ...x, text: newText, status: "done" } : x
                        ));
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
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
                // 기획실이 추천한 제목을 원고지가 이어받는다.
                // 없으면 원고지 제목이 계속 "(가제)"로 남아 내보낸 파일명까지 "새 작품"이 된다.
                const pickedTitle = pickRecommendedTitle(handoff.title || "");
                if (pickedTitle) {
                  window.localStorage.setItem("storyMaker.developTitle", pickedTitle);
                } else {
                  window.localStorage.removeItem("storyMaker.developTitle");
                }
              } catch { /* ignore */ }
              // ★ idea 가 비면 /write 가 다시 /develop 으로 되돌려 무한 왕복이 된다.
              //   (실측 2026-08-26: 6단계 다 끝내고 눌러도 develop 으로 되돌아옴)
              //   주소창으로 바로 들어온 작가를 위해 = 로그라인·제목·개요 순으로 대체 문구를 만든다.
              const outlineField = mediumFields["story_outline"];
              const fallbackIdea =
                (typeof outlineField === "string" ? outlineField.trim() : "") ||
                (stages.find(s => s.key === "logline")?.text || "").trim() ||
                (stages.find(s => s.key === "title")?.text || "").trim();
              const params = new URLSearchParams({
                mode: "new",
                idea: (ideaParam || fallbackIdea).replace(/\s+/g, " ").slice(0, 200),
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
          {/* 사전 자료 다운로드 — 6단계 중 1개 이상 작성된 경우 (대표님 명시: 모든 결과 저장 가능) */}
          {stages.some(s => s.text && s.text.trim()) && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const { downloadDocx } = await import("@/lib/storymaker/export");
                  const stamp = todayStamp();
                  const md = stages
                    .filter(s => s.text && s.text.trim())
                    .map(s => `# ${s.label}\n> ${s.hint}\n\n${stripControlMarkers(s.text)}`)
                    .join("\n\n---\n\n");
                  const filename = `${ideaParam.slice(0, 20) || "기획"}_사전자료_${stamp}`;
                  await downloadDocx(md, filename);
                }}
                style={{ background: "transparent", border: "1px solid var(--line)", fontSize: 12 }}
                title="사전 자료 6단계 결과 워드 다운로드"
              >
                ↓ 사전자료 워드
              </button>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const { downloadTxt } = await import("@/lib/storymaker/export");
                  const stamp = todayStamp();
                  const md = stages
                    .filter(s => s.text && s.text.trim())
                    .map(s => `# ${s.label}\n${s.hint}\n\n${stripControlMarkers(s.text)}`)
                    .join("\n\n---\n\n");
                  const filename = `${ideaParam.slice(0, 20) || "기획"}_사전자료_${stamp}`;
                  downloadTxt(md, filename);
                }}
                style={{ background: "transparent", border: "1px solid var(--line)", fontSize: 12 }}
              >
                ↓ TXT
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
