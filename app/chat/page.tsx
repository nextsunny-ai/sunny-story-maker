"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { Field, Btn } from "@/components/ui";
import { streamAgent } from "@/lib/stream-agent";
import { KEY, loadJSON } from "@/lib/persist";
import { GENRES } from "@/lib/genres";

interface Message {
  id: string;
  from: "writer" | "ai";
  text: string;
}

export default function ChatPage() {
  return (
    <AppShell>
      <ChatMain />
    </AppShell>
  );
}

function ChatMain() {
  const I = ICONS;

  // 보조작가 이름 — admin에서 설정. 미설정 시 default "소리"
  const [assistantName, setAssistantName] = useState("소리");
  useEffect(() => {
    const saved = loadJSON<string | null>(KEY.adminAssistantName, null);
    if (saved && saved.trim()) setAssistantName(saved.trim());
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    { id: "seed1", from: "ai", text: "" },
  ]);
  // assistantName 결정되면 인사 멘트 적용 (한 번만)
  useEffect(() => {
    setMessages(prev => prev.length === 1 && prev[0].id === "seed1"
      ? [{ id: "seed1", from: "ai", text: `안녕하세요 작가님, 보조작가 ${assistantName}입니다. 막히는 부분이나 궁금한 자료, 편하게 말씀해 주세요.` }]
      : prev);
  }, [assistantName]);

  const [input, setInput] = useState("");
  const [project, setProject] = useState("");
  const [mediumLetter, setMediumLetter] = useState<string>("A");
  const currentGenre = GENRES.find(g => g.letter === mediumLetter) ?? GENRES[0];
  const medium = `${currentGenre.name} (${currentGenre.sub})`;
  const [memo, setMemo] = useState("");
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
      const { isFastModel } = await import("@/lib/storymaker/model-prefs");
      await streamAgent({
        body: {
          mode: "collaborate",
          stage: "chat",
          fast: isFastModel("chat"),
          genreLetter: mediumLetter,
          userInput: {
            content: text,
            assistantName,
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
        eyebrow="보조작가 — 대화 · 아이디어 · 자료조사"
        title='보조<em style="font-style:italic">작가</em>'
        sub="막힐 때마다 한 줄 묻고, 한 줄 받고, 다시 본문으로."
      />

      <div className="write-grid">
        <aside className="write-aside">
          <div className="aside-block">
            <div className="aside-h">지금 쓰는 작품</div>
            <Field label="작품">
              <input
                className="field-input"
                value={project}
                onChange={e => setProject(e.target.value)}
                placeholder="작품명"
              />
            </Field>
            <Field label="매체">
              <select
                className="field-select"
                value={mediumLetter}
                onChange={e => setMediumLetter(e.target.value)}
              >
                {GENRES.map(g => (
                  <option key={g.letter} value={g.letter}>{g.name} — {g.sub}</option>
                ))}
              </select>
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
            <div className="aside-h">이런 걸 도와드려요</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.85 }}>
              <div><strong style={{ color: "var(--ink-2)" }}>대화</strong> · 막힐 때 한 줄 의논</div>
              <div><strong style={{ color: "var(--ink-2)" }}>아이디어</strong> · 이름·비유·장면</div>
              <div><strong style={{ color: "var(--ink-2)" }}>자료조사</strong> · 시대·풍속·직업</div>
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
                  {m.from === "writer" ? "나" : `보조작가 ${assistantName}`}
                </div>
                <div style={{
                  maxWidth: "78%",
                  padding: "12px 16px",
                  borderRadius: m.from === "writer" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.from === "writer" ? "var(--coral-soft)" : "var(--bg-soft)",
                  color: "var(--ink-2)",
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  whiteSpace: m.from === "writer" ? "pre-wrap" : "normal",
                  border: "1px solid " + (m.from === "writer" ? "rgba(238,110,85,0.15)" : "var(--line)"),
                }}>
                  {m.from === "ai"
                    ? (m.text ? <Markdown text={m.text} compact /> : (busy ? "…" : ""))
                    : m.text}
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
              placeholder="보조작가에게 말 걸기 — 이름·대사·장면·자료 무엇이든"
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
