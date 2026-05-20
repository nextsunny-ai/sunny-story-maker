"use client";

// V3.0 SCREENPLAY + STAGE 그룹 본문 캔버스
//   SCREENPLAY: A 드라마·B 영화·C 숏드라마·D 극장 애니·E 애니 시리즈
//   STAGE:      I 뮤지컬·N 연극
//
// 블록 종류: SceneHeadingBlock·ActionBlock·DialogueBlock·MusicNumberBlock(STAGE)·ProseBlock(fallback)·HeaderBlock(STAGE 막/장)
//
// 핵심 UX (V3.0): 대사 인라인 수정 — 캐릭터·대사 각각 클릭하면 바로 편집 (ContentEditable).

import { useRef, useState, type KeyboardEvent } from "react";
import { Markdown } from "@/components/Markdown";
import type {
  Block, SceneHeadingBlock, ActionBlock, DialogueBlock, MusicNumberBlock, ProseBlock, HeaderBlock,
} from "@/lib/storymaker/write-doc";
import type { MediumCanvasRouterProps } from "./MediumCanvasRouter";

export function ScreenplayCanvas({
  doc, paused, onBlockEdit, onBlockRewrite, onBlockContinue,
}: MediumCanvasRouterProps) {
  return (
    <div className="screenplay-canvas">
      {doc.blocks.length === 0 && (
        <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 13, textAlign: "center", fontFamily: "var(--font-display)" }}>
          빈 작업실입니다. 우측 채팅에서 시작하시거나 [📥 원고 가져오기]로 기존 시나리오를 가져오세요.
        </div>
      )}

      {doc.blocks.map((b) => (
        <BlockRouter
          key={b.id}
          block={b}
          paused={paused}
          onEdit={onBlockEdit}
          onRewrite={onBlockRewrite}
          onContinue={onBlockContinue}
        />
      ))}
    </div>
  );
}

// ─── Block kind 분기 ───
function BlockRouter({
  block, paused, onEdit, onRewrite, onContinue,
}: {
  block: Block;
  paused: boolean;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onRewrite?: (id: string) => void;
  onContinue?: (id: string) => void;
}) {
  switch (block.kind) {
    case "header":
      return <HeaderRenderer block={block} onEdit={onEdit} />;
    case "scene-heading":
      return <SceneHeadingRenderer block={block} onEdit={onEdit} onContinue={onContinue} />;
    case "action":
      return <ActionRenderer block={block} paused={paused} onEdit={onEdit} onRewrite={onRewrite} onContinue={onContinue} />;
    case "dialogue":
      return <DialogueRenderer block={block} onEdit={onEdit} onContinue={onContinue} />;
    case "music-number":
      return <MusicNumberRenderer block={block} onEdit={onEdit} />;
    case "prose":
      // 시나리오 fallback — 옛 paras 텍스트
      return <ProseRenderer block={block} paused={paused} onEdit={onEdit} onRewrite={onRewrite} onContinue={onContinue} />;
    default:
      // 다른 그룹 블록이 섞여있으면 텍스트만 보존
      return (
        <div style={{ marginBottom: 8, padding: 8, color: "var(--ink-4)", fontSize: 12, fontStyle: "italic" }}>
          [{block.kind}] (이 그룹 캔버스에서 미지원)
        </div>
      );
  }
}

// ─── 공통 ContentEditable span — 클릭하면 인라인 편집 ───
function EditableSpan({
  value, placeholder, onChange, style, multiline,
}: {
  value: string;
  placeholder?: string;
  onChange: (newValue: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);

  const handleBlur = () => {
    setFocused(false);
    const text = ref.current?.innerText || "";
    if (text !== value) onChange(text);
  };
  const handleKey = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === "Escape") {
      if (ref.current) ref.current.innerText = value;
      ref.current?.blur();
    }
  };

  return (
    <span
      ref={ref}
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKey}
      style={{
        outline: focused ? "1px solid var(--coral)" : "none",
        outlineOffset: 2,
        borderRadius: 2,
        padding: focused ? "0 2px" : 0,
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        ...style,
      }}
    >
      {value || (
        <span style={{ color: "var(--ink-5)" }}>{placeholder || ""}</span>
      )}
    </span>
  );
}

