"use client";

import { useEffect, useRef, useState, FormEvent, KeyboardEvent } from "react";
import { ICONS } from "@/lib/icons";
import { Markdown } from "@/components/Markdown";

export interface Note { id: string; label: string }
export interface FlowItem { id: string; state: "done" | "active" | "pending"; title: string; hint: string }
export interface ChatMsg { id: string; role: "writer" | "ai"; text: string; t: string }

interface WriteWorkbookProps {
  notes: Note[];
  flow: FlowItem[];
  chat: ChatMsg[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onAddNote: (label: string) => void;
  onRemoveNote: (id: string) => void;
  onClose: () => void;
  mediumLabel?: string; // ★ 사장님 명시: 작품 정보에 매체 표시
  onApplyToScript?: (text: string) => void; // ★ V2.14 — AI 채팅 메시지를 본문 끝에 단락으로 추가
  onPatchBlock?: (action: "수정" | "추가" | "삭제", n: number, content?: string) => void; // ★ V3.0 단계 5 — 블록 patch
}

export function WriteWorkbook({
  notes, flow, chat, input,
  onInputChange, onSend, onAddNote, onRemoveNote, onClose, mediumLabel,
  onApplyToScript, onPatchBlock,
}: WriteWorkbookProps) {
  const I = ICONS;
  const [newNote, setNewNote] = useState("");
  // 디렉션·메모 = default 접힘 (작가가 필요할 때만 펼침). 사장님 명시: 채팅이 메인.
  const [notesOpen, setNotesOpen] = useState(false);
  // AI 작업 흐름 = default 접힘 (사장님 명시: 대화가 더 중요. AI 흐름은 보조)
  const [flowOpen, setFlowOpen] = useState(false);

  // 작품 정보 — develop 페이지에서 만든 사전 자료 (로그라인·캐릭터·시놉시스 등) 자동 read.
  // 사장님 명시: 작가가 본문 쓰다가 캐릭터·로그라인 헷갈릴 때 참조용.
  const [workRef, setWorkRef] = useState<{
    title?: string; logline?: string; theme?: string;
    synopsis?: string; characters?: string; structure?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("storyMaker.developHandoff");
      if (raw) setWorkRef(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // 어떤 항목이라도 있으면 = 작품 정보 섹션 노출
  const hasWorkRef = !!(workRef && (
    workRef.title || workRef.logline || workRef.theme ||
    workRef.characters || workRef.synopsis || workRef.structure
  ));

  const [refOpen, setRefOpen] = useState(true); // default 펼침 (자주 본다)
  const [refTab, setRefTab] = useState<"logline" | "characters" | "synopsis" | "structure">("logline");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat]);

  const onAddNoteSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(newNote);
    setNewNote("");
  };

  const onSendKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <aside className="wbook">
      <div className="wbook-topbar">
        <span className="wbook-topbar-title">작가노트</span>
        <button
          className="wbook-topbar-close"
          onClick={onClose}
          title="작가노트 접기"
          aria-label="작가노트 접기"
        >×</button>
      </div>

