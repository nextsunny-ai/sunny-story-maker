"use client";

// V3.0 STRUCTURED 그룹 본문 캔버스 (K 전시 · L 게임).
// ★ 대표님이 가장 많이 쓰는 매체. letter로 내부 분기.
//   K 전시 = Zone 카드 (zoneName + area + flow + objects + interactive + docent)
//   L 게임 = 대사 데이터 표 (lineId + character + text + condition + nextId + affinity)

import { useRef, useState, type KeyboardEvent } from "react";
import type { Block, ZoneBlock, GameLineBlock } from "@/lib/storymaker/write-doc";
import type { MediumCanvasRouterProps } from "./MediumCanvasRouter";

export function StructuredCanvas(props: MediumCanvasRouterProps) {
  return props.doc.letter === "K" ? <ExhibitionCanvas {...props} /> : <GameCanvas {...props} />;
}

// ─── ContentEditable 공통 ───
function EditField({
  value, placeholder, onChange, multiline, style,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  style?: React.CSSProperties;
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
        if (!multiline && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ref.current?.blur(); }
        if (e.key === "Escape") { e.preventDefault(); if (ref.current) ref.current.innerText = value; ref.current?.blur(); }
      }}
      style={{
        minHeight: 22, lineHeight: 1.5,
        outline: focused ? "1px solid var(--coral)" : "none",
        outlineOffset: 1, borderRadius: 3,
        padding: focused ? "0 4px" : 0,
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        cursor: "text",
        ...style,
      }}
    >
      {value || <span style={{ color: "var(--ink-5)" }}>{placeholder || ""}</span>}
    </div>
  );
}

