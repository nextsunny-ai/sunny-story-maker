"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { WriteCanvas, type Para, type WorkInfo } from "@/components/WriteCanvas";
import { WriteWorkbook, type Note, type FlowItem, type ChatMsg } from "@/components/WriteWorkbook";
import { Btn } from "@/components/ui";
import { KEY, loadJSON, saveJSON, type WorkConversation } from "@/lib/persist";
import { appendTurns } from "@/lib/storymaker/work-id";
import { downloadDocx, downloadTxt } from "@/lib/storymaker/export";
import { streamFetch } from "@/lib/stream-agent";
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

// ───── mode=continue: 저장된 작품이 없을 때 fallback (정상 흐름은 KEY.writeProject 자동 복원) ─────
function buildContinueContext(projectName: string): Ctx {
  const display = projectName.length > 40 ? projectName.slice(0, 38) + "…" : projectName;
  return {
    work: { title: display, chapter: "이어쓰기", elapsed: "방금 열림", medium: "기존 작품" },
    notes: [],
    flow: [
      { id: "f1", state: "active", title: "이어쓸 위치 결정", hint: "첫 단락부터 시작하거나 우측 채팅에서 위치 지정" },
    ],
    paras: [
      { id: "p_next", n: 1, label: "이어쓸 단락", text: "", status: "pending" },
    ],
    chat: [{ id: "m_resume", role: "ai",
             text: `${display} 열었습니다. 어디서부터 이어쓸지 말씀해 주세요.`, t: "방금" }],
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
  const router = useRouter();
  // 마지막 작품 정보 (있을 때만 "이어가기" 버튼 노출 — 또는 자동 redirect)
  const [lastProject, setLastProject] = useState<{
    mode?: string; idea?: string; genre?: string; project?: string; from?: string; fast?: string; savedAt?: string;
  } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // ★ 사장님 명시: /write 진입 시 = 빈 화면이든 작업 중이든 자동 진입. NoProjectGate 안 거침.
    //   - 옛 작품 있으면 = 그 작품 자동 복원
    //   - 없으면 = 빈 작업실 (채팅으로 처음부터 시작)
    //   - 다른 작품 전환 = 작업실 헤더의 「📁 작품 변경」 버튼 또는 = 사이드바 Library
    const last = loadJSON<typeof lastProject>(KEY.writeLastProject, null);
    if (last && last.mode) {
      const params = new URLSearchParams();
      if (last.mode) params.set("mode", last.mode);
      if (last.idea) params.set("idea", last.idea);
      if (last.genre) params.set("genre", last.genre);
      if (last.project) params.set("project", last.project);
      if (last.from) params.set("from", last.from);
      if (last.fast) params.set("fast", last.fast);
      router.replace(`/write?${params.toString()}`);
      return;
    }
    // 옛 작품 없으면 = 빈 작업실 자동
    const blankIdea = `새 작품 ${new Date().toLocaleDateString("ko-KR")}`;
    const adminMedium = loadJSON<string | null>(KEY.adminPrimaryMedium, null);
    const defaultGenre = adminMedium || "A";
    const params = new URLSearchParams({
      mode: "new",
      idea: blankIdea,
      genre: defaultGenre,
      fast: "1",
      blank: "1",
    });
    router.replace(`/write?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 자동 redirect 도중에는 빈 화면 (잠깐)
  if (!checked) {
    return (
      <main className="main">
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-4)", fontSize: 13 }}>
          ⏳ 마지막 작품 불러오는 중…
        </div>
      </main>
    );
  }

  const continueLast = () => {
    if (!lastProject) return;
    const params = new URLSearchParams();
    if (lastProject.mode) params.set("mode", lastProject.mode);
    if (lastProject.idea) params.set("idea", lastProject.idea);
    if (lastProject.genre) params.set("genre", lastProject.genre);
    if (lastProject.project) params.set("project", lastProject.project);
    if (lastProject.from) params.set("from", lastProject.from);
    if (lastProject.fast) params.set("fast", lastProject.fast);
    router.replace(`/write?${params.toString()}`);
  };

  const lastTitle = lastProject?.project || lastProject?.idea || "";

  return (
    <main className="main">
      <Topbar
        eyebrow="WRITE — 작품 선택"
        title='어떤 <em style="font-style:italic">작품</em>을 작업할까요<span class="dot">?</span>'
        sub="이전 작품을 이어가거나, 홈에서 새로 시작하거나, 라이브러리에서 골라 들어가세요."
      />
      <div style={{
        padding: "40px 0", textAlign: "center",
        display: "flex", flexDirection: "column", gap: 16, alignItems: "center",
      }}>
        {lastProject && (
          <div style={{
            padding: "16px 20px", marginBottom: 8,
            background: "var(--card-soft)", border: "1px solid var(--coral)",
            borderRadius: 12, maxWidth: 520, textAlign: "left",
          }}>
            <div style={{ fontSize: 11, color: "var(--coral)", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>
              마지막 작업 작품
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-1)", marginBottom: 4, lineHeight: 1.5 }}>
              {lastTitle.length > 60 ? lastTitle.slice(0, 58) + "…" : lastTitle || "(제목 없음)"}
            </div>
            {lastProject.savedAt && (
              <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                {new Date(lastProject.savedAt).toLocaleString("ko-KR")}
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {lastProject && (
            <button onClick={continueLast} className="btn btn-coral" style={{ cursor: "pointer" }}>
              이어가기 →
            </button>
          )}
          <a href="/" className="btn" style={{ textDecoration: "none" }}>홈으로 — 새 작품 시작</a>
          <a href="/library" className="btn" style={{ textDecoration: "none" }}>라이브러리에서 선택</a>
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

// 라이브러리 자동 등록용 — library/page.tsx의 LibraryWork와 동일 구조.
interface LibraryWorkLite {
  id: number | string;
  title: string;
  genre: string;
  letter: string;
  stage: string;
  prog: number;
  updated: string;
  size: string;
  next?: string;
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

  // ★ early return은 모든 hook 다음으로 — React Rules of Hooks 위반 방지.
  //   (NoProjectGate redirect는 useEffect로 처리해서 hook 순서 일정 유지)
  const showNoProjectGate = !mode && !isDemo;

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
    if (isDirectMode) return true;
    if (mode === "continue" || mode === "adapt-same" || mode === "adapt-cross") return true;
    // ★ 사장님 명시: /write는 본문 + 채팅 작업창. 의뢰서 폼 X.
    //   mode=new + idea 있으면 = 무조건 본문 모드 (의뢰서는 /develop에서만).
    //   plan=1 명시 시만 = 의뢰서 폼 (drama·영화·웹툰 등 매체별 사전 입력 강제 케이스).
    if (mode === "new" && ideaParam && !isPlanMode) return true;
    if (storageKey) {
      const saved = loadJSON<PersistedProject | null>(storageKey, null);
      if (saved) {
        if (saved.briefDone) return true;
        if (saved.paras && saved.paras.length > 0) return true;
        if (saved.mediumFields && Object.keys(saved.mediumFields).length > 0) return true;
        if (saved.updatedAt) return true;
      }
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
  // ★ AI streaming abort용 — ⏸ 잠깐 버튼이 진짜 abort 호출하도록.
  const aiAbortRef = useRef<AbortController | null>(null);
  // ★ AI 호출 진행 중 표시 — 스탑 버튼 노출 통제.
  const [aiBusy, setAiBusy] = useState(false);

  // 변경 시 자동 저장 (debounced) + 마지막 작품 키 기록 + 라이브러리 동기화
  useEffect(() => {
    if (!storageKey) return;
    if (isDemo) return; // demo는 라이브러리 등록 X
    if (!persistKey) return;
    const timer = setTimeout(() => {
      const snapshot: PersistedProject = {
        work, notes, flow, paras, chat,
        mediumFields,
        briefDone,
        updatedAt: new Date().toISOString(),
      };
      saveJSON(storageKey, snapshot);
      // 마지막 작품 정보 — 빈 mode 진입 시 복원할 query 저장
      saveJSON(KEY.writeLastProject, {
        mode, idea: ideaParam, genre: genreParam, project: projectParam,
        from: searchParams.get("from") || "",
        fast: searchParams.get("fast") || "",
        savedAt: new Date().toISOString(),
      });
      // 라이브러리 자동 동기화 — id=persistKey 일관 사용 (mode=new/continue 모두 같은 키로 읽음)
      const totalChars = paras.reduce((sum, p) => sum + (p.text?.length || 0), 0);
      const writtenParas = paras.filter(p => p.text && p.text.trim()).length;
      const isStreaming = paras.some(p => p.status === "streaming");
      const stage = !briefDone ? "기획"
        : isStreaming ? "집필 중"
        : writtenParas === 0 ? "기획"
        : writtenParas < 3 ? "트리트먼트"
        : "집필 중";
      // 진척도: 매체별 표준 분량 5000자 기준 (대략) — 실제 기준은 추후 매체별 조정
      const prog = Math.min(1, totalChars / 5000);
      const today = new Date();
      const updatedStr = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
      const newWork: LibraryWorkLite = {
        id: persistKey,
        title: work.title || ideaParam.slice(0, 40) || "(제목 없음)",
        genre: wf.name,
        letter: genreParam,
        stage,
        prog,
        updated: updatedStr,
        size: totalChars > 0 ? `${totalChars.toLocaleString()}자` : "—",
        next: paras.find(p => p.status === "pending")?.label,
      };
      const libworks = loadJSON<LibraryWorkLite[]>(KEY.libraryWorks, []);
      const idx = libworks.findIndex(w => w.id === newWork.id);
      if (idx >= 0) libworks[idx] = { ...libworks[idx], ...newWork };
      else libworks.push(newWork);
      saveJSON(KEY.libraryWorks, libworks);

      // ★ 메모리 시스템 — 작품별 .md 파일 자동 누적 (백그라운드 Claude들이 매 호출 read).
      //   사장님 명시: 끄지 않는 동안 = 같은 클로드처럼 일관 + 다음 진입 시도 .md 영구 보관.
      try {
        const developRaw = window.localStorage.getItem("storyMaker.developHandoff");
        const dev = developRaw ? JSON.parse(developRaw) : {};
        const bodyText = paras
          .filter(p => p.text && p.text.trim())
          .map(p => p.text)
          .join("\n\n");
        const noteText = notes
          .filter(n => n.label)
          .map(n => `- ${n.label}`)
          .join("\n");
        const chatText = chat
          .map(m => `[${m.role === "writer" ? "작가" : "보조작가"} · ${m.t}]\n${m.text}`)
          .join("\n\n---\n\n");
        const fields = Object.entries(mediumFields || {})
          .filter(([, v]) => v != null && v !== "" && (!Array.isArray(v) || v.length > 0))
          .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\n");

        const stamp = new Date().toLocaleString("ko-KR");
        const memoryFiles: Record<string, string> = {
          "01_info.md": `# ${work.title || "(가제)"}\n\n` +
            `- 매체: ${wf.letter}. ${wf.name} (${wf.export_format})\n` +
            `- 작가 작업: ${stamp}\n` +
            `- 작품 키: ${persistKey}\n\n` +
            (fields ? `## 의뢰 정보\n${fields}\n` : ""),
          "02_brief.md": `# 사전 자료 (제목·로그라인·시놉시스·캐릭터·기승전결)\n\n` +
            (dev.title ? `## 제목 후보\n${dev.title}\n\n` : "") +
            (dev.logline ? `## 로그라인\n${dev.logline}\n\n` : "") +
            (dev.theme ? `## 주제\n${dev.theme}\n\n` : "") +
            (dev.synopsis ? `## 시놉시스\n${dev.synopsis}\n\n` : "") +
            (dev.characters ? `## 캐릭터\n${dev.characters}\n\n` : "") +
            (dev.structure ? `## 기승전결\n${dev.structure}\n\n` : ""),
          "03_body.md": `# 본문 (${bodyText.length.toLocaleString()}자, ${paras.length}단락)\n\n${bodyText}`,
          "04_notes.md": `# 작가 디렉션·메모\n\n${noteText || "(없음)"}\n`,
          "05_chat.md": `# 작가-보조작가 대화 로그\n\n${chatText || "(없음)"}\n`,
        };
        // fire-and-forget — 자동 저장은 = 실패해도 UI 막지 X
        fetch("/api/memory/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ workId: persistKey, files: memoryFiles }),
        }).catch(() => { /* ignore */ });
      } catch { /* ignore — 메모리 저장 실패는 localStorage 자동 저장 막지 X */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [storageKey, work, notes, flow, paras, chat, mediumFields, briefDone, persistKey, isDemo, wf]);

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
    aiAbortRef.current = controller; // ★ 외부 스탑 버튼이 abort할 수 있도록 ref에 박음
    setAiBusy(true);
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

    // ★ 한 클로드 conversation 모델 — 옛 turn 누적해서 보냄 (prompt cache 1h TTL = 입력 토큰 1/10)
    const initConv = persistKey
      ? loadJSON<WorkConversation>(KEY.workConversation(persistKey), { workId: persistKey, messages: [], updatedAt: 0 })
      : null;
    const initUserSummary = `[${apiMode}] ${ideaParam}`.slice(0, 200);

    (async () => {
      try {
        const res = await streamFetch({
            mode: apiMode,
            idea: ideaParam,
            genreLetter: genreParam,
            mediumFields,
            fast: true,
            ...(persistKey ? { workId: persistKey } : {}),
            ...(initConv ? { conversationMessages: initConv.messages } : {}),
            ...(developPrior ? { prior: developPrior } : {}),
        }, { signal: controller.signal });
        if (!res.body) throw new Error("응답 없음");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let firstDelta = true;
        let convCollected = ""; // ★ workConversation 누적용 (응답 다 받은 후 saveJSON)

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
                convCollected += data.text;
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
                  // 본문에서 인사·메타 보고(머리)와 분석(꼬리) 분리 — 둘 다 채팅으로
                  // + 본문을 빈 줄 단위 단락으로 자동 split (V1처럼 각 단락마다 액션 버튼)
                  let introToChat: string | null = null;
                  let notesToChat: string | null = null;
                  setParas(prev => {
                    const first = prev[0];
                    if (!first) return prev;
                    let body = first.text;

                    // 1) 꼬리: ===AI_NOTES=== 마커로 분석 분리
                    const NOTES_MARKER = /\n*={3,}\s*AI[_\s]?NOTES\s*={3,}\n*/i;
                    const notesMatch = body.match(NOTES_MARKER);
                    if (notesMatch && notesMatch.index !== undefined) {
                      notesToChat = body.slice(notesMatch.index + notesMatch[0].length).trim();
                      body = body.slice(0, notesMatch.index).trimEnd();
                    }

                    // 2) 머리: 첫 "S#" 또는 "FADE IN" 만나기 전 = 인사·메타 보고
                    const SCRIPT_START = /(?:^|\n)\s*(?:#+\s*)?(?:S#\d+|FADE IN|FADE-IN|FADE\s+IN:|페이드\s*인)/i;
                    const startMatch = body.match(SCRIPT_START);
                    if (startMatch && startMatch.index !== undefined && startMatch.index > 50) {
                      introToChat = body.slice(0, startMatch.index).trim();
                      body = body.slice(startMatch.index).trim();
                    }

                    // 3) 본문을 빈 줄 단위 단락으로 split — 지문·대사·씬 헤딩마다 별도 단락
                    const blocks = body
                      .split(/\n\s*\n+/)
                      .map(b => b.trim())
                      .filter(Boolean);

                    if (blocks.length === 0) {
                      return prev.map((x, i) => i === 0
                        ? { ...x, text: body, status: "done" as const, streamTarget: undefined }
                        : x);
                    }

                    const detectLabel = (block: string): string => {
                      const firstLine = block.split("\n")[0].trim();
                      const sceneMatch = firstLine.match(/^(?:#+\s*)?(S#\d+\.?|S\.\d+\.?)/i);
                      if (sceneMatch) return sceneMatch[1].replace(/\.$/, "");
                      if (/^FADE\s+(IN|OUT)/i.test(firstLine)) return "전환";
                      if (/^CUT\s+TO/i.test(firstLine)) return "컷";
                      // 들여쓰기 캐릭터 대사: 공백 또는 탭 후 한글/영문 이름
                      if (/^\s{4,}[가-힣A-Z]{1,8}(\s|$|\()/.test(block) || /^[가-힣A-Z]{1,8}\s*\(.*\)$/.test(firstLine)) {
                        const m = firstLine.match(/[가-힣A-Z]+/);
                        return m ? `대사 — ${m[0]}` : "대사";
                      }
                      return "지문";
                    };

                    return blocks.map((block, i) => ({
                      id: `p_${Date.now()}_${i}`,
                      n: i + 1,
                      label: detectLabel(block),
                      text: block,
                      status: "done" as const,
                      streamTarget: undefined,
                    }));
                  });
                  // 인사 메시지만 채팅에 — 자가분석(notesToChat)은 사장님 명시: 채팅에 박지 X
                  const chatAdditions: ChatMsg[] = [];
                  if (introToChat) {
                    chatAdditions.push({
                      id: "ai_intro_" + Date.now(),
                      role: "ai",
                      text: introToChat as string,
                      t: "방금",
                    });
                  }
                  // notesToChat (===AI_NOTES=== 마커 아래 자가검증·분석) = drop. UI 노출 X.
                  if (chatAdditions.length > 0) {
                    setChat(prev => [...prev, ...chatAdditions]);
                  }
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
        // ★ workConversation 누적 — 응답 끝난 후
        if (persistKey && initConv && convCollected.trim()) {
          const updated = appendTurns(initConv, [
            { role: "user", content: initUserSummary },
            { role: "assistant", content: convCollected },
          ]);
          saveJSON(KEY.workConversation(persistKey), {
            workId: persistKey,
            messages: updated.messages,
            compactedSummary: updated.compactedSummary,
            updatedAt: Date.now(),
          });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "네트워크 오류";
        setChat(prev => [...prev, {
          id: "err_" + Date.now(), role: "ai", text: `⚠ 호출 실패: ${msg}`, t: "방금",
        }]);
      } finally {
        if (!cancelled) setAiBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      setAiBusy(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, mode, ideaParam, genreParam, wasRestored, briefDone, actionParam]);

  const onRewrite = (id: string) => {
    setParas(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, text: "", status: "streaming" };
    }));
  };

  // 작가 직접 수정 — 단락 텍스트 그대로 저장
  const onEditPara = (id: string, newText: string) => {
    setParas(prev => prev.map(p => p.id === id ? { ...p, text: newText } : p));
  };

  // ★ 전체 수정 — 본문 통째로 받아서 빈 줄 기준 단락 자동 분리
  const onEditAllParas = (fullText: string) => {
    const blocks = fullText
      .split(/\n\s*\n+/)
      .map(b => b.trim())
      .filter(Boolean);
    if (blocks.length === 0) return;
    setParas(prev => {
      // 기존 paras의 라벨이 있으면 유지 (단락 갯수 같을 때만), 아니면 자동 라벨
      return blocks.map((block, i) => ({
        id: `p_edit_${Date.now()}_${i}`,
        n: i + 1,
        label: prev[i]?.label || "수정",
        text: block,
        status: "done" as const,
      }));
    });
  };

  // 본문 다운로드 (워드/텍스트) — 단락 라벨 X, 본문만 자연스러운 흐름.
  // (라벨 "S#1"/"지문"/"대사"는 UI 표시용 — 다운로드 결과물엔 노출 X.
  //  본문 안에 박힌 매체별 표준 헤더 — S#1/[컷1]/[1막 1장] 등 — 만 그대로 흐름.)
  const onDownloadScript = (format: "docx" | "txt") => {
    const body = paras
      .filter(p => p.text && p.text.trim())
      .map(p => p.text)
      .join("\n\n");
    if (!body.trim()) {
      alert("아직 작성된 본문이 없습니다.");
      return;
    }
    const filename = (work.title || "대본") + "_" + new Date().toISOString().slice(0, 10);
    if (format === "docx") downloadDocx(body, filename);
    else downloadTxt(body, filename);
  };

  // 더 쓰기 — 이 단락 다음에 새 단락 추가 + AI 호출
  const onContinuePara = (id: string) => {
    setParas(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      const newId = "p_" + Date.now();
      const newPara: Para = {
        id: newId,
        n: prev.length + 1,
        label: "이어쓰기",
        text: "",
        status: "streaming",
      };
      return [...prev.slice(0, idx + 1), newPara, ...prev.slice(idx + 1)];
    });
  };

  const addNote = (label: string) => {
    if (!label.trim()) return;
    setNotes(prev => [...prev, { id: "n" + Date.now(), label: label.trim() }]);
  };
  const removeNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setChat(prev => [...prev, { id: "m" + Date.now(), role: "writer", text, t: "방금" }]);
    setInput("");

    // 작가 노트 자동 캡처 (이름 변경 패턴)
    if (text.match(/이름.*[을를].*(\w+)으?로/i) || text.match(/(\w+)으?로 바[꿔까]/i)) {
      addNote(text.length < 30 ? text : text.slice(0, 28) + "…");
    }

    // ★ 채팅 = 본문 컨트롤. 모든 메시지 → script mode 호출 + 새 단락 추가
    //   (단순 대화 X. 작가 디렉션이 본문에 즉시 반영되어야 채팅의 의미)
    const currentScript = paras
      .filter(p => p.text && p.text.trim())
      .map(p => p.text)
      .join("\n\n");

    const newPara: Para = {
      id: "p_" + Date.now(),
      n: paras.length + 1,
      label: "이어쓰기",
      text: "",
      status: "streaming",
    };
    setParas(prev => [...prev, newPara]);

    setChat(prev => [...prev, {
      id: "m_ack_" + Date.now(),
      role: "ai",
      text: "디렉션 반영해서 본문 이어 작성 중...",
      t: "방금"
    }]);

    const ac = new AbortController();
    aiAbortRef.current = ac; // ★ 외부 ⏸ 잠깐 버튼이 이 코멘트 호출도 abort 가능하도록
    setAiBusy(true);
    // 작가노트의 디렉션·메모 = AI에 모두 prior로 전달 (이게 없으면 = 작가가 박은 디렉션 무시됨)
    const writerNotes = notes
      .filter(n => n.label && n.label.trim())
      .map(n => `- ${n.label}`)
      .join("\n");
    // develop에서 만든 사전 자료 (시놉시스·캐릭터·트리트먼트 등) — 매 호출에 박아야 AI가 인지
    let developPrior: Record<string, string> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("storyMaker.developHandoff");
        if (raw) developPrior = JSON.parse(raw);
      } catch { /* ignore */ }
    }
    // ★ 작가-AI 옛 대화 누적 (사장님 명시: "한 클로드"가 작품을 기억하게).
    //   chat 마지막 N개 = prior. 토큰 절약 위해 = 각 메시지 500자 truncate.
    const recentChat = chat
      .slice(-12) // 최근 12개 (작가 6 + AI 6 정도)
      .filter(m => m.text && m.text.trim())
      .map(m => {
        const who = m.role === "writer" ? "작가" : "보조작가";
        const txt = m.text.length > 500 ? m.text.slice(0, 500) + "...(이하 생략)" : m.text;
        return `[${who}] ${txt}`;
      })
      .join("\n\n");
    // ★ 한 클로드 conversation 모델 — 옛 turn 누적 (prompt cache 1h TTL)
    const sendConv = persistKey
      ? loadJSON<WorkConversation>(KEY.workConversation(persistKey), { workId: persistKey, messages: [], updatedAt: 0 })
      : null;
    const sendUserSummary = `[작가 디렉션] ${text}`.slice(0, 200);
    try {
      const res = await streamFetch({
          mode: "script",
          idea: ideaParam,
          genreLetter: genreParam,
          mediumFields,
          fast: true,
          ...(persistKey ? { workId: persistKey } : {}),
          ...(sendConv ? { conversationMessages: sendConv.messages } : {}),
          prior: {
            ...developPrior, // 시놉시스·캐릭터·트리트먼트·기승전결 등 (있을 때만)
            "지금까지 본문": currentScript || "(없음)",
            ...(writerNotes ? { "작가 디렉션·메모 (작가노트 — 모든 응답에 반영)": writerNotes } : {}),
            ...(recentChat ? { "작가-보조작가 옛 대화 (최근 12개 — 옛 디렉션도 다 인지하고 작업)": recentChat } : {}),
            "작가 디렉션 (이번 요청)": text,
          },
      }, { signal: ac.signal });
      if (!res.body) throw new Error("응답 없음");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let collected = "";
      let firstD = true;
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
          if (!eventType || !dataLine) continue;
          try {
            const data = JSON.parse(dataLine);
            if (eventType === "delta" && data.text) {
              collected += data.text;
              setParas(prev => prev.map(p =>
                p.id === newPara.id ? { ...p, text: firstD ? data.text : p.text + data.text } : p
              ));
              firstD = false;
            } else if (eventType === "done") {
              // 마커 분리 (본문/분석)
              const NOTES_MARKER = /\n*={3,}\s*AI[_\s]?NOTES\s*={3,}\n*/i;
              const m = collected.match(NOTES_MARKER);
              let bodyOnly = collected;
              let notesPart: string | null = null;
              if (m && m.index !== undefined) {
                bodyOnly = collected.slice(0, m.index).trimEnd();
                notesPart = collected.slice(m.index + m[0].length).trim();
              }
              setParas(prev => prev.map(p =>
                p.id === newPara.id
                  ? { ...p, text: bodyOnly, status: "done" as const }
                  : p
              ));
              if (notesPart) {
                setChat(prev => [...prev, {
                  id: "ai_notes_" + Date.now(),
                  role: "ai",
                  text: "📋 자가 검증·분석\n\n" + notesPart,
                  t: "방금"
                }]);
              }
            } else if (eventType === "error") {
              setChat(prev => [...prev, {
                id: "err_" + Date.now(), role: "ai",
                text: `⚠ AI 호출 오류: ${data.message}`, t: "방금"
              }]);
              setParas(prev => prev.map(p =>
                p.id === newPara.id ? { ...p, status: "done" as const } : p
              ));
            }
          } catch { /* ignore */ }
        }
      }
      // ★ workConversation 누적
      if (persistKey && sendConv && collected.trim()) {
        const updated = appendTurns(sendConv, [
          { role: "user", content: sendUserSummary },
          { role: "assistant", content: collected },
        ]);
        saveJSON(KEY.workConversation(persistKey), {
          workId: persistKey,
          messages: updated.messages,
          compactedSummary: updated.compactedSummary,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setAiBusy(false);
        setParas(prev => prev.map(p =>
          p.id === newPara.id ? { ...p, status: "done" as const } : p
        ));
        return;
      }
      const msg = err instanceof Error ? err.message : "네트워크 오류";
      setChat(prev => [...prev, {
        id: "err_" + Date.now(), role: "ai", text: `⚠ 호출 실패: ${msg}`, t: "방금"
      }]);
      setParas(prev => prev.map(p =>
        p.id === newPara.id ? { ...p, status: "done" as const } : p
      ));
    } finally {
      setAiBusy(false);
    }
  };

  // 의뢰 분석 폼 vs 본문 모드 — early return 시 hook 순서 어긋나니까 = flag만 잡고 return은 끝에서
  const showBriefForm = mode === "new" && !briefDone && !isDemo;

  // 좌우 리사이즈 — 워크북 너비 (drag로 조절). ★ early return 위에 박아야 hook 순서 안전
  const [workbookWidth, setWorkbookWidth] = useState<number>(320);
  useEffect(() => {
    const saved = loadJSON<number | null>(KEY.writeWorkbookWidth, null);
    if (saved && saved >= 240 && saved <= 720) setWorkbookWidth(saved);
  }, []);

  // ─── 의뢰 분석 폼 렌더 (briefDone === false 일 때만) ───
  if (showBriefForm) {
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

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = workbookWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const next = Math.max(240, Math.min(720, startW + delta));
      setWorkbookWidth(next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // localStorage에 최종 너비 저장
      setWorkbookWidth(w => { saveJSON(KEY.writeWorkbookWidth, w); return w; });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // 작품 선택 안내 화면 — mode 없고 demo 아니면 (모든 hook 호출 끝난 후 분기)
  if (showNoProjectGate) {
    return <NoProjectGate />;
  }

  return (
    <main className="main write-live">
      <div
        className={"write-shell" + (bookOpen ? " book-open" : " book-closed")}
        style={bookOpen ? { gridTemplateColumns: `minmax(0, 1fr) 6px ${workbookWidth}px` } : undefined}
      >
        <WriteCanvas
          work={work}
          paras={paras}
          paused={paused}
          onPauseToggle={() => {
            // 🛑 중지 — AI streaming 즉시 abort + 현재 streaming 단락을 done으로
            aiAbortRef.current?.abort();
            setAiBusy(false);
            setParas(prev => prev.map(p =>
              p.status === "streaming"
                ? { ...p, status: "done" as const, streamTarget: undefined }
                : p
            ));
            setPaused(true);
          }}
          onRewrite={onRewrite}
          onEdit={onEditPara}
          onEditAll={onEditAllParas}
          onContinue={onContinuePara}
          onDownload={onDownloadScript}
          aiBusy={aiBusy}
          bookOpen={bookOpen}
          onBookToggle={() => setBookOpen(!bookOpen)}
          notesCount={notes.length}
        />

        {bookOpen && (
          <>
            <div
              onMouseDown={onResizeStart}
              title="좌우 너비 조절"
              style={{
                width: 6,
                cursor: "col-resize",
                background: "var(--line)",
                opacity: 0.4,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "var(--coral)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.background = "var(--line)"; }}
            />
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
              mediumLabel={`${wf.letter}. ${wf.name}`}
            />
          </>
        )}
      </div>
    </main>
  );
}
