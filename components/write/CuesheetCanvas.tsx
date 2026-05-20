"use client";

// V3.0 CUESHEET 그룹 본문 캔버스 (G 다큐 · J 유튜브 · M 예능).
// 시간축 표 (table). 매체별 컬럼셋 = CUE_COLUMNS[letter].
// 인라인 셀 편집 (ContentEditable).

import { useRef, useState, type KeyboardEvent } from "react";
import type { Block, CueRowBlock } from "@/lib/storymaker/write-doc";
import { CUE_COLUMNS } from "@/lib/storymaker/write-doc";
import type { MediumCanvasRouterProps } from "./MediumCanvasRouter";

export function CuesheetCanvas({ doc, onBlockEdit, onBlockContinue, onColumnAdd, onColumnRemove }: MediumCanvasRouterProps) {
  const columns = doc.cueColumns || CUE_COLUMNS[doc.letter] || CUE_COLUMNS.M;
  const rows = doc.blocks.filter((b) => b.kind === "cue-row") as CueRowBlock[];
  const otherBlocks = doc.blocks.filter((b) => b.kind !== "cue-row");

  return (
    <div className="cuesheet-canvas">
      {otherBlocks.map((b) => (
        <div key={b.id} style={{ marginBottom: 12, padding: 10, background: "var(--card-soft)", border: "1px dashed var(--line)", borderRadius: 8, fontSize: 13 }}>
          {"text" in b ? (b as { text: string }).text : ""}
        </div>
      ))}

      {/* ★ V3.1 B5 — 컬럼 추가 버튼 */}
      {onColumnAdd && (
        <div style={{ marginBottom: 10, textAlign: "right" }}>
          <button
            type="button"
            onClick={() => {
              const label = prompt("새 컬럼 이름 (예: 소품·인서트·예상 시간)");
              if (label?.trim()) onColumnAdd(label.trim());
            }}
            style={{ fontSize: 11.5, padding: "4px 10px", background: "transparent", color: "var(--coral)", border: "1px dashed var(--coral)", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            + 컬럼 추가
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 13, textAlign: "center", border: "1px dashed var(--line)", borderRadius: 10 }}>
          빈 큐시트입니다. 채팅에서 "1편 큐시트 시작해줘" 요청하시거나 [+ 행 추가]로 직접 작성하세요.
        </div>
      ) : (
        <table style={{
          width: "100%", borderCollapse: "collapse", fontSize: 13,
          border: "1px solid var(--line)",
          background: "var(--card)", borderRadius: 8, overflow: "hidden",
        }}>
          <thead>
            <tr style={{ background: "var(--card-soft)" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid var(--coral)", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "var(--coral-deep)" }}>
                시간
              </th>
              {columns.map((c) => (
                <th key={c.key} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid var(--coral)", borderLeft: "1px solid var(--line)", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "var(--coral-deep)", position: "relative" }}>
                  {c.label}
                  {onColumnRemove && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`컬럼 "${c.label}" 삭제할까요? (모든 행의 이 데이터가 사라집니다)`)) onColumnRemove(c.key);
                      }}
                      title="컬럼 삭제"
                      style={{ marginLeft: 6, fontSize: 9, padding: "1px 4px", background: "transparent", color: "var(--ink-5)", border: "1px solid var(--line)", borderRadius: 3, cursor: "pointer", verticalAlign: "middle" }}
                    >×</button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <RowRenderer
                key={row.id}
                row={row}
                columns={columns}
                showAdd={idx === rows.length - 1}
                onEdit={onBlockEdit}
                onContinue={onBlockContinue}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CellEditable({
  value, onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const isComposingRef = useRef(false); // ★ V3.1 B3 — IME 한국어 조합
  return (
    <div
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
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (isComposingRef.current || e.nativeEvent.isComposing) return; // ★ B3 = 조합 중 무시
        if (e.key === "Escape") { e.preventDefault(); if (ref.current) ref.current.innerText = value; ref.current?.blur(); }
      }}
      style={{
        minHeight: 24, lineHeight: 1.5,
        outline: focused ? "1px solid var(--coral)" : "none",
        outlineOffset: -1, borderRadius: 2,
        whiteSpace: "pre-wrap",
        cursor: "text",
      }}
    >
      {value || <span style={{ color: "var(--ink-5)" }}>(빈 셀)</span>}
    </div>
  );
}

function RowRenderer({
  row, columns, showAdd, onEdit, onContinue,
}: {
  row: CueRowBlock;
  columns: { key: string; label: string }[];
  showAdd: boolean;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onContinue?: (id: string) => void;
}) {
  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <td style={{ padding: "8px 10px", verticalAlign: "top", borderRight: "1px solid var(--line)", width: 100, fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "var(--ink-2)" }}>
        <CellEditable value={row.timecode} onChange={(v) => onEdit?.(row.id, { timecode: v } as Partial<Block>)} />
      </td>
      {columns.map((c) => (
        <td key={c.key} style={{ padding: "8px 10px", verticalAlign: "top", borderRight: "1px solid var(--line)" }}>
          <CellEditable
            value={row.cells[c.key] || ""}
            onChange={(v) => onEdit?.(row.id, { cells: { ...row.cells, [c.key]: v } } as Partial<Block>)}
          />
        </td>
      ))}
      {showAdd && onContinue && (
        <td style={{ padding: 4, width: 60, verticalAlign: "middle", textAlign: "center", background: "var(--card-soft)" }}>
          <button type="button" onClick={() => onContinue(row.id)} title="다음 행 추가"
            style={{ fontSize: 11, padding: "3px 6px", background: "transparent", color: "var(--coral)", border: "1px solid var(--coral)", borderRadius: 4, cursor: "pointer" }}
          >+ 행</button>
        </td>
      )}
    </tr>
  );
}