// ─── SceneHeading 렌더 (S#1. 장소 - 시간) ───
function SceneHeadingRenderer({
  block, onEdit, onContinue,
}: {
  block: SceneHeadingBlock;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onContinue?: (id: string) => void;
}) {
  const patch = (p: Partial<SceneHeadingBlock>) => onEdit?.(block.id, p as Partial<Block>);
  return (
    <div style={{
      marginTop: 20, marginBottom: 10,
      fontSize: 15, fontWeight: 700,
      color: "var(--ink-1)",
      letterSpacing: "0.02em",
      borderLeft: "3px solid var(--coral)",
      paddingLeft: 12,
    }}>
      <EditableSpan
        value={block.sceneNo ? `S#${block.sceneNo}` : ""}
        placeholder="S#1"
        onChange={(v) => patch({ sceneNo: v.replace(/^S#\s*/i, "").trim() || undefined })}
        style={{ marginRight: 10, color: "var(--coral)" }}
      />
      <EditableSpan
        value={block.intExt || ""}
        placeholder="INT./EXT."
        onChange={(v) => {
          const cleaned = v.toUpperCase().replace(/[.\s]+$/, "");
          patch({ intExt: (cleaned === "INT" || cleaned === "EXT" || cleaned === "INT/EXT") ? cleaned : undefined });
        }}
        style={{ marginRight: 8 }}
      />
      <EditableSpan
        value={block.place}
        placeholder="장소"
        onChange={(v) => patch({ place: v })}
        style={{ marginRight: 8 }}
      />
      {block.time !== undefined || true ? (
        <>
          <span style={{ color: "var(--ink-4)" }}>- </span>
          <EditableSpan
            value={block.time || ""}
            placeholder="낮·밤·새벽"
            onChange={(v) => patch({ time: v || undefined })}
            style={{ color: "var(--ink-3)" }}
          />
        </>
      ) : null}
      {onContinue && (
        <button type="button" onClick={() => onContinue(block.id)} title="다음에 새 블록 추가"
          style={{ marginLeft: 12, fontSize: 11, padding: "2px 8px", background: "transparent", color: "var(--ink-4)", border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}
        >+ 다음</button>
      )}
    </div>
  );
}

// ─── Action 렌더 (지문) ───
function ActionRenderer({
  block, paused, onEdit, onRewrite, onContinue,
}: {
  block: ActionBlock;
  paused: boolean;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onRewrite?: (id: string) => void;
  onContinue?: (id: string) => void;
}) {
  const isStreaming = block.status === "streaming";
  return (
    <div className={"wpara is-" + block.status + (paused && isStreaming ? " is-paused" : "")}
      style={{ paddingLeft: 12, marginBottom: 8 }}
    >
      <div className="wpara-body">
        <EditableSpan
          value={block.text}
          placeholder="지문 (인물·배경 묘사)"
          onChange={(v) => onEdit?.(block.id, { text: v } as Partial<Block>)}
          multiline
          style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)" }}
        />
        {block.status === "done" && (
          <div className="wpara-actions" style={{ marginTop: 4 }}>
            {onRewrite && (
              <button type="button" className="wpara-action" onClick={() => onRewrite(block.id)}>
                <span className="wpara-action-icon">↻</span><span>다시 써</span>
              </button>
            )}
            {onContinue && (
              <button type="button" className="wpara-action" onClick={() => onContinue(block.id)}>
                <span className="wpara-action-icon">+</span><span>더 쓰기</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dialogue 렌더 (★ V3.0 대사 인라인 수정 핵심) ───
function DialogueRenderer({
  block, onEdit, onContinue,
}: {
  block: DialogueBlock;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onContinue?: (id: string) => void;
}) {
  const patch = (p: Partial<DialogueBlock>) => onEdit?.(block.id, p as Partial<Block>);
  return (
    <div style={{ marginBottom: 12, paddingLeft: 32 }}>
      {/* 캐릭터 라인 — 들여쓰기 + 굵게 */}
      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink-1)", marginBottom: 2 }}>
        <EditableSpan
          value={block.character}
          placeholder="캐릭터"
          onChange={(v) => patch({ character: v })}
          style={{ letterSpacing: "0.03em" }}
        />
        {block.effect && <span style={{ color: "var(--ink-4)", marginLeft: 6 }}>(E)</span>}
        {block.parenthetical !== undefined && (
          <span style={{ marginLeft: 8, fontSize: 12, color: "var(--ink-4)", fontWeight: 400 }}>
            (<EditableSpan
              value={block.parenthetical}
              placeholder="수줍어하며…"
              onChange={(v) => patch({ parenthetical: v || undefined })}
            />)
          </span>
        )}
      </div>
      {/* 대사 본문 — 들여쓰기 더 깊게 */}
      <div style={{ paddingLeft: 16, fontSize: 14, lineHeight: 1.65, color: "var(--ink-1)" }}>
        <EditableSpan
          value={block.text}
          placeholder="대사 본문…"
          onChange={(v) => patch({ text: v })}
          multiline
        />
      </div>
      {onContinue && (
        <div style={{ marginTop: 4, paddingLeft: 16 }}>
          <button type="button" onClick={() => onContinue(block.id)}
            style={{ fontSize: 11, padding: "2px 8px", background: "transparent", color: "var(--ink-4)", border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}
          >+ 다음 블록</button>
        </div>
      )}
    </div>
  );
}

// ─── MusicNumber 렌더 (STAGE 뮤지컬 ♪넘버) ───
function MusicNumberRenderer({
  block, onEdit,
}: {
  block: MusicNumberBlock;
  onEdit?: (id: string, patch: Partial<Block>) => void;
}) {
  const patch = (p: Partial<MusicNumberBlock>) => onEdit?.(block.id, p as Partial<Block>);
  return (
    <div style={{
      marginTop: 16, marginBottom: 12, padding: "10px 14px",
      background: "rgba(255, 107, 107, 0.04)",
      borderLeft: "3px solid var(--coral)", borderRadius: "0 8px 8px 0",
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--coral-deep)", marginBottom: 4 }}>
        ♪ {block.numberNo && <EditableSpan value={`#${block.numberNo}`} onChange={(v) => patch({ numberNo: v.replace(/^#\s*/, "") || undefined })} />}{" "}
        <EditableSpan value={block.numberTitle} placeholder="넘버 제목" onChange={(v) => patch({ numberTitle: v })} />
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
        <EditableSpan value={block.lyrics} placeholder="가사…" onChange={(v) => patch({ lyrics: v })} multiline />
      </div>
    </div>
  );
}

// ─── Prose fallback (옛 paras 텍스트) ───
function ProseRenderer({
  block, paused, onEdit, onRewrite, onContinue,
}: {
  block: ProseBlock;
  paused: boolean;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onRewrite?: (id: string) => void;
  onContinue?: (id: string) => void;
}) {
  const isStreaming = block.status === "streaming";
  return (
    <div className={"wpara is-" + block.status + (paused && isStreaming ? " is-paused" : "")} style={{ marginBottom: 8 }}>
      <div className="wpara-body">
        <div className="wpara-text">
          <Markdown text={block.text} />
        </div>
        {block.status === "done" && (
          <div className="wpara-actions">
            {onRewrite && (
              <button type="button" className="wpara-action" onClick={() => onRewrite(block.id)}>
                <span className="wpara-action-icon">↻</span><span>다시 써</span>
              </button>
            )}
            <button type="button" className="wpara-action" onClick={() => onEdit?.(block.id, { text: block.text } as Partial<Block>)}>
              <span className="wpara-action-icon">✎</span><span>수정</span>
            </button>
            {onContinue && (
              <button type="button" className="wpara-action" onClick={() => onContinue(block.id)}>
                <span className="wpara-action-icon">+</span><span>더 쓰기</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HeaderBlock 렌더 (STAGE 막/장 — PROSE와 같은 처리) ───
function HeaderRenderer({
  block, onEdit,
}: {
  block: HeaderBlock;
  onEdit?: (id: string, patch: Partial<Block>) => void;
}) {
  const patch = (p: Partial<HeaderBlock>) => onEdit?.(block.id, p as Partial<Block>);
  const prefix = block.level === "act" ? "제" : block.level === "chapter" ? "" : "";
  const suffix = block.level === "act" ? "막" : block.level === "scene-group" ? "장" : "";
  return (
    <div style={{
      marginTop: 28, marginBottom: 14, paddingTop: 14,
      borderTop: "2px solid var(--coral)",
      fontSize: 18, fontWeight: 700, color: "var(--ink-1)",
    }}>
      {(block.number || prefix || suffix) && (
        <span style={{ color: "var(--coral)", marginRight: 10 }}>
          {prefix}<EditableSpan value={block.number || ""} placeholder="1" onChange={(v) => patch({ number: v || undefined })} />{suffix}
        </span>
      )}
      <EditableSpan value={block.title} placeholder="제목" onChange={(v) => patch({ title: v })} />
    </div>
  );
}
