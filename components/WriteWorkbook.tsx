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
}

export function WriteWorkbook({
  notes, flow, chat, input,
  onInputChange, onSend, onAddNote, onRemoveNote, onClose,
}: WriteWorkbookProps) {
  const I = ICONS;
  const [newNote, setNewNote] = useState("");
  const [flowOpen, setFlowOpen] = useState(true);
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
        <span className="wbook-topbar-title">워크북</span>
        <button
          className="wbook-topbar-close"
          onClick={onClose}
          title="워크북 접기"
          aria-label="워크북 접기"
        >×</button>
      </div>

      {/* 작가 노트 */}
      <section className="wbook-section">
        <div className="wbook-section-head">
          <span className="wbook-section-title">📌 작가 노트</span>
          <span className="wbook-section-meta">{notes.length}</span>
        </div>
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
      </section>

      {/* AI 작업 흐름 */}
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

      {/* 라이브 대화 */}
      <section className="wbook-section wbook-chat-section">
        <div className="wbook-section-head">
          <span className="wbook-section-title">💬 라이브 대화</span>
          <span className="wbook-section-meta">{chat.length}</span>
        </div>

        <div className="wbook-chat" ref={chatRef}>
          {chat.map(m => (
            <div key={m.id} className={"wbook-msg is-" + m.role}>
              <div className="wbook-msg-head">
                <span className="wbook-msg-who">{m.role === "writer" ? "나" : "Sunny"}</span>
                <span className="wbook-msg-time">{m.t}</span>
              </div>
              <div className="wbook-msg-text">
                {m.role === "ai" && m.text
                  ? <Markdown text={m.text} compact />
                  : m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="wbook-input">
          <textarea
            className="wbook-input-text"
            placeholder="지금 끼어들기… (Enter 전송 · Shift+Enter 줄바꿈)"
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
          AI가 한 단락 끝까지 마무리하고 멈춰서 반영합니다
        </div>
      </section>
    </aside>
  );
}
