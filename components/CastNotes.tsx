"use client";

// V3.1 추가-3 — 작품별 인물·설정 사이드 노트
// 작가가 = 작품마다 = 인물 (이름·역할·관계·소개)·설정 (장소·아이템·세계관) 카드 관리.
// localStorage 작품별 = sunny.work.${workId}.cast

import { useEffect, useMemo, useState } from "react";

export type CastKind = "character" | "place" | "item" | "world";

export interface CastEntry {
  id: string;
  kind: CastKind;
  name: string;
  role?: string;       // 캐릭터 = 역할 / 장소 = 분류 / 아이템 = 분류 / 세계관 = 카테고리
  relation?: string;   // 관계 (캐릭터 only)
  desc?: string;       // 자유 설명 (~200자)
  tags?: string[];     // 자유 태그
}

interface CastNotesProps {
  /** 작품 ID (= localStorage 키 구성) */
  workId: string;
  /** 모달 닫기 */
  onClose: () => void;
}

const KIND_META: Record<CastKind, { label: string; icon: string; color: string }> = {
  character: { label: "인물",   icon: "👤", color: "#ff6b53" },
  place:     { label: "장소",   icon: "📍", color: "#3b82f6" },
  item:      { label: "아이템", icon: "🎁", color: "#10b981" },
  world:     { label: "세계관", icon: "🌐", color: "#a855f7" },
};

function storageKey(workId: string): string {
  return `sunny.work.${workId}.cast`;
}

const VALID_KINDS: ReadonlySet<CastKind> = new Set(["character", "place", "item", "world"]);

function loadCast(workId: string): CastEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(workId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 스키마 검증 (= localStorage tampering 방지)
    return parsed.filter((e: unknown): e is CastEntry => {
      if (!e || typeof e !== "object") return false;
      const r = e as Record<string, unknown>;
      return typeof r.id === "string"
        && typeof r.kind === "string"
        && VALID_KINDS.has(r.kind as CastKind)
        && typeof r.name === "string";
    });
  } catch { return []; }
}

function saveCast(workId: string, entries: CastEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(workId), JSON.stringify(entries));
  } catch { /* localStorage full */ }
}