// ─── K 전시 — Zone 카드 ───
function ExhibitionCanvas({ doc, onBlockEdit, onBlockContinue, onBlockDelete, onBlockMove }: MediumCanvasRouterProps) {
  const zones = doc.blocks.filter((b) => b.kind === "zone") as ZoneBlock[];
  const others = doc.blocks.filter((b) => b.kind !== "zone");

  return (
    <div className="structured-canvas-exhibition">
      {others.map((b) => (
        <div key={b.id} style={{ marginBottom: 12, padding: 10, color: "var(--ink-3)", fontSize: 13, gridColumn: "1 / -1" }}>
          {"text" in b ? (b as { text: string }).text : ""}
        </div>
      ))}

      {zones.length === 0 ? (
        <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 13, textAlign: "center", border: "1px dashed var(--line)", borderRadius: 10 }}>
          빈 전시입니다. 채팅에서 "Zone 1부터 시작해줘" 요청하시거나 원고를 가져오세요.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {zones.map((z, idx) => (
            <ZoneCard
              key={z.id}
              zone={z}
              showAdd={idx === zones.length - 1}
              isFirst={idx === 0}
              isLast={idx === zones.length - 1}
              onEdit={onBlockEdit}
              onContinue={onBlockContinue}
              onDelete={onBlockDelete}
              onMove={onBlockMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ZoneCard({
  zone, showAdd, isFirst, isLast, onEdit, onContinue, onDelete, onMove,
}: {
  zone: ZoneBlock;
  showAdd: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onContinue?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, direction: "up" | "down") => void;
}) {
  const patch = (p: Partial<ZoneBlock>) => onEdit?.(zone.id, p as Partial<Block>);
  return (
    <div style={{
      padding: "14px 16px",
      background: "var(--card)",
      border: "1px solid var(--line)",
      borderLeft: "3px solid var(--coral)",
      borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: "1px dashed var(--line)" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--coral)" }}>
          [존 <EditField value={String(zone.zoneNo)} onChange={(v) => patch({ zoneNo: parseInt(v, 10) || zone.zoneNo })} style={{ display: "inline-block", minWidth: 30 }} />]
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-1)", flex: 1 }}>
          <EditField value={zone.zoneName} placeholder="존 이름 (예: 입구 홀)" onChange={(v) => patch({ zoneName: v })} style={{ display: "inline-block", minWidth: 200 }} />
        </span>
        {/* ★ V3.1 B6 — Zone 액션 버튼 (↑·↓·×) */}
        <div style={{ display: "flex", gap: 4 }}>
          {onMove && !isFirst && (
            <button type="button" onClick={() => onMove(zone.id, "up")} title="위로 이동"
              style={{ fontSize: 11, padding: "2px 7px", background: "transparent", color: "var(--ink-4)", border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}>↑</button>
          )}
          {onMove && !isLast && (
            <button type="button" onClick={() => onMove(zone.id, "down")} title="아래로 이동"
              style={{ fontSize: 11, padding: "2px 7px", background: "transparent", color: "var(--ink-4)", border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}>↓</button>
          )}
          {onDelete && (
            <button type="button" onClick={() => {
              if (confirm(`Zone "${zone.zoneName || zone.zoneNo}" 삭제할까요?`)) onDelete(zone.id);
            }} title="존 삭제"
              style={{ fontSize: 11, padding: "2px 7px", background: "transparent", color: "var(--coral-deep, #c84738)", border: "1px solid var(--coral)", borderRadius: 4, cursor: "pointer" }}>×</button>
          )}
        </div>
      </div>
      <FieldRow label="면적" value={zone.area || ""} placeholder="㎡ 또는 ─" onChange={(v) => patch({ area: v || undefined })} />
      <FieldRow label="동선" value={zone.flow || ""} placeholder="입구 → 좌측 → 중앙" onChange={(v) => patch({ flow: v || undefined })} />
      <FieldRow label="오브제" value={zone.objects || ""} placeholder="주요 작품·구조물 (쉼표 구분)" onChange={(v) => patch({ objects: v || undefined })} multiline />
      <FieldRow label="인터랙티브" value={zone.interactive || ""} placeholder="센서·터치·VR 등 (없으면 ─)" onChange={(v) => patch({ interactive: v || undefined })} multiline />
      <FieldRow label="도슨트" value={zone.docent || ""} placeholder="해설 텍스트·음성·QR" onChange={(v) => patch({ docent: v || undefined })} multiline />
      {showAdd && onContinue && (
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <button type="button" onClick={() => onContinue(zone.id)}
            style={{ fontSize: 11, padding: "3px 10px", background: "transparent", color: "var(--coral-deep)", border: "1px solid var(--coral)", borderRadius: 4, cursor: "pointer" }}
          >+ 다음 존</button>
        </div>
      )}
    </div>
  );
}

function FieldRow({
  label, value, placeholder, onChange, multiline,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 5, fontSize: 13, alignItems: "flex-start" }}>
      <span style={{ width: 70, color: "var(--ink-4)", fontSize: 11.5, fontWeight: 600, paddingTop: 2 }}>{label}</span>
      <div style={{ flex: 1 }}>
        <EditField value={value} placeholder={placeholder} onChange={onChange} multiline={multiline} />
      </div>
    </div>
  );
}

// ─── L 게임 — 대사 데이터 표 ───
function GameCanvas({ doc, onBlockEdit, onBlockContinue, onBlockDelete }: MediumCanvasRouterProps) {
  const lines = doc.blocks.filter((b) => b.kind === "game-line") as GameLineBlock[];
  const others = doc.blocks.filter((b) => b.kind !== "game-line");

  return (
    <div className="structured-canvas-game">
      {others.map((b) => (
        <div key={b.id} style={{ marginBottom: 12, padding: 10, color: "var(--ink-3)", fontSize: 13 }}>
          {"text" in b ? (b as { text: string }).text : ""}
        </div>
      ))}

      {lines.length === 0 ? (
        <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 13, textAlign: "center", border: "1px dashed var(--line)", borderRadius: 10 }}>
          빈 게임 대사 데이터입니다. 채팅에서 "메인 캐릭터 대화 시작해줘" 요청하세요.
        </div>
      ) : (
        <table style={{
          width: "100%", borderCollapse: "collapse", fontSize: 12.5,
          border: "1px solid var(--line)",
          background: "var(--card)", borderRadius: 8, overflow: "hidden",
        }}>
          <thead>
            <tr style={{ background: "var(--card-soft)" }}>
              <Th>ID</Th>
              <Th>캐릭터</Th>
              <Th>대사</Th>
              <Th>조건</Th>
              <Th>다음 ID</Th>
              <Th>호감도</Th>
              <Th>×</Th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <GameLineRow
                key={line.id}
                line={line}
                showAdd={idx === lines.length - 1}
                onEdit={onBlockEdit}
                onContinue={onBlockContinue}
                onDelete={onBlockDelete}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid var(--coral)", borderLeft: "1px solid var(--line)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", color: "var(--coral-deep)" }}>
      {children}
    </th>
  );
}

function GameLineRow({
  line, showAdd, onEdit, onContinue, onDelete,
}: {
  line: GameLineBlock;
  showAdd: boolean;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onContinue?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const patch = (p: Partial<GameLineBlock>) => onEdit?.(line.id, p as Partial<Block>);
  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <td style={{ padding: "6px 8px", verticalAlign: "top", borderRight: "1px solid var(--line)", width: 80, fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--ink-2)" }}>
        <EditField value={line.lineId} onChange={(v) => patch({ lineId: v })} />
      </td>
      <td style={{ padding: "6px 8px", verticalAlign: "top", borderRight: "1px solid var(--line)", width: 100, fontWeight: 600 }}>
        <EditField value={line.character} onChange={(v) => patch({ character: v })} />
      </td>
      <td style={{ padding: "6px 8px", verticalAlign: "top", borderRight: "1px solid var(--line)" }}>
        <EditField value={line.text} onChange={(v) => patch({ text: v })} multiline />
      </td>
      <td style={{ padding: "6px 8px", verticalAlign: "top", borderRight: "1px solid var(--line)", width: 120, fontSize: 11.5, color: "var(--ink-3)" }}>
        <EditField value={line.condition || ""} placeholder="(없음)" onChange={(v) => patch({ condition: v || undefined })} />
      </td>
      <td style={{ padding: "6px 8px", verticalAlign: "top", borderRight: "1px solid var(--line)", width: 90, fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>
        <EditField value={line.nextId || ""} placeholder="─" onChange={(v) => patch({ nextId: v || undefined })} />
      </td>
      <td style={{ padding: "6px 8px", verticalAlign: "top", borderRight: "1px solid var(--line)", width: 70, fontSize: 11.5, color: "var(--ink-3)" }}>
        <EditField value={line.affinity || ""} placeholder="±0" onChange={(v) => patch({ affinity: v || undefined })} />
      </td>
      {/* ★ V3.1 B6 — 행 삭제 + (마지막 행에만) 행 추가 */}
      <td style={{ padding: 4, width: 60, verticalAlign: "middle", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
          {onDelete && (
            <button type="button" onClick={() => {
              if (confirm(`대사 ID "${line.lineId}" 삭제할까요?`)) onDelete(line.id);
            }} title="이 행 삭제"
              style={{ fontSize: 10, padding: "2px 5px", background: "transparent", color: "var(--coral-deep, #c84738)", border: "1px solid var(--coral)", borderRadius: 3, cursor: "pointer" }}>×</button>
          )}
          {showAdd && onContinue && (
            <button type="button" onClick={() => onContinue(line.id)} title="다음 행 추가"
              style={{ fontSize: 10, padding: "2px 5px", background: "transparent", color: "var(--coral)", border: "1px solid var(--coral)", borderRadius: 3, cursor: "pointer" }}
            >+</button>
          )}
        </div>
      </td>
    </tr>
  );
}
