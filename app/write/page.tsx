"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { WriteCanvas, type Para, type WorkInfo } from "@/components/WriteCanvas";
import { WriteWorkbook, type Note, type FlowItem, type ChatMsg } from "@/components/WriteWorkbook";
import { Btn } from "@/components/ui";
import { KEY, loadJSON, saveJSON } from "@/lib/persist";
import { getWorkflow, QUICK_ACTIONS } from "@/lib/workflows";
import {
  MediumFieldRenderer,
  buildDefaultValues,
  type FieldValues,
  type FieldValue,
} from "@/components/MediumFieldRenderer";

export default function WritePage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <WriteMain />
      </Suspense>
    </AppShell>
  );
}

// ───── 데모(시연용) 데이터 — 직접 /write 접근 시만 사용 ─────
const DEMO_WORK: WorkInfo = {
  title: "달빛 정원",
  chapter: "4화",
  elapsed: "12분째 작성 중",
  medium: "B. TV 드라마 · 16부 미니",
};

const DEMO_NOTES: Note[] = [
  { id: "n1", label: "주인공: 도윤 (1인칭)" },
  { id: "n2", label: "톤: 어둡고 절제된" },
  { id: "n3", label: "결말: 비극, 여운" },
  { id: "n4", label: "매체: TV 드라마 16부" },
];

const DEMO_FLOW: FlowItem[] = [
  { id: "f1", state: "done",    title: "캐릭터 정리",      hint: "도윤·서아·정원사 — 동기 정리 완료" },
  { id: "f2", state: "done",    title: "1~3화 흐름 점검",  hint: "비밀의 정원 발견까지 — 호흡 OK" },
  { id: "f3", state: "active",  title: "4화 갈등축 잡기",  hint: "지금: 옥상 vs 정원 공간 모티프 결정 중" },
  { id: "f4", state: "pending", title: "4화 본문 집필",    hint: "단락 6~12 · 호흡 1.5쪽" },
  { id: "f5", state: "pending", title: "다음 화 시드",     hint: "5화 첫 후크 한 줄" },
];

const DEMO_PARAS: Para[] = [
  { id: "p1", n: 1, label: "정원의 발견",
    text: "달빛이 비치는 정원에서, 도윤은 처음으로 자신의 그림자가 길어지는 것을 보았다. 그건 단순한 빛의 각도가 아니었다. 정원이 그를 알아본 순간이었다.",
    status: "done" },
  { id: "p2", n: 2, label: "첫 만남",
    text: "그가 만나는 건 잃어버린 기억을 가진 한 인물이었다. 이름조차 알지 못한 채 둘은 서로를 마주 보았고, 침묵 속에서 더 많은 것을 읽었다.",
    status: "done" },
  { id: "p3", n: 3, label: "비밀의 정원",
    text: "그날 밤, 도윤은 도시 옥상에서 내려다보이는 정원의 빛이 어쩐지 다르게 느껴졌다. 마치 누군가 거기 서서 그를 기다리고 있는 것처럼.",
    status: "done" },
  { id: "p4", n: 4, label: "균열",
    text: "",
    status: "streaming",
    streamTarget: "도윤이 정원으로 다시 내려갔을 때, 화단은 어제와 같았지만 같지 않았다. 오른쪽 구석에 처음 보는 발자국이 있었고, 그 발자국은 정원 안쪽으로만 이어져 있었다. 들어간 사람은 있었지만 나온 사람은 없는 흔적이었다." },
  { id: "p5", n: 5, label: "추적", text: "", status: "pending" },
  { id: "p6", n: 6, label: "마주침", text: "", status: "pending" },
];

const DEMO_CHAT: ChatMsg[] = [
  { id: "m1", role: "ai",     text: "달빛 정원 4화 시작할게요. 작가 노트 4개 모두 반영합니다.", t: "12분 전" },
  { id: "m2", role: "writer", text: "옥상 장면이 너무 클리셰야. 다른 공간 제안해줘", t: "8분 전" },
  { id: "m3", role: "ai",     text: "네, 옥상 대신 폐쇄된 정원 안쪽 — 발자국 모티프로 갈게요. 3단락 다시 썼습니다.", t: "7분 전" },
  { id: "m4", role: "writer", text: "좋아. 4단락은 정적인 묘사 대신 균열을 강조해줘", t: "방금" },
];

