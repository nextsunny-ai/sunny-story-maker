"use client";

// V3.0 PANEL 그룹 본문 캔버스 (F 웹툰).
// 컷 카드 시퀀스. 각 카드 = 그림 묘사 + (선택) 대사·SFX·나레이션.

import { useRef, useState, type KeyboardEvent } from "react";
import { Markdown } from "@/components/Markdown";
import type { Block, CutBlock } from "@/lib/storymaker/write-doc";
import type { MediumCanvasRouterProps } from "./MediumCanvasRouter";

export function PanelCanvas({ doc, paused, onBlockEdit, onBlockContinue, onBlockDelete, onBlockMove, onBlockReorder }: MediumCanvasRouterProps) {
  const cutBlocks = doc.blocks.filter(b => b.kind === "cut");
  return (
    <div className="panel-canvas">
      {doc.blocks.length === 0 && (
        <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 13, textAlign: "center" }}>
          빈 작업실입니다. 채팅에서 "1화 시작해줘" 같이 요청하시거나 원고를 가져오세요.
        </div>
      )}
      {onBlockReorder && cutBlocks.length > 1 && (
        <div style={{ fontSize: 11, color: "var(--ink-4)", padding: "4px 8px", textAlign: "center" }}>
          💡 컷 카드를 드래그해서 = 다른 컷 위로 놓으면 = 한 번에 순서 변경
        </div>
      )}
      {doc.blocks.map((b) => {
        const isCut = b.kind === "cut";
        const cutIdx = isCut ? cutBlocks.findIndex(c => c.id === b.id) : -1;
        return (
          <BlockRouter
            key={b.id}
            block={b}
            paused={paused}
            onEdit={onBlockEdit}
            onContinue={onBlockContinue}
            onDelete={onBlockDelete}
            onMove={onBlockMove}
            onReorder={onBlockReorder}
            isFirstCut={cutIdx === 0}
            isLastCut={isCut && cutIdx === cutBlocks.length - 1}
          />
        );
      })}
    </div>
  );
}

function BlockRouter({
  block, paused, onEdit, onContinue, onDelete, onMove, onReorder, isFirstCut, isLastCut,
}: {
  block: Block;
  paused: boolean;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onContinue?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, direction: "up" | "down") => void;
  onReorder?: (draggedId: string, targetId: string, position: "before" | "after") => void;
  isFirstCut?: boolean;
  isLastCut?: boolean;
}) {
  if (block.kind === "cut") {
    return <CutRenderer block={block} paused={paused} onEdit={onEdit} onContinue={onContinue} onDelete={onDelete} onMove={onMove} onReorder={onReorder} isFirst={isFirstCut} isLast={isLastCut} />;
  }
  // fallback — 다른 kind는 텍스트만
  const text = "text" in block ? (block as { text?: string }).text || "" : "";
  return (
    <div style={{ marginBottom: 8, padding: 8, color: "var(--ink-3)", fontSize: 13 }}>
      <Markdown text={text} />
    </div>
  );
}

// ─── ContentEditable 공통 (PanelCanvas 전용 간단판) ───
function EditableLine({
  value, placeholder, onChange, style, multiline,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const isComposingRef = useRef(false); // ★ V3.1 B3 — IME 한국어 조합
  return (
    <span
      ref={ref}
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const t = ref.current?.innerText || "";
        if (t !== value) onChange(t);
      }}
      onCompositionStart={() => { isComposingRef.current = true; }}
      onCompositionEnd={() => { isComposingRef.current = false; }}
      onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
        if (isComposingRef.current || e.nativeEvent.isComposing) return; // ★ B3 = 한국어 조합 중 무시
        if (!multiline && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ref.current?.blur(); }
        if (e.key === "Escape") { e.preventDefault(); if (ref.current) ref.current.innerText = value; ref.current?.blur(); }
      }}
      style={{
        outline: focused ? "1px solid var(--coral)" : "none",
        outlineOffset: 2, borderRadius: 2,
        padding: focused ? "0 2px" : 0,
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        display: "inline-block", minWidth: 40,
        ...style,
      }}
    >
      {value || <span style={{ color: "var(--ink-5)" }}>{placeholder || ""}</span>}
    </span>
  );
}

