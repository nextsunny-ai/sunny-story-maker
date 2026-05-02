"use client";

import { useEffect, useRef, useState } from "react";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { Field, Btn } from "@/components/ui";
import { streamAgent } from "@/lib/stream-agent";

interface Message {
  id: string;
  from: "writer" | "ai";
  text: string;
}

const QUICK_PROMPTS: Record<string, string> = {
  name: "주인공 이름 후보 5개만 추천해줘. 컨셉/직업/인상에 맞춰서.",
  line: "방금 쓴 대사 한 줄, 더 인물답게 다듬어줘. 원본은 내가 다음 메시지에 붙여넣을게.",
  meta: "이 장면에 어울리는 비유나 묘사 한 가지만 짧게 제안해줘.",
  scene: "지금 이 컨셉으로 짧은 한 컷 장면을 만들어줘. 4~6줄, 액션/대사 섞어서.",
  review: "방금 쓴 한 단락 검토해줘. 약점 1가지 + 강점 1가지 + 한 줄 제안.",
  head: "이 장면에 맞는 씬 헤딩(INT/EXT, 장소, 시간)을 한 줄로 만들어줘.",
};

export default function ChatPage() {
  return (
    <AppShell>
      <ChatMain />
    </AppShell>
  );
}

function ChatMain() {
  const I = ICONS;
  const quick = [
    { id: "name", label: "이름 짓기" },
    { id: "line", label: "대사 다듬기" },
    { id: "meta", label: "비유 / 묘사" },
    { id: "scene", label: "장면 만들기" },
    { id: "review", label: "한 단락 검토" },
    { id: "head", label: "씬 헤딩" },
  ];

  const [messages, setMessages] = useState<Message[]>([
    { id: "seed1", from: "ai", text: "안녕하세요. SUNNY 보조작가입니다. 작품·매체·메모를 좌측에서 잡아두면 더 정확하게 답해드릴게요. 한 번에 한 가지씩 물으시면 좋습니다." },
  ]);
  const [input, setInput] = useState("");
  const [project, setProject] = useState("트랑로제");
  const [medium, setMedium] = useState("TV 드라마 (16부작)");
  const [memo, setMemo] = useState("시대: 현대 서울. 주인공: 이도윤(여, 30대, 광고기획자). 첫사랑 재회 후 매일 마주침. 톤: 차분 · 무거움 · 로맨틱.");
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(() => new Date());
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const sendMessage = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;

    const userMsg: Message = { id: "u" + Date.now(), from: "writer", text };
    const aiId = "a" + Date.now();
    setMessages(prev => [...prev, userMsg, { id: aiId, from: "ai", text: "" }]);
    setInput("");
    setBusy(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await streamAgent({
        body: {
          mode: "collaborate",
          stage: "chat",
          fast: true,
          userInput: {
            content: text,
            project,
            medium,
            memo,
          },
        },
        signal: ac.signal,
        onDelta: (chunk) => {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: m.text + chunk } : m));
        },
        onError: (msg) => {
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, text: (m.text || "") + `\n\n⚠ AI 호출 오류: ${msg}` } : m
          ));
        },
      });
    } catch {
      // streamAgent 안에서 onError 처리됨
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onQuick = (id: string) => {
    const preset = QUICK_PROMPTS[id];
    if (!preset) return;
    setInput(preset);
  };

  const onClear = () => {
    if (busy) {
      abortRef.current?.abort();
    }
    setMessages([
      { id: "seed_clear", from: "ai", text: "대화가 초기화되었습니다. 새로 시작해주세요." },
    ]);
  };

  const onSave = () => {
    setSavedAt(new Date());
    if (typeof window !== "undefined") {
      try {
        const payload = { project, medium, memo, messages, savedAt: new Date().toISOString() };
        window.localStorage.setItem("sunny.chat.lastSession", JSON.stringify(payload));
      } catch {
        // localStorage 실패는 무시
      }
    }
  };

  const writerCount = messages.filter(m => m.from === "writer").length;

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — CO-WRITER"
        title='보조<em style="font-style:italic">작가</em>'
        sub="실시간 의뢰. 막힐 때마다 한 줄 묻고, 한 줄 받고, 다시 본문으로 돌아가세요."
      />

      <div className="write-grid">
        <aside className="write-aside">
          <div className="aside-block">
            <div className="aside-h">작업 컨텍스트</div>
            <Field label="작품">
              <input
                className="field-input"
                value={project}
                onChange={e => setProject(e.target.value)}
                placeholder="작품명"
              />
            </Field>
            <Field label="매체">
              <input
                className="field-input"
                value={medium}
                onChange={e => setMedium(e.target.value)}
                placeholder="예) TV 드라마 (16부작)"
              />
            </Field>
          </div>

          <div className="aside-block">
            <div className="aside-h">기억해야 할 것</div>
            <textarea
              className="field-textarea"
              rows={4}
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
            <div className="field-help">보조작가가 답할 때 항상 참고합니다.</div>
          </div>

          <div className="aside-block">
            <div className="aside-h">빠른 의뢰</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {quick.map(q => (
                <button
                  key={q.id}
                  className="btn"
                  style={{ padding: "8px 12px", fontSize: 12, justifyContent: "center" }}
                  onClick={() => onQuick(q.id)}
                  disabled={busy}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="aside-block">
            <div className="aside-h">현재 세션</div>
            <div className="kv"><div className="kv-k">메시지</div><div className="kv-v">{writerCount}</div></div>
            <div className="kv"><div className="kv-k">시작</div><div className="kv-v">{fmtTime(startedAt)}</div></div>
            <div className="kv"><div className="kv-k">저장됨</div><div className="kv-v">{savedAt ? fmtTime(savedAt) : "—"}</div></div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <Btn icon={I.trash} onClick={onClear}>비우기</Btn>
              <Btn icon={I.save} onClick={onSave}>저장</Btn>
            </div>
          </div>
        </aside>

        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            ref={scrollRef}
            style={{
              display: "flex", flexDirection: "column", gap: 14,
              padding: "24px",
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              minHeight: 460,
              maxHeight: "calc(100vh - 320px)",
              overflowY: "auto",
            }}
          >
            {messages.map((m) => (
              <div key={m.id} style={{
                display: "flex", flexDirection: "column",
                alignItems: m.from === "writer" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                  color: m.from === "writer" ? "var(--coral-deep)" : "var(--ink-5)",
                  marginBottom: 4, textTransform: "uppercase"
                }}>
                  {m.from === "writer" ? "나" : "SUNNY 보조작가"}
                </div>
                <div style={{
                  maxWidth: "78%",
                  padding: "12px 16px",
                  borderRadius: m.from === "writer" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.from === "writer" ? "var(--coral-soft)" : "var(--bg-soft)",
                  color: "var(--ink-2)",
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  border: "1px solid " + (m.from === "writer" ? "rgba(238,110,85,0.15)" : "var(--line)"),
                  fontFamily: m.from === "ai" ? "var(--font-display)" : "var(--font-ui)",
                  fontStyle: m.from === "ai" ? "italic" : "normal",
                }}>
                  {m.text || (m.from === "ai" && busy ? "…" : "")}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: 8,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            boxShadow: "var(--shadow-sm)",
          }}>
            <input
              className="field-input"
              placeholder="보조작가에게 말 걸기 — 이름·대사·장면·검토 무엇이든"
              style={{ border: "none", boxShadow: "none", background: "transparent", flex: 1 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
            />
            <button
              className="btn btn-coral"
              style={{ padding: "10px 14px", borderRadius: 999, opacity: busy ? 0.6 : 1 }}
              onClick={() => sendMessage()}
              disabled={busy || !input.trim()}
            >
              <span style={{ display: "inline-flex", width: 14, height: 14 }}>{I.send}</span>
              {busy ? "응답 중…" : "보내기"}
            </button>
          </div>

          <div style={{ fontSize: 11, color: "var(--ink-5)", textAlign: "center" }}>
            Shift + Enter 줄바꿈 · Enter 전송 · 한 번에 한 가지씩 물으면 정확합니다
          </div>
        </section>
      </div>

      <div style={{ height: 60 }}></div>
    </main>
  );
}
