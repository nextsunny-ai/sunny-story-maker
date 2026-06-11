"use client";

// V3.0 STRUCTURED 그룹 본문 캔버스 (K 전시 · L 게임).
// ★ 대표님이 가장 많이 쓰는 매체. letter로 내부 분기.
//   K 전시 = Zone 카드 (zoneName + area + flow + objects + interactive + docent)
//   L 게임 = 대사 데이터 표 (lineId + character + text + condition + nextId + affinity)

import { useId, useRef, useState, type KeyboardEvent } from "react";
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
function GameCanvas({ doc, onBlockEdit, onBlockContinue, onBlockDelete, onBlockMove }: MediumCanvasRouterProps) {
  const lines = doc.blocks.filter((b) => b.kind === "game-line") as GameLineBlock[];
  const others = doc.blocks.filter((b) => b.kind !== "game-line");

  // ★ V3.1 — 분기 시각화 모드: "table" | "tree" | "graph" (V3.1 B8 SVG 추가)
  const [viewMode, setViewMode] = useState<"table" | "tree" | "graph">("table");

  return (
    <div className="structured-canvas-game">
      {others.map((b) => (
        <div key={b.id} style={{ marginBottom: 12, padding: 10, color: "var(--ink-3)", fontSize: 13 }}>
          {"text" in b ? (b as { text: string }).text : ""}
        </div>
      ))}

      {lines.length > 1 && (
        <div style={{ marginBottom: 12, textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 4 }}>
          {(["table", "tree", "graph"] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              style={{
                fontSize: 11.5,
                padding: "5px 10px",
                background: viewMode === m ? "var(--coral, #ff6b53)" : "transparent",
                color: viewMode === m ? "#fff" : "var(--coral-deep, #c84738)",
                border: "1px solid var(--coral)",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {m === "table" ? "📋 표" : m === "tree" ? "🌳 트리" : "🕸 그래프"}
            </button>
          ))}
        </div>
      )}

      {viewMode === "tree" && lines.length > 0 && <GameBranchTree lines={lines} />}
      {viewMode === "graph" && lines.length > 0 && <GameBranchGraph lines={lines} />}
      {viewMode === "table" && (
        <>

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
                isFirst={idx === 0}
                isLast={idx === lines.length - 1}
                onEdit={onBlockEdit}
                onContinue={onBlockContinue}
                onDelete={onBlockDelete}
                onMove={onBlockMove}
              />
            ))}
          </tbody>
        </table>
      )}
        </>
      )}
    </div>
  );
}

// ★ V3.1 — Game 분기 트리 시각화 (nextId 연결 기반 indent tree)
function GameBranchTree({ lines }: { lines: GameLineBlock[] }) {
  // lineId → line map
  const byId = new Map<string, GameLineBlock>();
  for (const l of lines) byId.set(l.lineId, l);

  // 진입 노드 = nextId로 참조되지 X 노드 (= 시작점)
  const referenced = new Set<string>();
  for (const l of lines) {
    if (l.nextId) {
      // 분기 = 콤마·세미콜론 구분
      l.nextId.split(/[,;]/).forEach(n => referenced.add(n.trim()));
    }
  }
  const roots = lines.filter(l => !referenced.has(l.lineId));

  // 트리 렌더 — 사이클 방지용 visited
  const renderNode = (line: GameLineBlock, depth: number, visited: Set<string>): React.ReactNode => {
    if (visited.has(line.lineId)) {
      return (
        <div key={line.lineId + "-cycle"} style={{ paddingLeft: depth * 20, color: "var(--ink-5)", fontSize: 11 }}>
          ↻ {line.lineId} (이미 박힌 노드 = 사이클)
        </div>
      );
    }
    const next = new Set(visited);
    next.add(line.lineId);
    const children = line.nextId
      ? line.nextId.split(/[,;]/).map(s => s.trim()).filter(Boolean)
      : [];
    return (
      <div key={line.lineId} style={{ marginBottom: 6 }}>
        <div style={{
          paddingLeft: depth * 20,
          fontSize: 12.5, lineHeight: 1.5,
          borderLeft: depth > 0 ? "2px solid var(--line)" : "none",
          marginLeft: depth > 0 ? 8 : 0,
        }}>
          <span style={{ fontFamily: "monospace", color: "var(--coral-deep, #c84738)", fontWeight: 700 }}>
            {line.lineId}
          </span>
          <span style={{ marginLeft: 8, fontWeight: 600 }}>{line.character}</span>
          <span style={{ marginLeft: 8, color: "var(--ink-2)" }}>
            "{line.text.slice(0, 50)}{line.text.length > 50 ? "…" : ""}"
          </span>
          {line.condition && (
            <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--ink-4)", fontStyle: "italic" }}>
              [조건: {line.condition}]
            </span>
          )}
          {line.affinity && (
            <span style={{ marginLeft: 8, fontSize: 10.5, color: line.affinity.startsWith("-") ? "#c84738" : "#10b981" }}>
              {line.affinity}
            </span>
          )}
        </div>
        {children.length > 1 && (
          <div style={{ paddingLeft: depth * 20 + 8, fontSize: 10.5, color: "var(--coral)", marginTop: 2 }}>
            ⤷ {children.length}개 분기
          </div>
        )}
        {children.map(nextId => {
          const child = byId.get(nextId);
          if (!child) {
            return (
              <div key={nextId + "-missing"} style={{ paddingLeft: (depth + 1) * 20, color: "var(--ink-5)", fontSize: 11 }}>
                ⚠ {nextId} (= 정의되지 X 노드)
              </div>
            );
          }
          return renderNode(child, depth + 1, next);
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: 14, background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13 }}>
      <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 10, letterSpacing: "0.05em", fontWeight: 700 }}>
        🌳 분기 트리 ({roots.length}개 시작점 · {lines.length}개 노드)
      </div>
      {roots.length === 0 && (
        <div style={{ color: "var(--ink-4)", fontSize: 12 }}>
          시작점이 없습니다 (= 모든 노드가 다른 노드의 분기). 첫 lineId의 nextId가 올바르게 설정됐는지 점검하세요.
        </div>
      )}
      {roots.map(r => renderNode(r, 0, new Set()))}
    </div>
  );
}