type Ctx = { work: WorkInfo; notes: Note[]; flow: FlowItem[]; paras: Para[]; chat: ChatMsg[] };

/** 매체별 workflow.steps → FlowItem (첫 단계 active, 나머지 pending) */
function buildFlowFromWorkflow(letter: string, activeStepName?: string): FlowItem[] {
  const wf = getWorkflow(letter);
  return wf.steps.map((stepName, i) => ({
    id: `f${i + 1}`,
    state: activeStepName
      ? (stepName === activeStepName ? "active" : "pending")
      : (i === 0 ? "active" : "pending"),
    title: stepName,
    hint: i === 0 && !activeStepName ? "AI 작가가 의뢰서 분석 중" : "",
  }));
}

// ───── mode=new: 빈 캔버스 + 첫 단락만 streaming ─────
function buildNewWorkContext(idea: string, genreLetter: string, activeStepName?: string): Ctx {
  const wf = getWorkflow(genreLetter);
  const titlePreview = idea
    ? idea.split(/[.,\s]/).filter(Boolean).slice(0, 4).join(" ").slice(0, 24)
    : "새 작품";

  return {
    work: { title: titlePreview, chapter: "초안", elapsed: "방금 시작", medium: `${wf.letter}. ${wf.name}` },
    notes: idea
      ? [{ id: "n_idea", label: `핵심: ${idea.length > 30 ? idea.slice(0, 28) + "…" : idea}` },
         { id: "n_genre", label: `매체: ${wf.name}` }]
      : [{ id: "n_genre", label: `매체: ${wf.name}` }],
    flow: buildFlowFromWorkflow(genreLetter, activeStepName),
    paras: idea
      ? [
          { id: "p1", n: 1, label: activeStepName || wf.steps[0] || "오프닝", text: "", status: "streaming",
            streamTarget: `[${wf.name}] AI 작가가 "${idea}" 컨셉으로 ${activeStepName || wf.steps[0] || "첫 단계"} 작업 중입니다. 잠시만 기다려 주세요…` },
          { id: "p2", n: 2, label: "도입",  text: "", status: "pending" },
          { id: "p3", n: 3, label: "사건",  text: "", status: "pending" },
        ]
      : [
          { id: "p1", n: 1, label: "첫 단락", text: "", status: "pending" },
        ],
    chat: idea
      ? [{ id: "m_init", role: "ai",
           text: `좋습니다. "${idea}" 컨셉으로 ${wf.name} 작품 시작할게요. 막히면 우측에서 바로 끼어들어 주세요.`, t: "방금" }]
      : [{ id: "m_init", role: "ai",
           text: `${wf.name} 작품 준비 완료. 우측에 한 줄 아이디어 적어주시면 첫 단락부터 시작합니다.`, t: "방금" }],
  };
}

// ───── mode=continue: 기존 작품 이어쓰기 (DB 연결은 다음 라운드) ─────
function buildContinueContext(projectName: string): Ctx {
  return {
    work: { title: projectName, chapter: "이어쓰기", elapsed: "방금 열림", medium: "기존 작품" },
    notes: [{ id: "n_loaded", label: `${projectName} 컨텍스트 불러오는 중…` }],
    flow: [
      { id: "f1", state: "active",  title: "이전 작업 컨텍스트 로드", hint: "최신 버전 본문·노트·디렉션 복원" },
      { id: "f2", state: "pending", title: "이어쓸 위치 결정",        hint: "마지막 단락 다음 또는 작가 지정" },
    ],
    paras: [
      { id: "p_loaded", n: 1, label: "이전 본문",
        text: `${projectName}의 마지막 본문이 곧 여기 표시됩니다. (DB 연결 후 활성화 — 지금은 빈 캔버스)`,
        status: "done" },
      { id: "p_next", n: 2, label: "이어쓸 단락", text: "", status: "pending" },
    ],
    chat: [{ id: "m_resume", role: "ai",
             text: `${projectName} 다시 열었어요. 어디서부터 이어쓸까요?`, t: "방금" }],
  };
}

