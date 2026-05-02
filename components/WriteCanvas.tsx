"use client";

import { useEffect, useRef } from "react";
import { ICONS } from "@/lib/icons";

export interface WorkInfo {
  title: string;
  chapter: string;
  elapsed: string;
  medium: string;
}

export interface Para {
  id: string;
  n: number;
  label: string;
  text: string;
  status: "done" | "streaming" | "pending";
  streamTarget?: string;
}

interface WriteCanvasProps {
  work: WorkInfo;
  paras: Para[];
  paused: boolean;
  onPauseToggle: () => void;
  onRewrite: (id: string) => void;
  bookOpen: boolean;
  onBookToggle: () => void;
  notesCount: number;
}

export function WriteCanvas({
  work, paras, paused, onPauseToggle, onRewrite, bookOpen, onBookToggle, notesCount,
}: WriteCanvasProps) {
  const I = ICONS;
  const containerRef = useRef<HTMLDivElement>(null);

  // 새 글자가 써질 때 자동 스크롤 (현재 streaming 단락이 보이도록)
  useEffect(() => {
    const streaming = paras.find(p => p.status === "streaming");
    if (!streaming) return;
    const el = document.querySelector(`[data-para-id="${streaming.id}"]`);
    if (el && containerRef.current) {
      const rect = el.getBoundingClientRect();
      const cRect = containerRef.current.getBoundingClientRect();
      if (rect.bottom > cRect.bottom - 80) {
        containerRef.current.scrollTop += rect.bottom - cRect.bottom + 100;
      }
    }
  }, [paras]);

  const totalChars = paras.reduce((acc, p) => acc + p.text.length, 0);
  const doneCount = paras.filter(p => p.status === "done").length;
  const isStreaming = paras.some(p => p.status === "streaming");

  return (
    <section className="wcanvas">
      {/* 헤더 */}
      <header className="wcanvas-head">
        <div className="wcanvas-head-left">
          <div className="wcanvas-head-title">
            <span className="wcanvas-head-mark">{I.book || I.write}</span>
            <h1>{work.title}</h1>
            <span className="wcanvas-head-chapter">{work.chapter}</span>
          </div>
          <div className="wcanvas-head-meta">
            <span>{work.medium}</span>
            <span className="wcanvas-head-dot">·</span>
            <span>{work.elapsed}</span>
            <span className="wcanvas-head-dot">·</span>
            <span>{totalChars.toLocaleString()}자</span>
            <span className="wcanvas-head-dot">·</span>
            <span>{doneCount}/{paras.length} 단락</span>
          </div>
        </div>
        <div className="wcanvas-head-right">
          <span className="wcanvas-saved">
            <span className="wcanvas-saved-dot"></span>
            자동 저장됨 · 방금
          </span>
          {isStreaming && (
            <button
              className={"wcanvas-pause" + (paused ? " is-paused" : "")}
              onClick={onPauseToggle}
              title={paused ? "이어쓰기" : "잠시 멈춤"}
            >
              {paused ? "▶ 이어쓰기" : "⏸ 잠깐"}
            </button>
          )}
          {!bookOpen && (
            <button
              className="wcanvas-book-toggle"
              onClick={onBookToggle}
              title="작가 노트 · AI 흐름 · 대화 열기"
            >
              <span className="wcanvas-book-toggle-icon">{I.book || I.write}</span>
              <span>워크북</span>
              {notesCount ? <span className="wcanvas-book-toggle-badge">{notesCount}</span> : null}
            </button>
          )}
        </div>
      </header>

      {/* 본문 — 원고지 */}
      <div className="wcanvas-body" ref={containerRef}>
        <div className="wcanvas-page">
          {paras.map((p, i) => (
            <Paragraph
              key={p.id}
              p={p}
              i={i}
              onRewrite={() => onRewrite(p.id)}
              paused={paused}
            />
          ))}

          {paras.every(p => p.status !== "streaming") &&
           paras.every(p => p.status !== "pending") && (
            <div className="wcanvas-end">
              <span>4화 초고 완료 · 다음 단계로 넘어가시겠어요?</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Paragraph({ p, paused, onRewrite }: { p: Para; i: number; onRewrite: () => void; paused: boolean }) {
  const isStreaming = p.status === "streaming";
  const isDone = p.status === "done";
  const isPending = p.status === "pending";

  return (
    <div
      className={"wpara is-" + p.status + (paused && isStreaming ? " is-paused" : "")}
      data-para-id={p.id}
    >
      <div className="wpara-gutter">
        <span className="wpara-num">{String(p.n).padStart(2, "0")}</span>
        <span className="wpara-label">{p.label}</span>
      </div>

      <div className="wpara-body">
        {isPending ? (
          <div className="wpara-pending">
            <span className="wpara-pending-dot"></span>
            <span>대기 중</span>
          </div>
        ) : (
          <p className="wpara-text">
            {p.text}
            {isStreaming && (
              <span className={"wpara-cursor" + (paused ? " is-paused" : "")}></span>
            )}
          </p>
        )}

        {isDone && (
          <div className="wpara-actions">
            <button className="wpara-action" onClick={onRewrite} title="이 단락 다시 쓰기">
              <span className="wpara-action-icon">↻</span>
              <span>다시 써</span>
            </button>
            <button className="wpara-action" title="직접 수정">
              <span className="wpara-action-icon">✎</span>
              <span>수정</span>
            </button>
            <button className="wpara-action" title="이어서 더 쓰기">
              <span className="wpara-action-icon">+</span>
              <span>더 쓰기</span>
            </button>
          </div>
        )}

        {isStreaming && !paused && (
          <div className="wpara-stream-ctrl">
            <span className="wpara-stream-status">
              <span className="wpara-stream-spinner"></span>
              써내려가는 중
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