function CutRenderer({
  block, onEdit, onContinue, onDelete, onMove, onReorder, isFirst, isLast,
}: {
  block: CutBlock;
  paused: boolean;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onContinue?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, direction: "up" | "down") => void;
  onReorder?: (draggedId: string, targetId: string, position: "before" | "after") => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const patch = (p: Partial<CutBlock>) => onEdit?.(block.id, p as Partial<Block>);
  const [showOptional, setShowOptional] = useState(!!(block.dialogue || block.sfx || block.narration));
  const [dragOver, setDragOver] = useState<"before" | "after" | null>(null);

  return (
    <div
      draggable={!!onReorder}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/storymaker-block-id", block.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (!onReorder) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        // 카드 절반 위 = before, 절반 아래 = after
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        setDragOver(e.clientY < midpoint ? "before" : "after");
      }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => {
        if (!onReorder) return;
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/storymaker-block-id");
        if (draggedId && draggedId !== block.id) {
          onReorder(draggedId, block.id, dragOver || "after");
        }
        setDragOver(null);
      }}
      style={{
      marginBottom: 16,
      padding: "14px 16px",
      background: "var(--card-soft)",
      border: "1px solid var(--line)",
      borderLeft: "3px solid var(--coral)",
      borderRadius: 10,
      cursor: onReorder ? "grab" : "default",
      borderTop: dragOver === "before" ? "3px solid var(--coral)" : "1px solid var(--line)",
      borderBottom: dragOver === "after" ? "3px solid var(--coral)" : "1px solid var(--line)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--coral)", letterSpacing: "0.05em" }}>
          [컷 <EditableLine value={String(block.cutNo)} onChange={(v) => patch({ cutNo: parseInt(v, 10) || block.cutNo })} style={{ minWidth: 20 }} />]
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-4)", flex: 1 }}>그림 묘사 + (대사·SFX·N 옵션)</span>
        {/* ★ V3.1 B4 — 컷 순서 변경·삭제 (드래그는 V3.2) */}
        <div style={{ display: "flex", gap: 4 }}>
          {onMove && !isFirst && (
            <button type="button" onClick={() => onMove(block.id, "up")} title="위 컷과 순서 변경"
              style={{ fontSize: 11, padding: "2px 7px", background: "transparent", color: "var(--ink-4)", border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}>↑</button>
          )}
          {onMove && !isLast && (
            <button type="button" onClick={() => onMove(block.id, "down")} title="아래 컷과 순서 변경"
              style={{ fontSize: 11, padding: "2px 7px", background: "transparent", color: "var(--ink-4)", border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}>↓</button>
          )}
          {onDelete && (
            <button type="button" onClick={() => {
              if (confirm(`컷 ${block.cutNo} 삭제할까요?`)) onDelete(block.id);
            }} title="이 컷 삭제"
              style={{ fontSize: 11, padding: "2px 7px", background: "transparent", color: "var(--coral-deep, #c84738)", border: "1px solid var(--coral)", borderRadius: 4, cursor: "pointer" }}>×</button>
          )}
        </div>
      </div>

      {/* 그림 묘사 (필수) */}
      <div style={{ marginBottom: 8, fontSize: 14, lineHeight: 1.6, color: "var(--ink-1)" }}>
        <EditableLine value={block.visual} placeholder="컷 그림 묘사 (인물·앵글·배경·표정)" onChange={(v) => patch({ visual: v })} multiline />
      </div>

      {showOptional ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--line)" }}>
          <div>
            <span style={{ color: "var(--ink-4)", marginRight: 6 }}>대사:</span>
            <EditableLine value={block.dialogue || ""} placeholder="(없으면 공백)" onChange={(v) => patch({ dialogue: v || undefined })} multiline />
          </div>
          <div>
            <span style={{ color: "var(--ink-4)", marginRight: 6 }}>SFX:</span>
            <EditableLine value={block.sfx || ""} placeholder="쾅·휘이익·…" onChange={(v) => patch({ sfx: v || undefined })} />
          </div>
          <div>
            <span style={{ color: "var(--ink-4)", marginRight: 6 }}>N:</span>
            <EditableLine value={block.narration || ""} placeholder="나레이션" onChange={(v) => patch({ narration: v || undefined })} multiline />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowOptional(true)}
          style={{ marginTop: 6, fontSize: 11, padding: "2px 8px", background: "transparent", color: "var(--ink-4)", border: "1px dashed var(--line)", borderRadius: 4, cursor: "pointer" }}
        >+ 대사·SFX·N 추가</button>
      )}

      {onContinue && (
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <button type="button" onClick={() => onContinue(block.id)}
            style={{ fontSize: 11, padding: "3px 10px", background: "transparent", color: "var(--coral-deep)", border: "1px solid var(--coral)", borderRadius: 4, cursor: "pointer" }}
          >+ 다음 컷</button>
        </div>
      )}
    </div>
  );
}
