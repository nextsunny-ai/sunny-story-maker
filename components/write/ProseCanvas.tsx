"use client";

// V3.0 PROSE 그룹 본문 캔버스 (H 웹소설·O 소설·P 에세이).
// V2.14 Paragraph 로직 이전 + 회차헤더·장번호 메타 박스 추가.
// 다른 그룹의 폴백으로도 사용 (단계 2~6에서 각 그룹 Canvas 도입 전까지).

import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import type { Block, ProseBlock, HeaderBlock } from "@/lib/storymaker/write-doc";
import type { MediumCanvasRouterProps } from "./MediumCanvasRouter";

export function ProseCanvas({
  doc,
  paused,
  onBlockEdit,
  onBlockRewrite,
  onBlockContinue,
  onAddHeader,
}: MediumCanvasRouterProps) {
  // 회차헤더·장번호 메타 박스 토글 (작가가 필요할 때만)
  const [showHeaderInput, setShowHeaderInput] = useState(false);
  const [headerLevel, setHeaderLevel] = useState<"episode" | "chapter">(
    doc.letter === "H" ? "episode" : "chapter"
  );
  const [headerNumber, setHeaderNumber] = useState("");
  const [headerTitle, setHeaderTitle] = useState("");

  const submitHeader = () => {
    if (!onAddHeader || !headerTitle.trim()) return;
    onAddHeader(headerLevel, headerTitle.trim(), headerNumber.trim() || undefined);
    setHeaderTitle("");
    setHeaderNumber("");
    setShowHeaderInput(false);
  };

  return (
    <div className="prose-canvas">
      {/* 회차헤더·장번호 메타 박스 (PROSE 전용) */}
      {onAddHeader && (
        <div style={{ marginBottom: 16 }}>
          {showHeaderInput ? (
            <div style={{
              padding: "12px 14px",
              background: "var(--card-soft)",
              border: "1px solid var(--coral)",
              borderRadius: 10,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={headerLevel}
                  onChange={(e) => setHeaderLevel(e.target.value as "episode" | "chapter")}
                  style={{
                    fontSize: 12, padding: "4px 8px",
                    background: "transparent", color: "var(--ink-1)",
                    border: "1px solid var(--line)", borderRadius: 6,
                  }}
                >
                  <option value="episode">회차 (제01화·EP001)</option>
                  <option value="chapter">장 (1·2·3 / 제1장)</option>
                </select>
                <input
                  value={headerNumber}
                  onChange={(e) => setHeaderNumber(e.target.value)}
                  placeholder={headerLevel === "episode" ? "01" : "1"}
                  style={{
                    width: 60, fontSize: 12, padding: "4px 8px",
                    background: "transparent", color: "var(--ink-1)",
                    border: "1px solid var(--line)", borderRadius: 6,
                  }}
                />
                <input
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder={headerLevel === "episode" ? "회차 제목" : "장 제목"}
                  style={{
                    flex: 1, minWidth: 120, fontSize: 13, padding: "4px 8px",
                    background: "transparent", color: "var(--ink-1)",
                    border: "1px solid var(--line)", borderRadius: 6,
                  }}
                />
                <button type="button" onClick={submitHeader}
                  style={{
                    padding: "4px 10px", fontSize: 12, fontWeight: 600,
                    background: "var(--coral)", color: "#fff",
                    border: "1px solid var(--coral)", borderRadius: 6, cursor: "pointer",
                  }}
                >추가</button>
                <button type="button" onClick={() => setShowHeaderInput(false)}
                  style={{
                    padding: "4px 10px", fontSize: 12,
                    background: "transparent", color: "var(--ink-4)",
                    border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer",
                  }}
                >취소</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowHeaderInput(true)}
              style={{
                padding: "6px 12px", fontSize: 12,
                background: "transparent", color: "var(--coral-deep)",
                border: "1px dashed var(--coral)", borderRadius: 8, cursor: "pointer",
              }}
            >+ 회차/장 헤더 추가</button>
          )}
        </div>
      )}

      {/* 본문 블록 렌더 */}
      {doc.blocks.map((b) => (
        <BlockRenderer
          key={b.id}
          block={b}
          paused={paused}
          onEdit={onBlockEdit}
          onRewrite={onBlockRewrite}
          onContinue={onBlockContinue}
        />
      ))}

      {doc.blocks.length === 0 && (
        <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 13, textAlign: "center" }}>
          빈 작업실입니다. 우측 채팅에서 시작하시거나 [📥 원고 가져오기]로 기존 원고를 가져오세요.
        </div>
      )}
    </div>
  );
}

// ─── Block 한 개 렌더 (PROSE 그룹 + HeaderBlock) ───
function BlockRenderer({
  block,
  paused,
  onEdit,
  onRewrite,
  onContinue,
}: {
  block: Block;
  paused: boolean;
  onEdit?: (blockId: string, patch: Partial<Block>) => void;
  onRewrite?: (blockId: string) => void;
  onContinue?: (afterBlockId: string) => void;
}) {
  if (block.kind === "header") {
    return <HeaderRenderer block={block} onEdit={onEdit} />;
  }

  if (block.kind !== "prose") {
    // 단계 2~6 = 그룹별 Canvas로 분기. 여기서는 텍스트만 보존.
    const text = "text" in block ? (block as { text?: string }).text || "" : "";
    return (
      <div style={{ marginBottom: 12, padding: 12, background: "var(--card-soft)", border: "1px dashed var(--line)", borderRadius: 8, fontSize: 13, color: "var(--ink-3)" }}>
        <Markdown text={text} />
      </div>
    );
  }

  return <ProseBlockRenderer block={block} paused={paused} onEdit={onEdit} onRewrite={onRewrite} onContinue={onContinue} />;
}