// ───── mode=adapt-same / adapt-cross: 각색 (DB 연결은 다음 라운드) ─────
function buildAdaptContext(mode: string, projectName: string, sourceLetter: string, targetLetter: string): Ctx {
  const isCross = mode === "adapt-cross";
  const sourceGenre = GENRES.find(g => g.letter === sourceLetter) || GENRES[0];
  const targetGenre = GENRES.find(g => g.letter === targetLetter) || GENRES[0];
  const title = projectName || "각색";
  const chapter = isCross ? `${sourceGenre.name} → ${targetGenre.name}` : "v4 (각색)";

  return {
    work: { title, chapter, elapsed: "방금 시작", medium: isCross ? targetGenre.name : sourceGenre.name },
    notes: isCross
      ? [{ id: "n_from", label: `원본: ${sourceGenre.name}` },
         { id: "n_to",   label: `목표: ${targetGenre.name}` }]
      : [{ id: "n_base", label: `${title} v3에서 출발` }],
    flow: [
      { id: "f1", state: "active",  title: isCross ? "원본 매체 표준 분석" : "이전 버전 디렉션 분석",
        hint: isCross ? `${sourceGenre.name} 자산을 ${targetGenre.name} 매체 표준으로 매핑` : "v3 본문 + 새 디렉션 결합" },
      { id: "f2", state: "pending", title: "변환된 첫 단락 생성",  hint: "톤·시점·호흡 적용" },
      { id: "f3", state: "pending", title: "전체 본문 변환",       hint: "단락 단위 streaming" },
    ],
    paras: [
      { id: "p1", n: 1, label: "변환 시작",
        text: "", status: "streaming",
        streamTarget: isCross
          ? `${sourceGenre.name} 원본을 ${targetGenre.name} 매체 표준으로 변환 중입니다…`
          : `${title}의 v4를 작가 디렉션에 맞춰 새로 쓰는 중입니다…` },
    ],
    chat: [{ id: "m_init", role: "ai",
             text: isCross
               ? `${sourceGenre.name} → ${targetGenre.name} 변환 시작. 매체 표준 자동 적용 중.`
               : `${title} v4 시작. 디렉션 반영 중.`, t: "방금" }],
  };
}

