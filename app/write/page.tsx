"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { WriteCanvas, type Para, type WorkInfo } from "@/components/WriteCanvas";
import { WriteWorkbook, type Note, type FlowItem, type ChatMsg } from "@/components/WriteWorkbook";

export default function WritePage() {
  return (
    <AppShell>
      <WriteMain />
    </AppShell>
  );
}

function WriteMain() {
  // 데모 작품 컨텍스트 — 실제 진입 시 URL params or DB로 교체
  const work: WorkInfo = {
    title: "달빛 정원",
    chapter: "4화",
    elapsed: "12분째 작성 중",
    medium: "B. TV 드라마 · 16부 미니",
  };

  // 작가 노트 (지속 디렉션)
  const [notes, setNotes] = useState<Note[]>([
    { id: "n1", label: "주인공: 도윤 (1인칭)" },
    { id: "n2", label: "톤: 어둡고 절제된" },
    { id: "n3", label: "결말: 비극, 여운" },
    { id: "n4", label: "매체: TV 드라마 16부" },
  ]);

  // AI 작업 흐름
  const [flow] = useState<FlowItem[]>([
    { id: "f1", state: "done",    title: "캐릭터 정리",      hint: "도윤·서아·정원사 — 동기 정리 완료" },
    { id: "f2", state: "done",    title: "1~3화 흐름 점검",  hint: "비밀의 정원 발견까지 — 호흡 OK" },
    { id: "f3", state: "active",  title: "4화 갈등축 잡기",  hint: "지금: 옥상 vs 정원 공간 모티프 결정 중" },
    { id: "f4", state: "pending", title: "4화 본문 집필",    hint: "단락 6~12 · 호흡 1.5쪽" },
    { id: "f5", state: "pending", title: "다음 화 시드",     hint: "5화 첫 후크 한 줄" },
  ]);

  // 단락
  const initialParas: Para[] = [
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
  const [paras, setParas] = useState<Para[]>(initialParas);
  const [paused, setPaused] = useState(false);

  // 워크북 패널 토글 (1100px 미만 기본 숨김)
  const [bookOpen, setBookOpen] = useState<boolean>(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBookOpen(window.innerWidth >= 1100);
    }
  }, []);

  // 라이브 대화
  const [chat, setChat] = useState<ChatMsg[]>([
    { id: "m1", role: "ai",     text: "달빛 정원 4화 시작할게요. 작가 노트 4개 모두 반영합니다.", t: "12분 전" },
    { id: "m2", role: "writer", text: "옥상 장면이 너무 클리셰야. 다른 공간 제안해줘", t: "8분 전" },
    { id: "m3", role: "ai",     text: "네, 옥상 대신 폐쇄된 정원 안쪽 — 발자국 모티프로 갈게요. 3단락 다시 썼습니다.", t: "7분 전" },
    { id: "m4", role: "writer", text: "좋아. 4단락은 정적인 묘사 대신 균열을 강조해줘", t: "방금" },
  ]);
  const [input, setInput] = useState("");

  // 스트리밍 시뮬 — 실제 배포 시 /api/agent/stream SSE로 교체
  useEffect(() => {
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
  }, [paras, paused]);

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