// ─── HeaderBlock 렌더 (회차/장 제목) ───
function HeaderRenderer({
  block,
  onEdit,
}: {
  block: HeaderBlock;
  onEdit?: (blockId: string, patch: Partial<Block>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(block.title);
  const [draftNumber, setDraftNumber] = useState(block.number || "");

  const save = () => {
    if (onEdit) onEdit(block.id, { title: draftTitle.trim(), number: draftNumber.trim() || undefined } as Partial<HeaderBlock>);
    setEditing(false);
  };

  const prefix = block.level === "episode"
    ? (block.number ? `제${block.number}화` : "")
    : (block.number ? `제${block.number}장` : "");

  if (editing) {
    return (
      <div style={{ marginTop: 24, marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={draftNumber}
          onChange={(e) => setDraftNumber(e.target.value)}
          placeholder="번호"
          style={{ width: 60, fontSize: 13, padding: "6px 8px", border: "1px solid var(--coral)", borderRadius: 6 }}
        />
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="제목"
          style={{ flex: 1, fontSize: 16, fontWeight: 700, padding: "6px 8px", border: "1px solid var(--coral)", borderRadius: 6 }}
        />
        <button type="button" onClick={save} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, background: "var(--coral)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>저장</button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        marginTop: 32, marginBottom: 16, paddingTop: 16,
        borderTop: "2px solid var(--coral)",
        cursor: "pointer",
        fontSize: block.level === "episode" ? 22 : 18,
        fontWeight: 700,
        color: "var(--ink-1)",
      }}
      title="클릭하면 수정"
    >
      {prefix && <span style={{ color: "var(--coral)", marginRight: 10 }}>{prefix}</span>}
      {block.title}
    </div>
  );
}

// ─── ProseBlock 렌더 (V2.14 Paragraph 로직 이전) ───
function ProseBlockRenderer({
  block,
  paused,
  onEdit,
  onRewrite,
  onContinue,
}: {
  block: ProseBlock;
  paused: boolean;
  onEdit?: (blockId: string, patch: Partial<Block>) => void;
  onRewrite?: (blockId: string) => void;
  onContinue?: (afterBlockId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(block.text);

  const isStreaming = block.status === "streaming";
  const isDone = block.status === "done";
  const isPending = block.status === "pending";

  const startEdit = () => {
    setDraft(block.text);
    setEditing(true);
  };
  const saveEdit = () => {
    if (onEdit) onEdit(block.id, { text: draft } as Partial<ProseBlock>);
    setEditing(false);
  };
  const cancelEdit = () => {
    setDraft(block.text);
    setEditing(false);
  };

  return (
    <div className={"wpara is-" + block.status + (paused && isStreaming ? " is-paused" : "")} data-block-id={block.id}>
      <div className="wpara-body">
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              placeholder="여기에 직접 쓰세요…"
              style={{
                width: "100%", minHeight: 200, padding: "12px 14px",
                fontSize: 14, lineHeight: 1.7,
                fontFamily: "var(--font-display)",
                color: "var(--ink-1)", background: "var(--bg)",
                border: "1px solid var(--coral)", borderRadius: 10,
                resize: "vertical", whiteSpace: "pre-wrap",
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="wpara-action" onClick={saveEdit} title="저장">
                <span className="wpara-action-icon">✓</span><span>저장</span>
              </button>
              <button type="button" className="wpara-action" onClick={cancelEdit} title="취소">
                <span className="wpara-action-icon">✕</span><span>취소</span>
              </button>
            </div>
          </div>
        ) : isPending ? (
          <div className="wpara-pending">
            <span className="wpara-pending-dot"></span>
            <span>{onEdit ? "여기부터 직접 쓰거나, 우측 채팅에서 AI에게 맡기세요" : "대기 중"}</span>
            {onEdit && (
              <button type="button" className="wpara-action" onClick={startEdit} title="이 단락을 작가가 직접 씁니다" style={{ marginLeft: 10 }}>
                <span className="wpara-action-icon">✍️</span><span>직접 쓰기</span>
              </button>
            )}
          </div>
        ) : (
          <div className="wpara-text">
            <Markdown text={block.text} />
            {isStreaming && (
              <span className={"wpara-cursor" + (paused ? " is-paused" : "")}></span>
            )}
          </div>
        )}

        {isDone && !editing && (
          <div className="wpara-actions">
            {onRewrite && (
              <button type="button" className="wpara-action" onClick={() => onRewrite(block.id)} title="이 단락 다시 쓰기">
                <span className="wpara-action-icon">↻</span><span>다시 써</span>
              </button>
            )}
            <button type="button" className="wpara-action" onClick={startEdit} title="직접 수정">
              <span className="wpara-action-icon">✎</span><span>수정</span>
            </button>
            {onContinue && (
              <button type="button" className="wpara-action" onClick={() => onContinue(block.id)} title="이어서 더 쓰기">
                <span className="wpara-action-icon">+</span><span>더 쓰기</span>
              </button>
            )}
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
