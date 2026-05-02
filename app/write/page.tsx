"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { WriteCanvas, type Para, type WorkInfo } from "@/components/WriteCanvas";
import { WriteWorkbook, type Note, type FlowItem, type ChatMsg } from "@/components/WriteWorkbook";

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

// ───── mode=new: 빈 캔버스 + 첫 단락만 streaming ─────
function buildNewWorkContext(idea: string, genreLetter: string): Ctx {
  const genre = GENRES.find(g => g.letter === genreLetter) || GENRES[0];
  const titlePreview = idea
    ? idea.split(/[.,\s]/).filter(Boolean).slice(0, 4).join(" ").slice(0, 24)
    : "새 작품";

  return {
    work: { title: titlePreview, chapter: "초안", elapsed: "방금 시작", medium: `${genre.letter}. ${genre.name}` },
    notes: idea
      ? [{ id: "n_idea", label: `핵심: ${idea.length > 30 ? idea.slice(0, 28) + "…" : idea}` },
         { id: "n_genre", label: `매체: ${genre.name}` }]
      : [{ id: "n_genre", label: `매체: ${genre.name}` }],
    flow: [
      { id: "f1", state: "active",  title: "아이디어 분석", hint: "한 줄 컨셉 → 인물·욕망·장애물 추출" },
      { id: "f2", state: "pending", title: "로그라인 잡기", hint: "1줄 컨셉 확정" },
      { id: "f3", state: "pending", title: "첫 단락 집필", hint: "분위기·시점 결정" },
      { id: "f4", state: "pending", title: "갈등축 설계",   hint: "1·2·3장 비트" },
      { id: "f5", state: "pending", title: "초안 마무리",   hint: "단락 5~10" },
    ],
    paras: idea
      ? [
          { id: "p1", n: 1, label: "오프닝", text: "", status: "streaming",
            streamTarget: `[${genre.name}] AI 작가가 "${idea}" 컨셉으로 첫 단락을 쓰는 중입니다. 잠시만 기다려 주세요…` },
          { id: "p2", n: 2, label: "도입",  text: "", status: "pending" },
          { id: "p3", n: 3, label: "사건",  text: "", status: "pending" },
        ]
      : [
          { id: "p1", n: 1, label: "첫 단락", text: "", status: "pending" },
        ],
    chat: idea
      ? [{ id: "m_init", role: "ai",
           text: `좋습니다. "${idea}" 컨셉으로 ${genre.name} 작품 시작할게요. 막히면 우측에서 바로 끼어들어 주세요.`, t: "방금" }]
      : [{ id: "m_init", role: "ai",
           text: `${genre.name} 작품 준비 완료. 우측에 한 줄 아이디어 적어주시면 첫 단락부터 시작합니다.`, t: "방금" }],
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
      <div style={{
        padding: "120px 24px", textAlign: "center", color: "var(--ink-3)",
        display: "flex", flexDirection: "column", gap: 16, alignItems: "center",
      }}>
        <div style={{ fontSize: 14, color: "var(--ink-5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          작품을 먼저 선택해주세요
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", lineHeight: 1.4 }}>
          어떤 작품을 작업할까요?
        </div>
        <div style={{ fontSize: 14, color: "var(--ink-3)", maxWidth: 460, lineHeight: 1.6 }}>
          새 작품은 홈에서 한 줄 아이디어로 시작하거나, 라이브러리에서 진행 중인 작품을 선택해주세요.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
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

function WriteMain() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const ideaParam = searchParams.get("idea") || "";
  const genreParam = searchParams.get("genre") || "A";
  const projectParam = searchParams.get("project") || "";
  const isDemo = searchParams.get("demo") === "1";

  // 작품 선택 안내 화면 — mode 없고 demo 아니면
  if (!mode && !isDemo) {
    return <NoProjectGate />;
  }

  // 컨텍스트 빌드
  const initial = (() => {
    if (isDemo) {
      return { work: DEMO_WORK, notes: DEMO_NOTES, flow: DEMO_FLOW, paras: DEMO_PARAS, chat: DEMO_CHAT };
    }
    if (mode === "new") {
      return buildNewWorkContext(ideaParam, genreParam);
    }
    if (mode === "continue") {
      // TODO: DB에서 project fetch. 지금은 idea가 project 이름이라 가정한 빈 캔버스
      return buildContinueContext(projectParam || ideaParam || "이어쓰기");
    }
    if (mode === "adapt-same" || mode === "adapt-cross") {
      return buildAdaptContext(mode, projectParam, genreParam, searchParams.get("target") || "F");
    }
    // fallback
    return buildNewWorkContext(ideaParam, genreParam);
  })();
  const isNewWork = mode === "new" || mode === "continue" || mode === "adapt-same" || mode === "adapt-cross";

  const [work] = useState<WorkInfo>(initial.work);
  const [notes, setNotes] = useState<Note[]>(initial.notes);
  const [flow] = useState<FlowItem[]>(initial.flow);
  const [paras, setParas] = useState<Para[]>(initial.paras);
  const [chat, setChat] = useState<ChatMsg[]>(initial.chat);
  const [paused, setPaused] = useState(false);
  const [input, setInput] = useState("");

  // 워크북 패널 토글
  const [bookOpen, setBookOpen] = useState<boolean>(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBookOpen(window.innerWidth >= 1100);
    }
  }, []);

  // 스트리밍 시뮬 — TODO: /api/agent/stream SSE로 교체
  useEffect(() => {
    if (paused) return;
    const streamingIdx = paras.findIndex(p => p.status === "streaming");
    if (streamingIdx === -1) return;
    const p = paras[streamingIdx];
    if (!p.streamTarget) return;
    if (p.text.length >= p.streamTarget.length) {
      const next = [...paras];
      next[streamingIdx] = { ...p, status: "done" };
      // 데모 모드에서만 다음 단락 자동 전환 (새 작품은 첫 단락만 시연)
      if (!isNewWork) {
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
  }, [paras, paused, isNewWork]);

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