// ───── 작품 선택 안내 (mode 없이 직접 진입) ─────
function NoProjectGate() {
  return (
    <main className="main">
      <Topbar
        eyebrow="WRITE — 작품 선택"
        title='어떤 <em style="font-style:italic">작품</em>을 작업할까요<span class="dot">?</span>'
        sub="새 작품은 홈에서 한 줄 아이디어로 시작하거나, 라이브러리에서 진행 중인 작품을 선택해주세요."
      />
      <div style={{
        padding: "40px 0", textAlign: "center",
        display: "flex", flexDirection: "column", gap: 16, alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/" className="btn btn-coral" style={{ textDecoration: "none" }}>홈으로 — 새 작품 시작</a>
          <a href="/library" className="btn" style={{ textDecoration: "none" }}>라이브러리에서 선택</a>
        </div>
        <div style={{ marginTop: 32, fontSize: 11, color: "var(--ink-5)" }}>
          데모 화면을 보고 싶다면 <a href="/write?demo=1" style={{ color: "var(--coral)", textDecoration: "underline" }}>샘플 작업실</a> 열기
        </div>
      </div>
    </main>
  );
}

interface PersistedProject {
  work: WorkInfo;
  notes: Note[];
  flow: FlowItem[];
  paras: Para[];
  chat: ChatMsg[];
  mediumFields?: FieldValues;
  briefDone?: boolean;
  updatedAt: string;
}

function projectKeyFor(mode: string | null, isDemo: boolean, projectParam: string, ideaParam: string, genreLetter: string): string | null {
  if (isDemo) return null;
  if (mode === "continue" && projectParam) return projectParam;
  if (mode === "new" && ideaParam) {
    // 매체별로 분리 — 같은 idea라도 매체 다르면 다른 작품
    return `new:${genreLetter}:${ideaParam.slice(0, 40)}`;
  }
  if (mode === "new" && !ideaParam) {
    return null; // 매체만 있고 아이디어 없으면 의뢰 분석 폼만 — 키는 첫 채움 후
  }
  if ((mode === "adapt-same" || mode === "adapt-cross") && projectParam) {
    return mode + ":" + projectParam;
  }
  return null;
}

function WriteMain() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const ideaParam = searchParams.get("idea") || "";
  const genreParam = searchParams.get("genre") || "A";
  const projectParam = searchParams.get("project") || "";
  const actionParam = searchParams.get("action") || ""; // 빠른 의뢰: 그 단계로 점프
  const isDemo = searchParams.get("demo") === "1";
  const isDirectMode = searchParams.get("fast") === "1"; // AI로 바로 집필 = 곧장 본문(script)
  const isPlanMode = searchParams.get("plan") === "1";   // 기획 후 집필 = 사전 자료 단계

  // 작품 선택 안내 화면 — mode 없고 demo 아니면
  if (!mode && !isDemo) {
    return <NoProjectGate />;
  }

  // ─── 매체 정보 ───
  const wf = useMemo(() => getWorkflow(genreParam), [genreParam]);

  // 영속화 키
  const persistKey = projectKeyFor(mode, isDemo, projectParam, ideaParam, genreParam);
  const storageKey = persistKey ? KEY.writeProject(persistKey) : null;

  // ─── 의뢰 분석 폼 (mediumFields) ───
  // 새 작품 모드면, 작가가 의뢰서를 채워야 AI가 시작.
  // localStorage에 briefDone=true가 저장돼있으면 폼 스킵.
  const [mediumFields, setMediumFields] = useState<FieldValues>(() => {
    if (storageKey) {
      const saved = loadJSON<PersistedProject | null>(storageKey, null);
      if (saved?.mediumFields) return saved.mediumFields;
    }
    const defaults = buildDefaultValues(wf.fields);
    // URL query에서 들어온 매체 결정값 (예: episodes, format_type 등) prefill
    for (const f of wf.fields) {
      const v = searchParams.get(f.key);
      if (v != null && v !== "") {
        if (f.type === "number") {
          const n = Number(v);
          if (Number.isFinite(n)) defaults[f.key] = n;
        } else if (f.type === "multiselect") {
          defaults[f.key] = v.split(",").map(s => s.trim()).filter(Boolean);
        } else {
          defaults[f.key] = v;
        }
      }
    }
    return defaults;
  });

  const [briefDone, setBriefDone] = useState<boolean>(() => {
    if (isDemo) return true;
    // fast=1 (홈 Start Writing 또는 develop 컨펌 후) → 의뢰 폼 스킵, 곧장 본문
    if (isDirectMode) return true;
    if (mode === "continue" || mode === "adapt-same" || mode === "adapt-cross") return true;
    if (storageKey) {
      const saved = loadJSON<PersistedProject | null>(storageKey, null);
      if (saved?.briefDone) return true;
      // 복원된 paras가 있으면 의뢰 단계 지나간 것으로 간주
      if (saved?.paras && saved.paras.length > 0) return true;
    }
    return false;
  });

  // 컨텍스트 빌드
  const initial = (() => {
    if (isDemo) {
      return { work: DEMO_WORK, notes: DEMO_NOTES, flow: DEMO_FLOW, paras: DEMO_PARAS, chat: DEMO_CHAT };
    }
    if (storageKey) {
      const saved = loadJSON<PersistedProject | null>(storageKey, null);
      if (saved && saved.paras && saved.paras.length > 0) {
        return { work: saved.work, notes: saved.notes, flow: saved.flow, paras: saved.paras, chat: saved.chat };
      }
    }
    if (mode === "new") {
      return buildNewWorkContext(ideaParam, genreParam, actionParam || undefined);
    }
    if (mode === "continue") {
      return buildContinueContext(projectParam || ideaParam || "이어쓰기");
    }
    if (mode === "adapt-same" || mode === "adapt-cross") {
      return buildAdaptContext(mode, projectParam, genreParam, searchParams.get("target") || "F");
    }
    return buildNewWorkContext(ideaParam, genreParam);
  })();

  // ★ 초기 한 번만 계산 — 매 렌더 재계산하면 자동저장 후 true로 변해서
  //   AI 호출 useEffect가 cleanup→abort되는 버그 (첫 delta 도달 전 호출 끊김)
  const [wasRestored] = useState<boolean>(() => {
    if (isDemo || !storageKey) return false;
    const saved = loadJSON<PersistedProject | null>(storageKey, null);
    return !!(saved && saved.paras && saved.paras.some(p => p.text && p.text.trim().length > 0));
  });

  const [work] = useState<WorkInfo>(initial.work);
  const [notes, setNotes] = useState<Note[]>(initial.notes);
  const [flow, setFlow] = useState<FlowItem[]>(initial.flow);
  const [paras, setParas] = useState<Para[]>(initial.paras);
  const [chat, setChat] = useState<ChatMsg[]>(initial.chat);
  const [paused, setPaused] = useState(false);
  const [input, setInput] = useState("");

  // 변경 시 자동 저장 (debounced)
  useEffect(() => {
    if (!storageKey) return;
    const timer = setTimeout(() => {
      const snapshot: PersistedProject = {
        work, notes, flow, paras, chat,
        mediumFields,
        briefDone,
        updatedAt: new Date().toISOString(),
      };
      saveJSON(storageKey, snapshot);
    }, 400);
    return () => clearTimeout(timer);
  }, [storageKey, work, notes, flow, paras, chat, mediumFields, briefDone]);

  // 워크북 패널 토글
  const [bookOpen, setBookOpen] = useState<boolean>(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBookOpen(window.innerWidth >= 1100);
    }
  }, []);

  // ─── 데모 모드: mock streaming (시연용) ───
  useEffect(() => {
    if (!isDemo) return;
    if (paused) return;
    const streamingIdx = paras.findIndex(p => p.status === "streaming");
    if (streamingIdx === -1) return;
    const p = paras[streamingIdx];
    if (!p.streamTarget) return;
    if (p.text.length >= p.streamTarget.length) {
      const next = [...paras];
      next[streamingIdx] = { ...p, status: "done" };
      const nextIdx = next.findIndex((x, i) => i > streamingIdx && x.status === "pending");
      if (nextIdx !== -1) {
        next[nextIdx] = {
          ...next[nextIdx],
          status: "streaming",
          streamTarget: nextIdx === 4
            ? "발자국을 따라간 도윤 앞에 정원의 가장 깊은 곳이 열렸다. 그곳에는 거울처럼 잔잔한 작은 연못이 있었고, 수면 위로 떠오른 것은 자신의 얼굴이 아니었다."
            : "연못에 비친 얼굴은 서아의 것이었다. 도윤은 비명을 삼키고 한 발 물러섰지만, 발걸음은 멈추지 않았다. 정원이 그를 끌어당기고 있었다.",
        };
      }
      setParas(next);
      return;
    }
    const id = setTimeout(() => {
      setParas(prev => prev.map((x, i) =>
        i === streamingIdx
          ? { ...x, text: (x.streamTarget || "").slice(0, x.text.length + 1) }
          : x
      ));
    }, 35);
    return () => clearTimeout(id);
  }, [paras, paused, isDemo]);

  // ─── 새 작품 모드: 진짜 /api/agent/stream SSE 호출 ───
  // briefDone 트리거 — 의뢰 분석 폼 제출 후에만 호출.
  useEffect(() => {
    if (isDemo) return;
    if (mode !== "new" || !ideaParam.trim()) return;
    if (wasRestored) return;
    if (!briefDone) return; // ★ 의뢰 분석 끝나야 호출

    const controller = new AbortController();
    let cancelled = false;

    // 액션 → 모드 매핑 (빠른 의뢰)
    // ★ "AI로 바로 집필"(fast=1) → script (본문 직행)
    //   "기획 후 집필"(plan=1) → logline (사전 자료부터 단계 진행, 채팅에 박힘)
    //   default = "logline"
    const apiMode = (() => {
      if (isDirectMode) return "script";
      if (isPlanMode) return "logline";
      if (!actionParam) return "logline";
      const a = actionParam.trim();
      if (a.includes("로그라인")) return "logline";
      if (a.includes("시놉시스")) return "synopsis";
      if (a.includes("트리트먼트")) return "treatment";
      if (a.includes("캐릭터")) return "characters";
      if (a.includes("세계관") || a.includes("월드")) return "worldview";
      if (a.includes("회차") || a.includes("에피") || a.includes("페이월")
          || a.includes("클리프행어") || a.includes("아크")) return "episodes";
      if (a.includes("기획")) return "proposal";
      if (a.includes("대본") || a.includes("씬") || a.includes("씬 구성")
          || a.includes("시퀀스") || a.includes("컷") || a.includes("자막")
          || a.includes("내레이션") || a.includes("큐시트") || a.includes("대사")
          || a.includes("존") || a.includes("질문지")) return "script";
      return "logline";
    })();

    // develop에서 넘어온 사전 자료 핸드오프 (제목·로그라인·주제·시놉시스·캐릭터·기승전결)
    let developPrior: Record<string, string> | undefined;
    if (typeof window !== "undefined" && searchParams.get("from") === "develop") {
      try {
        const raw = window.localStorage.getItem("storyMaker.developHandoff");
        if (raw) developPrior = JSON.parse(raw);
      } catch { /* ignore */ }
    }

    (async () => {
      try {
        const res = await fetch("/api/agent/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode: apiMode,
            idea: ideaParam,
            genreLetter: genreParam,
            mediumFields,
            fast: true,
            ...(developPrior ? { prior: developPrior } : {}),
          }),
          signal: controller.signal,
        });
        if (!res.body) throw new Error("응답 없음");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let firstDelta = true;

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const events = buf.split("\n\n");
          buf = events.pop() || "";

          for (const evt of events) {
            const lines = evt.split("\n");
            const eventType = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
            const dataLine = lines.find(l => l.startsWith("data:"))?.slice(5).trim();
            if (!eventType || !dataLine) continue;

            try {
              const data = JSON.parse(dataLine);
              // ★ script 모드일 때만 본문(paras)에 박음.
              //   logline/synopsis/treatment 등 사전 자료 모드는 채팅(chat)에 박힘.
              const isScriptMode = apiMode === "script";
              const aiMsgId = "ai_brief_" + Date.now() + "_init";
              if (eventType === "delta" && data.text) {
                if (isScriptMode) {
                  setParas(prev => prev.map((x, i) => {
                    if (i !== 0) return x;
                    const base = firstDelta ? "" : x.text;
                    return { ...x, text: base + data.text, streamTarget: undefined };
                  }));
                } else {
                  // 사전 자료: 채팅에 누적 (첫 chunk면 새 메시지, 이후는 마지막 ai 메시지에 append)
                  setChat(prev => {
                    if (firstDelta) {
                      return [...prev, { id: aiMsgId, role: "ai", text: data.text, t: "방금" }];
                    }
                    const lastIdx = [...prev].reverse().findIndex(m => m.role === "ai");
                    if (lastIdx === -1) {
                      return [...prev, { id: aiMsgId, role: "ai", text: data.text, t: "방금" }];
                    }
                    const realIdx = prev.length - 1 - lastIdx;
                    return prev.map((m, i) => i === realIdx ? { ...m, text: m.text + data.text } : m);
                  });
                }
                firstDelta = false;
              } else if (eventType === "done") {
                if (isScriptMode) {
                  setParas(prev => prev.map((x, i) =>
                    i === 0 ? { ...x, status: "done" as const, streamTarget: undefined } : x
                  ));
                }
                // flow에서 active → done 전환
                setFlow(prev => prev.map(f =>
                  f.state === "active" ? { ...f, state: "done" as const } : f
                ));
              } else if (eventType === "error") {
                setChat(prev => [...prev, {
                  id: "err_" + Date.now(),
                  role: "ai",
                  text: `⚠ AI 호출 오류: ${data.message}`,
                  t: "방금",
                }]);
                if (isScriptMode) {
                  setParas(prev => prev.map((x, i) =>
                    i === 0 ? { ...x, status: "done" as const,
                      text: x.text || "(AI 응답을 받지 못했습니다. 우측 채팅에서 다시 시도해주세요.)",
                      streamTarget: undefined } : x
                  ));
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "네트워크 오류";
        setChat(prev => [...prev, {
          id: "err_" + Date.now(), role: "ai", text: `⚠ 호출 실패: ${msg}`, t: "방금",
        }]);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, mode, ideaParam, genreParam, wasRestored, briefDone, actionParam]);

  const onRewrite = (id: string) => {
    setParas(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, text: "", status: "streaming" };
    }));
  };

  const addNote = (label: string) => {
    if (!label.trim()) return;
    setNotes(prev => [...prev, { id: "n" + Date.now(), label: label.trim() }]);
  };
  const removeNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const sendMessage = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setChat(prev => [...prev, { id: "m" + Date.now(), role: "writer", text, t: "방금" }]);
    setInput("");
    setTimeout(() => {
      setChat(prev => [...prev, {
        id: "m" + (Date.now() + 1),
        role: "ai",
        text: "알겠어요. 반영해서 이어 쓸게요.",
        t: "방금"
      }]);
      if (text.match(/이름.*[을를].*(\w+)으?로/i) || text.match(/(\w+)으?로 바[꿔까]/i)) {
        addNote(text.length < 30 ? text : text.slice(0, 28) + "…");
      }
    }, 800);
  };

  // ─── 의뢰 분석 폼 (briefDone === false 일 때만) ───
  if (mode === "new" && !briefDone && !isDemo) {
    const onChangeField = (key: string, value: FieldValue) => {
      setMediumFields(prev => ({ ...prev, [key]: value }));
    };
    const onSubmit = () => setBriefDone(true);
    const sampleQuick = QUICK_ACTIONS[wf.letter] || [];

    return (
      <main className="main">
        <Topbar
          eyebrow={`WRITE — 의뢰 분석 (${wf.letter}. ${wf.name})`}
          title={`<em style="font-style:italic">${wf.name}</em> 작업 의뢰서<span class="dot">.</span>`}
          sub={`${wf.sub} · 표준: ${wf.export_format} · 단계: ${wf.steps.join(" → ")} — 채워주시면 AI 작가가 매체 표준에 맞춰 작업합니다.${actionParam ? ` (빠른 의뢰: ${actionParam})` : ""}`}
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

        <MediumFieldRenderer
          fields={wf.fields}
          values={mediumFields}
          onChange={onChangeField}
        />

        <div style={{
          display: "flex", gap: 10, marginTop: 32, paddingTop: 24,
          borderTop: "1px solid var(--line)", alignItems: "center",
        }}>
          <Btn kind="coral" onClick={onSubmit}>
            {actionParam ? `${actionParam} 시작` : "집필 시작"}
          </Btn>
          <a href="/" className="btn" style={{ textDecoration: "none" }}>← Home</a>
          {sampleQuick.length > 0 && (
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--ink-5)" }}>
              작가팀이 작업할 단계: {wf.steps.length}개
            </span>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="main write-live">
      <div className={"write-shell" + (bookOpen ? " book-open" : " book-closed")}>
        <WriteCanvas
          work={work}
          paras={paras}
          paused={paused}
          onPauseToggle={() => setPaused(!paused)}
          onRewrite={onRewrite}
          bookOpen={bookOpen}
          onBookToggle={() => setBookOpen(!bookOpen)}
          notesCount={notes.length}
        />

        {bookOpen && (
          <WriteWorkbook
            notes={notes}
            flow={flow}
            chat={chat}
            input={input}
            onInputChange={setInput}
            onSend={sendMessage}
            onAddNote={addNote}
            onRemoveNote={removeNote}
            onClose={() => setBookOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
