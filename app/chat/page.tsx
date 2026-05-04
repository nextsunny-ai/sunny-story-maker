"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { Field, Btn } from "@/components/ui";
import { LibraryPicker } from "@/components/LibraryPicker";
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
  // 작품 본문 prior — 라이브러리에서 가져오면 자동 첨부 (AI가 작품 보면서 답함)
  const [showLibrary, setShowLibrary] = useState(false);
  const [contextBody, setContextBody] = useState("");
  const [contextWorkId, setContextWorkId] = useState<string>("");

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
      // 작품 본문 + 컨텍스트 prior (작가가 작품 가져왔을 때만 풍부하게).
      // 안 가져왔으면 = 자유 (아이디어·잡담·자료조사). 사장님 명시: 다양한 사용 케이스 인정.
      const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + "...(이하 생략)" : s;
      const prior: Record<string, string> = {};

      // ★ 사장님 명시: 작가가 메시지에 작품 제목 언급하면 = 자동으로 그 작품 메모리 read.
      //   라이브러리 작품 list에서 = title 매칭 검사. 매칭 시 = workId 자동 박음.
      let autoWorkId = contextWorkId; // 명시적 가져온 작품 우선
      if (!autoWorkId && typeof window !== "undefined") {
        try {
          const { KEY } = await import("@/lib/persist");
          const libRaw = window.localStorage.getItem(KEY.libraryWorks);
          if (libRaw) {
            const works = JSON.parse(libRaw) as Array<{ id: string; title: string; letter?: string; genre?: string }>;
            // 작가 메시지에 = 작품 title 일부(2자+) 포함되면 매칭
            for (const w of works) {
              if (!w.title) continue;
              const title = w.title.trim();
              if (title.length < 2) continue;
              // 작품명 첫 단어(공백/특수기호 split) 또는 = 전체 = 메시지에 포함되면
              const firstWord = title.split(/[\s·\-_,()「」『』""'']+/).find(t => t.length >= 2);
              if (
                text.includes(title) ||
                (firstWord && firstWord.length >= 2 && text.includes(firstWord))
              ) {
                autoWorkId = String(w.id);
                // 자동 매칭된 작품 = 메모리 prior 박음 (server route.ts가 _works/ read)
                if (w.title) prior["언급된 작품 (자동 매칭)"] = `${w.title} (${w.letter || ""}. ${w.genre || ""})`;
                break;
              }
            }
          }
        } catch { /* ignore */ }
      }

      if (contextBody.trim()) {
        prior["지금 보고 있는 작품 본문"] = trunc(contextBody, 8000);
        if (project) prior["작품명"] = project;

        // 작품 가져왔으면 = writeProject saved에서 = 작가노트·매체정보 추가 prior
        if (contextWorkId && typeof window !== "undefined") {
          try {
            const { KEY } = await import("@/lib/persist");
            const projRaw = window.localStorage.getItem(KEY.writeProject(contextWorkId));
            if (projRaw) {
              const proj = JSON.parse(projRaw);
              // 작가 노트 디렉션·메모
              if (proj.notes && Array.isArray(proj.notes) && proj.notes.length > 0) {
                const noteText = proj.notes
                  .filter((n: { label?: string }) => n.label)
                  .map((n: { label?: string }) => `- ${n.label}`)
                  .join("\n");
                if (noteText) prior["작가 디렉션·메모 (작가노트)"] = noteText;
              }
            }
            // 시놉시스·캐릭터·기승전결 (작가가 develop에서 만든 사전 자료)
            const developRaw = window.localStorage.getItem("storyMaker.developHandoff");
            if (developRaw) {
              const dev = JSON.parse(developRaw);
              const devParts: string[] = [];
              if (dev.title) devParts.push(`제목: ${dev.title}`);
              if (dev.logline) devParts.push(`로그라인: ${dev.logline}`);
              if (dev.theme) devParts.push(`주제: ${dev.theme}`);
              if (dev.synopsis) devParts.push(`시놉시스:\n${trunc(dev.synopsis, 2000)}`);
              if (dev.characters) devParts.push(`캐릭터:\n${trunc(dev.characters, 2000)}`);
              if (dev.structure) devParts.push(`기승전결:\n${trunc(dev.structure, 2000)}`);
              if (devParts.length > 0) {
                prior["사전 자료 (제목·로그라인·시놉·캐릭터·기승전결)"] = devParts.join("\n\n");
              }
            }
          } catch { /* localStorage read 실패 무시 */ }
        }
      }
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
          ...(autoWorkId ? { workId: autoWorkId } : {}), // ★ 자동 매칭된 작품 = server에서 _works/.md read
          ...(Object.keys(prior).length > 0 ? { prior } : {}),
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

            {/* 라이브러리 작품 가져오기 — 본문 prior 첨부 */}
            <div style={{ marginTop: 8 }}>
              {!contextBody ? (
                <button
                  type="button"
                  onClick={() => setShowLibrary(true)}
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "transparent",
                    color: "var(--coral-deep)",
                    border: "1px dashed var(--coral)",
                    borderRadius: 8, cursor: "pointer",
                    fontSize: 12, fontWeight: 600,
                    display: "inline-flex", alignItems: "center",
                    gap: 6, justifyContent: "center",
                  }}
                >
                  📂 라이브러리 작품 가져오기
                </button>
              ) : (
                <div style={{
                  padding: "10px 12px",
                  background: "var(--coral-soft)",
                  border: "1px solid var(--coral)",
                  borderRadius: 8, fontSize: 11.5,
                  color: "var(--coral-deep)", lineHeight: 1.55,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    ✓ 본문 첨부됨 ({contextBody.length.toLocaleString()}자)
                  </div>
                  <div style={{ color: "var(--ink-3)", marginBottom: 8 }}>
                    AI가 작품을 보면서 답합니다.
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setShowLibrary(true)}
                      style={{
                        padding: "4px 10px", fontSize: 11,
                        background: "transparent",
                        color: "var(--coral-deep)",
                        border: "1px solid var(--coral)",
                        borderRadius: 6, cursor: "pointer",
                      }}
                    >교체</button>
                    <button
                      type="button"
                      onClick={() => { setContextBody(""); setContextWorkId(""); }}
                      style={{
                        padding: "4px 10px", fontSize: 11,
                        background: "transparent",
                        color: "var(--ink-4)",
                        border: "1px solid var(--line)",
                        borderRadius: 6, cursor: "pointer",
                      }}
                    >지우기</button>
                  </div>
                </div>
              )}
            </div>
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
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <Btn icon={I.trash} onClick={onClear}>비우기</Btn>
              <Btn icon={I.save} onClick={onSave}>저장</Btn>
              <Btn
                icon={I.download}
                onClick={async () => {
                  if (messages.length === 0) { alert("저장할 대화가 없습니다."); return; }
                  const { downloadDocx } = await import("@/lib/storymaker/export");
                  const stamp = new Date().toISOString().slice(0, 10);
                  const header = `# 보조작가 ${assistantName} 대화 기록\n> ${project || "(작품 미지정)"} · ${medium} · ${stamp}\n\n---\n\n`;
                  const body = messages
                    .map(m => `### ${m.from === "writer" ? "작가" : "보조작가 " + assistantName}\n\n${m.text}`)
                    .join("\n\n");
                  const filename = `${project || "보조작가대화"}_${stamp}`;
                  await downloadDocx(header + body, filename);
                }}
              >워드</Btn>
              <Btn
                icon={I.download}
                onClick={async () => {
                  if (messages.length === 0) { alert("저장할 대화가 없습니다."); return; }
                  const { downloadTxt } = await import("@/lib/storymaker/export");
                  const stamp = new Date().toISOString().slice(0, 10);
                  const header = `# 보조작가 ${assistantName} 대화 기록\n${project || "(작품 미지정)"} · ${medium} · ${stamp}\n\n---\n\n`;
                  const body = messages
                    .map(m => `[${m.from === "writer" ? "작가" : assistantName}]\n${m.text}`)
                    .join("\n\n");
                  const filename = `${project || "보조작가대화"}_${stamp}`;
                  downloadTxt(header + body, filename);
                }}
              >TXT</Btn>
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
                  marginBottom: 4, textTransform: "uppercase",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>{m.from === "writer" ? "나" : `보조작가 ${assistantName}`}</span>
                  {/* 카피 버튼 — AI 채팅창 표준 */}
                  {m.text && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        try {
                          await navigator.clipboard.writeText(m.text);
                          const btn = e.currentTarget;
                          btn.textContent = "✓";
                          setTimeout(() => { btn.textContent = "📋"; }, 1200);
                        } catch { /* ignore */ }
                      }}
                      title="메시지 복사"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "var(--ink-4)",
                        padding: "1px 4px",
                        opacity: 0.6,
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
                    >📋</button>
                  )}
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
                  {(() => {
                    if (m.from === "writer") return m.text;
                    if (!m.text) return busy ? "…" : "";
                    // ===CHOICES=== 마커 분리 — chip 버튼으로 변환
                    const idx = m.text.indexOf("===CHOICES===");
                    if (idx === -1) return <Markdown text={m.text} compact />;
                    const bodyText = m.text.slice(0, idx).trim();
                    const choicesText = m.text.slice(idx + "===CHOICES===".length).trim();
                    // "1. 옵션", "2. 옵션", "- 옵션" 등 파싱
                    const choices = choicesText
                      .split("\n")
                      .map(line => line.replace(/^[\d]+\.\s*|^[-*]\s*/, "").trim())
                      .filter(Boolean);
                    return (
                      <>
                        {bodyText && <Markdown text={bodyText} compact />}
                        {choices.length > 0 && (
                          <div style={{
                            marginTop: 10, paddingTop: 10,
                            borderTop: "1px dashed var(--line)",
                            display: "flex", flexWrap: "wrap", gap: 6,
                          }}>
                            {choices.map((c, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setInput(c);
                                  // 자동 전송은 X — 작가가 검토 후 Enter
                                }}
                                style={{
                                  padding: "5px 12px", fontSize: 12,
                                  background: "var(--card)",
                                  color: "var(--coral-deep)",
                                  border: "1px solid var(--coral)",
                                  borderRadius: 999, cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                {i + 1}. {c.length > 40 ? c.slice(0, 38) + "…" : c}
                              </button>
                            ))}
                            {/* 기타 — 사장님 명시: 항상 추가. 작가가 다른 거 원하면 직접 입력 */}
                            <button
                              type="button"
                              onClick={() => {
                                setInput("");
                                // 입력창에 focus
                                setTimeout(() => {
                                  const el = document.querySelector<HTMLInputElement>('input.field-input[placeholder*="보조작가"]');
                                  el?.focus();
                                }, 50);
                              }}
                              style={{
                                padding: "5px 12px", fontSize: 12,
                                background: "transparent",
                                color: "var(--ink-3)",
                                border: "1px dashed var(--ink-4)",
                                borderRadius: 999, cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >+ 기타 (직접 입력)</button>
                          </div>
                        )}
                      </>
                    );
                  })()}
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

      <LibraryPicker
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        title="작품 가져오기"
        subtitle="선택한 작품의 본문이 이 채팅에 첨부되어 보조작가가 본문을 보면서 답합니다."
        onPick={(work, body) => {
          setProject(work.title);
          setMediumLetter(work.letter);
          setContextBody(body || "");
          setContextWorkId(String(work.id));
        }}
      />
    </main>
  );
}