      {/* 작품 정보 — develop 사전 자료 자동 표시 (사장님 명시: 작가가 캐릭터·로그라인 헷갈릴 때 참조용) */}
      {hasWorkRef && (
        <section className="wbook-section">
          <button
            type="button"
            className="wbook-section-head wbook-section-toggle"
            onClick={() => setRefOpen(!refOpen)}
          >
            <span className="wbook-section-title">📋 작품 정보</span>
            <span className="wbook-section-meta">
              <span className="wbook-section-chev">{refOpen ? "−" : "+"}</span>
            </span>
          </button>
          {refOpen && (
            <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-5)", letterSpacing: "0.08em", marginBottom: 2 }}>
                  제목
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink-1)", lineHeight: 1.4 }}>
                  {(() => {
                    // 사장님 명시: 작가가 제목 안 정하면 = 가제로. 작가가 채택하면 그때 박힘.
                    const t = workRef?.title?.trim();
                    if (!t) return <em style={{ fontStyle: "normal", color: "var(--ink-4)", fontWeight: 500 }}>(가제)</em>;
                    // AI 후보 텍스트 판정: 마크다운 시작·후보 표현·너무 김 → 작가 채택 X = 가제
                    const isAIDraft =
                      t.startsWith("#") || t.startsWith("**") ||
                      /후보|선택|추천/.test(t.slice(0, 40)) ||
                      t.length > 60 ||
                      /\n/.test(t);
                    if (isAIDraft) {
                      return <em style={{ fontStyle: "normal", color: "var(--ink-4)", fontWeight: 500 }}>(가제)</em>;
                    }
                    return t;
                  })()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-5)", letterSpacing: "0.08em", marginBottom: 2 }}>
                  로그라인
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>
                  {(() => {
                    const l = workRef?.logline?.trim();
                    if (!l) return <em style={{ fontStyle: "normal", color: "var(--ink-4)" }}>(미정)</em>;
                    const isAIDraft = l.startsWith("#") || l.length > 200 || /안 1|안 2|안 3|구조형|감정형|반전형/.test(l);
                    if (isAIDraft) {
                      return <em style={{ fontStyle: "normal", color: "var(--ink-4)" }}>(미정 — 작가 채택 대기)</em>;
                    }
                    return l;
                  })()}
                </div>
              </div>
              {/* 매체 — 사장님 명시: 작품 정보에 매체 표시 (제목·로그라인·매체·캐릭터) */}
              {mediumLabel && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-5)", letterSpacing: "0.08em", marginBottom: 2 }}>
                    매체
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, fontWeight: 600 }}>
                    {mediumLabel}
                  </div>
                </div>
              )}
              {/* 캐릭터 이름들만 — 사장님 명시: 본문 쓰다가 이름 헷갈릴 때 빠르게 보는 용. 시놉·기승전결 제거. */}
              {workRef?.characters && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-5)", letterSpacing: "0.08em", marginBottom: 4 }}>
                    캐릭터
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6,
                    maxHeight: 140, overflowY: "auto",
                    padding: "2px 0",
                  }}>
                    {(() => {
                      // 캐릭터 텍스트에서 = 이름·역할만 추출 (한 줄씩, 짧게).
                      // 형식 추정: "이름 - 역할/설명" 또는 마크다운 헤더 후 본문.
                      // 첫 N줄 또는 = "**이름**" / "이름:" 패턴 우선.
                      const text = workRef.characters || "";
                      const lines = text
                        .split("\n")
                        .map(l => l.trim())
                        .filter(Boolean);

                      // 후보: "**이름**", "이름:", "이름 -" 패턴이 있는 줄만
                      const namePattern = /^(\*\*|##\s*|#\s*)?([^\s\-:•**]{2,15}(?:\s[^\s\-:•**]{1,15})?)(\*\*|:|\s—|\s-|\s\()/;
                      const nameLines: string[] = [];
                      for (const line of lines) {
                        const m = line.match(namePattern);
                        if (m && nameLines.length < 8) {
                          // 마크다운·라벨 제거 후 짧게
                          const cleaned = line
                            .replace(/^#{1,6}\s+/, "")
                            .replace(/\*\*/g, "")
                            .replace(/^[-*+]\s+/, "")
                            .trim();
                          if (cleaned.length > 80) {
                            nameLines.push(cleaned.slice(0, 78) + "…");
                          } else {
                            nameLines.push(cleaned);
                          }
                        }
                      }

                      if (nameLines.length === 0) {
                        // fallback: 첫 5줄 (마크다운 제거)
                        return lines.slice(0, 5).map(l =>
                          l.replace(/^#{1,6}\s+/, "").replace(/\*\*/g, "").slice(0, 80)
                        ).join("\n");
                      }
                      return nameLines.join("\n");
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 디렉션·메모 (작가 안내 — 헤더 "작가노트"와 중복 방지로 명칭 변경) */}
      <section className="wbook-section">
        <button
          type="button"
          className="wbook-section-head wbook-section-toggle"
          onClick={() => setNotesOpen(!notesOpen)}
        >
          <span className="wbook-section-title">📌 디렉션·메모</span>
          <span className="wbook-section-meta">
            {notes.length}
            <span className="wbook-section-chev">{notesOpen ? "−" : "+"}</span>
          </span>
        </button>
        {!notesOpen && null}
        {notesOpen && (
        <>
        <div className="wbook-notes">
          {notes.map(n => (
            <div key={n.id} className="wbook-note" title="클릭해서 삭제">
              <span className="wbook-note-label">{n.label}</span>
              <button
                className="wbook-note-x"
                onClick={() => onRemoveNote(n.id)}
                aria-label="노트 삭제"
              >×</button>
            </div>
          ))}
        </div>
        <form className="wbook-note-add" onSubmit={onAddNoteSubmit}>
          <input
            type="text"
            placeholder="+ 디렉션 추가 (예: 회상은 1인칭)"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
          />
        </form>
        <div className="wbook-note-hint">대화에서 자동으로 추가되거나 직접 입력</div>
        </>
        )}
      </section>

      {/* 대화 (메인 — 가장 큰 영역, 사장님 명시: 대화가 가장 중요) */}
      <section className="wbook-section wbook-chat-section">
        <div className="wbook-section-head">
          <span className="wbook-section-title">💬 대화</span>
          <span className="wbook-section-meta">{chat.length}</span>
        </div>

        <div className="wbook-chat" ref={chatRef}>
          {chat.map(m => (
            <div key={m.id} className={"wbook-msg is-" + m.role}>
              <div className="wbook-msg-head">
                <span className="wbook-msg-who">{m.role === "writer" ? "나" : "Sunny"}</span>
                <span className="wbook-msg-time">{m.t}</span>
                {/* 카피 버튼 + ★ V2.14 채팅 → 본문 적용 버튼 (AI 메시지만) */}
                {m.text && m.role === "ai" && onApplyToScript && (
                  <button
                    type="button"
                    onClick={() => onApplyToScript(m.text)}
                    title="이 메시지를 본문 끝에 새 단락으로 추가"
                    style={{
                      marginLeft: "auto",
                      background: "transparent",
                      border: "1px solid var(--coral)",
                      color: "var(--coral-deep)",
                      cursor: "pointer", fontSize: 10.5, fontWeight: 600,
                      padding: "2px 8px", borderRadius: 6,
                      letterSpacing: "0.02em",
                    }}
                  >📥 본문에 적용</button>
                )}
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
                      marginLeft: m.role === "ai" && onApplyToScript ? 4 : "auto",
                      background: "transparent", border: "none",
                      cursor: "pointer", fontSize: 11,
                      color: "var(--ink-4)", padding: "1px 4px",
                      opacity: 0.5, lineHeight: 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
                  >📋</button>
                )}
              </div>
              <div className="wbook-msg-text">
                {(() => {
                  if (m.role !== "ai") return m.text;
                  if (!m.text) return "";

                  // ★ V3.0 단계 5 — [[수정/추가/삭제:N:내용]] 마커 파싱 (본문 patch)
                  const PATCH_RE = /\[\[(수정|추가|삭제):(\d+)(?::([\s\S]*?))?\]\]/g;
                  const patches: Array<{ action: "수정" | "추가" | "삭제"; n: number; content?: string }> = [];
                  let textWithoutMarkers = m.text;
                  let pm: RegExpExecArray | null;
                  while ((pm = PATCH_RE.exec(m.text)) !== null) {
                    patches.push({
                      action: pm[1] as "수정" | "추가" | "삭제",
                      n: parseInt(pm[2], 10),
                      content: pm[3] !== undefined ? pm[3].trim() : undefined,
                    });
                  }
                  if (patches.length > 0) {
                    textWithoutMarkers = m.text.replace(PATCH_RE, "").trim();
                  }

                  // ===CHOICES=== 마커 분리 — chip 버튼 (사장님 명시: 작가 채팅 적게 치고 빠른 결정)
                  const idx = textWithoutMarkers.indexOf("===CHOICES===");
                  if (idx === -1) {
                    return (
                      <>
                        <Markdown text={textWithoutMarkers} compact />
                        {patches.length > 0 && onPatchBlock && (
                          <div style={{
                            marginTop: 8, paddingTop: 8,
                            borderTop: "1px dashed var(--coral)",
                            display: "flex", flexDirection: "column", gap: 4,
                          }}>
                            <div style={{ fontSize: 10.5, color: "var(--coral-deep)", fontWeight: 700, letterSpacing: "0.05em" }}>
                              본문 PATCH 제안
                            </div>
                            {patches.map((p, pi) => (
                              <button
                                key={pi}
                                type="button"
                                onClick={() => onPatchBlock(p.action, p.n, p.content)}
                                title={`${p.n}번째 블록 ${p.action}`}
                                style={{
                                  fontSize: 11.5, padding: "4px 10px",
                                  background: "transparent", color: "var(--coral-deep)",
                                  border: "1px solid var(--coral)", borderRadius: 6,
                                  cursor: "pointer", textAlign: "left",
                                  fontWeight: 600,
                                }}
                              >
                                📥 {p.n}번째 {p.action}
                                {p.content && <span style={{ fontWeight: 400, marginLeft: 6, color: "var(--ink-3)" }}>: {p.content.slice(0, 40)}{p.content.length > 40 ? "…" : ""}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  }
                  const bodyText = textWithoutMarkers.slice(0, idx).trim();
                  // ★ V3.1 #10 보강 — choices 영역에도 patch 마커 stripping (production edge case)
                  const choicesText = m.text.slice(idx + "===CHOICES===".length).replace(PATCH_RE, "").trim();
                  const choices = choicesText
                    .split("\n")
                    .map(line => line.replace(/^[\d]+\.\s*|^[-*]\s*/, "").trim())
                    .filter(Boolean);
                  return (
                    <>
                      {bodyText && <Markdown text={bodyText} compact />}
                      {choices.length > 0 && (
                        <div style={{
                          marginTop: 8, paddingTop: 8,
                          borderTop: "1px dashed var(--line)",
                          display: "flex", flexWrap: "wrap", gap: 5,
                        }}>
                          {choices.map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                onInputChange(c);
                              }}
                              style={{
                                padding: "4px 10px", fontSize: 11.5, fontWeight: 600,
                                background: "var(--card)",
                                color: "var(--coral-deep)",
                                border: "1px solid var(--coral)",
                                borderRadius: 999, cursor: "pointer",
                              }}
                            >
                              {i + 1}. {c.length > 36 ? c.slice(0, 34) + "…" : c}
                            </button>
                          ))}
                          {/* 기타 — 사장님 명시: 항상 추가 */}
                          <button
                            type="button"
                            onClick={() => {
                              onInputChange("");
                              setTimeout(() => {
                                const el = document.querySelector<HTMLTextAreaElement>("textarea.wbook-input-text");
                                el?.focus();
                              }, 50);
                            }}
                            style={{
                              padding: "4px 10px", fontSize: 11.5, fontWeight: 600,
                              background: "transparent",
                              color: "var(--ink-3)",
                              border: "1px dashed var(--ink-4)",
                              borderRadius: 999, cursor: "pointer",
                            }}
                          >+ 기타</button>
                        </div>
                      )}
                      {patches.length > 0 && onPatchBlock && (
                        <div style={{
                          marginTop: 8, paddingTop: 8,
                          borderTop: "1px dashed var(--coral)",
                          display: "flex", flexDirection: "column", gap: 4,
                        }}>
                          <div style={{ fontSize: 10.5, color: "var(--coral-deep)", fontWeight: 700, letterSpacing: "0.05em" }}>
                            본문 PATCH 제안
                          </div>
                          {patches.map((p, pi) => (
                            <button
                              key={pi}
                              type="button"
                              onClick={() => onPatchBlock(p.action, p.n, p.content)}
                              title={`${p.n}번째 블록 ${p.action}`}
                              style={{
                                fontSize: 11.5, padding: "4px 10px",
                                background: "transparent", color: "var(--coral-deep)",
                                border: "1px solid var(--coral)", borderRadius: 6,
                                cursor: "pointer", textAlign: "left",
                                fontWeight: 600,
                              }}
                            >
                              📥 {p.n}번째 {p.action}
                              {p.content && <span style={{ fontWeight: 400, marginLeft: 6, color: "var(--ink-3)" }}>: {p.content.slice(0, 40)}{p.content.length > 40 ? "…" : ""}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        <div className="wbook-input">
          <textarea
            className="wbook-input-text"
            placeholder='예: "도윤 캐릭터 어둡게" / "다음 씬은 회상으로" / "이 시대 의상은?"'
            rows={2}
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={onSendKey}
          />
          <button
            className="wbook-input-send"
            onClick={onSend}
            disabled={!input.trim()}
            aria-label="보내기"
          >
            <span>{I.arrow}</span>
          </button>
        </div>
        <div className="wbook-input-hint">
          디렉션·수정·자료조사·이름 추천 — 무엇이든. AI가 본문에 반영하거나 채팅으로 답합니다.
        </div>
      </section>

      {/* AI 작업 흐름 (default 접힘 — 클릭해서 펼침) */}
      <section className="wbook-section">
        <button
          className="wbook-section-head wbook-section-toggle"
          onClick={() => setFlowOpen(!flowOpen)}
        >
          <span className="wbook-section-title">💭 AI 작업 흐름</span>
          <span className="wbook-section-meta">
            {flow.filter(f => f.state === "done").length}/{flow.length}
            <span className="wbook-section-chev">{flowOpen ? "−" : "+"}</span>
          </span>
        </button>
        {flowOpen && (
          <ol className="wbook-flow">
            {flow.map(f => (
              <li key={f.id} className={"wbook-flow-item is-" + f.state}>
                <span className="wbook-flow-mark">
                  {f.state === "done" && "✓"}
                  {f.state === "active" && <span className="wbook-flow-spinner"></span>}
                  {f.state === "pending" && "·"}
                </span>
                <div className="wbook-flow-body">
                  <div className="wbook-flow-title">{f.title}</div>
                  {f.state === "active" && (
                    <div className="wbook-flow-hint">{f.hint}</div>
                  )}
                  {f.state === "done" && (
                    <div className="wbook-flow-hint is-muted">{f.hint}</div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}