export function CastNotes({ workId, onClose }: CastNotesProps) {
  const [entries, setEntries] = useState<CastEntry[]>(() => loadCast(workId));
  const [activeKind, setActiveKind] = useState<CastKind>("character");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState("");
  const [draftRelation, setDraftRelation] = useState("");
  const [draftDesc, setDraftDesc] = useState("");

  // workId 변경 = 로드 다시
  useEffect(() => {
    setEntries(loadCast(workId));
  }, [workId]);

  // 변경 시 저장
  useEffect(() => {
    saveCast(workId, entries);
  }, [workId, entries]);

  // ESC = 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editingId) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, editingId]);

  const filtered = useMemo(
    () => entries.filter(e => e.kind === activeKind),
    [entries, activeKind],
  );

  // draft 필드만 초기화 (editingId는 호출 측에서 명시 — 책임 분리)
  const clearDraftFields = () => {
    setDraftName("");
    setDraftRole("");
    setDraftRelation("");
    setDraftDesc("");
  };
  const resetDraft = () => {
    clearDraftFields();
    setEditingId(null);
  };

  const startEdit = (entry: CastEntry) => {
    setEditingId(entry.id);
    setDraftName(entry.name);
    setDraftRole(entry.role || "");
    setDraftRelation(entry.relation || "");
    setDraftDesc(entry.desc || "");
  };

  const startNew = () => {
    clearDraftFields();
    setEditingId("__new__");
  };

  const saveDraft = () => {
    if (!draftName.trim()) return;
    if (editingId === "__new__") {
      const newEntry: CastEntry = {
        id: `cast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: activeKind,
        name: draftName.trim(),
        role: draftRole.trim() || undefined,
        relation: draftRelation.trim() || undefined,
        desc: draftDesc.trim() || undefined,
      };
      setEntries(prev => [...prev, newEntry]);
    } else if (editingId) {
      setEntries(prev => prev.map(e =>
        e.id === editingId
          ? { ...e, name: draftName.trim(), role: draftRole.trim() || undefined, relation: draftRelation.trim() || undefined, desc: draftDesc.trim() || undefined }
          : e
      ));
    }
    resetDraft();
  };

  const deleteEntry = (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div
      role="dialog"
      aria-label="인물·설정 노트"
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        width: 440,
        maxWidth: "100vw",
        zIndex: 9998,
        background: "var(--card, #fff)",
        borderLeft: "1px solid var(--line, #e5e5e5)",
        boxShadow: "-6px 0 24px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 헤더 */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line, #eee)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>📓 인물·설정 노트</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: "var(--ink-2, #777)" }}
        >
          ×
        </button>
      </div>

      {/* 종류 탭 */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line, #eee)" }}>
        {(Object.keys(KIND_META) as CastKind[]).map(kind => {
          const m = KIND_META[kind];
          const count = entries.filter(e => e.kind === kind).length;
          const active = activeKind === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => { setActiveKind(kind); resetDraft(); }}
              style={{
                flex: 1,
                padding: "10px 6px",
                border: "none",
                background: active ? "var(--card-soft, #fafafa)" : "transparent",
                borderBottom: active ? `2px solid ${m.color}` : "2px solid transparent",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? m.color : "var(--ink-2, #555)",
                fontFamily: "inherit",
              }}
            >
              {m.icon} {m.label} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* 본문 = 리스트 + 편집 폼 */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
        {/* 새로 추가 버튼 */}
        {editingId === null && (
          <button
            type="button"
            onClick={startNew}
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: 10,
              border: "1px dashed var(--line, #ccc)",
              borderRadius: 8,
              background: "transparent",
              color: "var(--ink-2, #555)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + {KIND_META[activeKind].label} 추가
          </button>
        )}

        {/* 편집 폼 */}
        {editingId && (
          <div style={{ padding: 12, border: "1px solid var(--coral-line, #ffd6cf)", borderRadius: 8, background: "var(--coral-tint, #fff5f3)", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--coral, #ff6b53)", fontWeight: 600, marginBottom: 6 }}>
              {editingId === "__new__" ? "새로 추가" : "수정"}
            </div>
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder={`${KIND_META[activeKind].label} 이름 (필수)`}
              style={inputStyle()}
            />
            <input
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value)}
              placeholder={activeKind === "character" ? "역할 (예: 주인공·악역)" : activeKind === "place" ? "분류 (예: 도시·실내)" : activeKind === "item" ? "분류 (예: 무기·열쇠)" : "카테고리 (예: 마법체계)"}
              style={inputStyle()}
            />
            {activeKind === "character" && (
              <input
                value={draftRelation}
                onChange={(e) => setDraftRelation(e.target.value)}
                placeholder="관계 (예: 주인공의 여동생)"
                style={inputStyle()}
              />
            )}
            <textarea
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="자유 설명 (외모·성격·배경·기능 등)"
              rows={4}
              style={{ ...inputStyle(), resize: "vertical", minHeight: 80, fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
              <button type="button" onClick={resetDraft} style={btnSecondary()}>취소</button>
              <button type="button" onClick={saveDraft} disabled={!draftName.trim()} style={btnPrimary(!draftName.trim())}>저장</button>
            </div>
          </div>
        )}

        {/* 카드 리스트 */}
        {filtered.length === 0 && editingId === null && (
          <div style={{ textAlign: "center", color: "var(--ink-3, #999)", fontSize: 12, padding: 30 }}>
            아직 등록된 {KIND_META[activeKind].label}이 없습니다.<br />
            위 버튼으로 추가하세요.
          </div>
        )}
        {filtered.map(entry => (
          <div
            key={entry.id}
            style={{
              padding: 10,
              border: "1px solid var(--line, #eee)",
              borderRadius: 8,
              marginBottom: 8,
              background: "var(--card, #fff)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.name}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => startEdit(entry)} style={iconBtn()} title="수정">✎</button>
                <button type="button" onClick={() => deleteEntry(entry.id)} style={iconBtn()} title="삭제">🗑</button>
              </div>
            </div>
            {entry.role && <div style={{ fontSize: 11, color: KIND_META[entry.kind].color, marginBottom: 2 }}>{entry.role}</div>}
            {entry.relation && <div style={{ fontSize: 11, color: "var(--ink-2, #555)", marginBottom: 2 }}>{entry.relation}</div>}
            {entry.desc && <div style={{ fontSize: 12, color: "var(--ink, #222)", whiteSpace: "pre-wrap", marginTop: 4 }}>{entry.desc}</div>}
          </div>
        ))}
      </div>

      <div style={{ padding: "8px 14px", borderTop: "1px solid var(--line, #eee)", fontSize: 10, color: "var(--ink-3, #999)" }}>
        작품별 자동 저장 · localStorage 영구 보존 · ESC 닫기
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid var(--line, #d4d4d4)",
    borderRadius: 6,
    fontSize: 12,
    marginBottom: 6,
    background: "var(--card, #fff)",
    fontFamily: "inherit",
  };
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "5px 12px",
    border: "none",
    borderRadius: 6,
    background: disabled ? "var(--card-soft, #f5f5f5)" : "var(--coral, #ff6b53)",
    color: disabled ? "var(--ink-3, #aaa)" : "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}

function btnSecondary(): React.CSSProperties {
  return {
    padding: "5px 12px",
    border: "1px solid var(--line, #ccc)",
    borderRadius: 6,
    background: "var(--card, #fff)",
    color: "var(--ink-2, #555)",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function iconBtn(): React.CSSProperties {
  return {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 4,
    fontSize: 14,
    color: "var(--ink-2, #777)",
    lineHeight: 1,
  };
}

export default CastNotes;