// ★ V3.1 B8 — Game 분기 SVG 그래프 시각화 (hierarchical layout)
function GameBranchGraph({ lines }: { lines: GameLineBlock[] }) {
  const markerId = `arr-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;  // SVG marker id 고유화 (다중 인스턴스 충돌 방지)
  const byId = new Map<string, GameLineBlock>();
  for (const l of lines) byId.set(l.lineId, l);

  // depth 계산 (= roots부터 BFS)
  const referenced = new Set<string>();
  for (const l of lines) {
    if (l.nextId) l.nextId.split(/[,;]/).forEach(n => referenced.add(n.trim()));
  }
  const roots = lines.filter(l => !referenced.has(l.lineId));

  // node → depth 매핑 (BFS, 사이클 방지)
  const depthOf = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = roots.map(r => ({ id: r.lineId, depth: 0 }));
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depthOf.has(id)) continue;
    depthOf.set(id, depth);
    const cur = byId.get(id);
    if (cur?.nextId) {
      cur.nextId.split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(nid => {
        if (byId.has(nid) && !depthOf.has(nid)) queue.push({ id: nid, depth: depth + 1 });
      });
    }
  }
  // depth가 안 잡힌 노드 (= 사이클·orphan) = 최대 depth+1
  const maxAssignedDepth = Math.max(0, ...Array.from(depthOf.values()));
  for (const l of lines) {
    if (!depthOf.has(l.lineId)) depthOf.set(l.lineId, maxAssignedDepth + 1);
  }

  // depth별 그룹화
  const depthGroups = new Map<number, string[]>();
  for (const l of lines) {
    const d = depthOf.get(l.lineId)!;
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(l.lineId);
  }
  const maxDepth = Math.max(0, ...Array.from(depthGroups.keys()));
  const maxNodesPerDepth = Math.max(1, ...Array.from(depthGroups.values()).map(arr => arr.length));

  // 노드 위치 계산
  const NODE_W = 120;
  const NODE_H = 40;
  const COL_GAP = 60;
  const ROW_GAP = 24;
  const PAD = 20;
  const width = Math.max(600, (maxDepth + 1) * (NODE_W + COL_GAP) + PAD * 2);
  const height = Math.max(200, maxNodesPerDepth * (NODE_H + ROW_GAP) + PAD * 2);

  const positions = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of depthGroups) {
    const colY = (height - ids.length * (NODE_H + ROW_GAP)) / 2;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: PAD + d * (NODE_W + COL_GAP),
        y: colY + i * (NODE_H + ROW_GAP),
      });
    });
  }

  // 엣지 (= parent.center.right → child.center.left)
  const edges: Array<{ from: string; to: string; missing?: boolean }> = [];
  for (const l of lines) {
    if (!l.nextId) continue;
    l.nextId.split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(nid => {
      edges.push({ from: l.lineId, to: nid, missing: !byId.has(nid) });
    });
  }

  return (
    <div style={{ padding: 14, background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10, overflow: "auto" }}>
      <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 10, letterSpacing: "0.05em", fontWeight: 700 }}>
        🕸 분기 그래프 ({lines.length}개 노드 · {edges.length}개 연결 · 깊이 {maxDepth + 1})
      </div>
      <svg width={width} height={height} style={{ display: "block" }}>
        {/* 엣지 = 곡선 path */}
        {edges.map((e, i) => {
          const p1 = positions.get(e.from);
          if (!p1) return null;
          const p2 = positions.get(e.to);
          const targetX = p2 ? p2.x : p1.x + NODE_W + COL_GAP - 10;
          const targetY = p2 ? p2.y + NODE_H / 2 : p1.y + NODE_H / 2;
          const x1 = p1.x + NODE_W;
          const y1 = p1.y + NODE_H / 2;
          const cx = (x1 + targetX) / 2;
          const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${targetY}, ${targetX} ${targetY}`;
          return (
            <path
              key={`e-${i}`}
              d={d}
              stroke={e.missing ? "#dc2626" : "#999"}
              strokeWidth={1.5}
              fill="none"
              strokeDasharray={e.missing ? "4 3" : undefined}
              markerEnd={`url(#${markerId})`}
            />
          );
        })}
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#777" />
          </marker>
        </defs>
        {/* 노드 = rect + 텍스트 */}
        {lines.map(l => {
          const p = positions.get(l.lineId);
          if (!p) return null;
          return (
            <g key={l.lineId} transform={`translate(${p.x}, ${p.y})`}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill="var(--card, #fff)"
                stroke="var(--coral, #ff6b53)"
                strokeWidth={1.5}
              />
              <text x={8} y={16} fontSize={11} fontWeight={700} fill="var(--coral-deep, #c84738)" fontFamily="monospace">
                {l.lineId}
              </text>
              <text x={8} y={32} fontSize={11} fill="var(--ink, #222)">
                {(l.character || "—").slice(0, 12)}
              </text>
            </g>
          );
        })}
        {/* 끊긴 nextId (= missing 노드) 표시 */}
        {edges.filter(e => e.missing).map((e, i) => {
          const p = positions.get(e.from);
          if (!p) return null;
          return (
            <text
              key={`m-${i}`}
              x={p.x + NODE_W + COL_GAP - 6}
              y={p.y + NODE_H / 2 + 4}
              fontSize={10}
              fill="#dc2626"
            >
              ⚠ {e.to}
            </text>
          );
        })}
      </svg>
      <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 8 }}>
        가로 = 분기 깊이 / 세로 = 같은 깊이 노드. 빨간 점선 = 끊긴 nextId.
      </div>
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
  line, showAdd, isFirst, isLast, onEdit, onContinue, onDelete, onMove,
}: {
  line: GameLineBlock;
  showAdd: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onEdit?: (id: string, patch: Partial<Block>) => void;
  onContinue?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMove?: (id: string, direction: "up" | "down") => void;
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
      {/* ★ V3.1 B6 보강 — 행 ↑↓×+ */}
      <td style={{ padding: 4, width: 80, verticalAlign: "middle", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
          {onMove && !isFirst && (
            <button type="button" onClick={() => onMove(line.id, "up")} title="위 행과 순서 변경"
              style={{ fontSize: 10, padding: "2px 4px", background: "transparent", color: "var(--ink-4)", border: "1px solid var(--line)", borderRadius: 3, cursor: "pointer" }}>↑</button>
          )}
          {onMove && !isLast && (
            <button type="button" onClick={() => onMove(line.id, "down")} title="아래 행과 순서 변경"
              style={{ fontSize: 10, padding: "2px 4px", background: "transparent", color: "var(--ink-4)", border: "1px solid var(--line)", borderRadius: 3, cursor: "pointer" }}>↓</button>
          )}
          {onDelete && (
            <button type="button" onClick={() => {
              if (confirm(`대사 ID "${line.lineId}" 삭제할까요?`)) onDelete(line.id);
            }} title="이 행 삭제"
              style={{ fontSize: 10, padding: "2px 4px", background: "transparent", color: "var(--coral-deep, #c84738)", border: "1px solid var(--coral)", borderRadius: 3, cursor: "pointer" }}>×</button>
          )}
          {showAdd && onContinue && (
            <button type="button" onClick={() => onContinue(line.id)} title="다음 행 추가"
              style={{ fontSize: 10, padding: "2px 4px", background: "transparent", color: "var(--coral)", border: "1px solid var(--coral)", borderRadius: 3, cursor: "pointer" }}
            >+</button>
          )}
        </div>
      </td>
    </tr>
  );
}
