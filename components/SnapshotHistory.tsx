"use client";

// V3.1 — 작품 옛 버전 복원 UI (작가 안전망).
// Supabase work_snapshots에 5분마다 박힌 옛 본문을 = 작가가 보고·복원.
//
// 사용: write 페이지에서 [⏮ 옛 버전] 클릭 = 모달 열림

import { useEffect, useState } from "react";
import { listSnapshots, getSnapshot, type SnapshotRow } from "@/lib/storymaker/snapshots";

interface SnapshotHistoryProps {
  workId: string;
  open: boolean;
  onClose: () => void;
  onRestore: (body: string, notesText: string | null) => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const SOURCE_LABEL: Record<string, string> = {
  auto: "자동 (5분)",
  manual: "수동 저장",
  "ai-done": "AI 응답 완료",
  unload: "페이지 떠남",
};

export function SnapshotHistory({ workId, open, onClose, onRestore }: SnapshotHistoryProps) {
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SnapshotRow | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !workId) return;
    setLoading(true);
    listSnapshots(workId).then(s => {
      setSnapshots(s);
      setLoading(false);
    });
  }, [open, workId]);

  const handlePreview = async (s: SnapshotRow) => {
    setSelected(s);
    const full = await getSnapshot(s.id);
    setPreview(full?.body ?? null);
  };

  const handleRestore = () => {
    if (!preview || !selected) return;
    if (!confirm(`이 버전(${fmtTime(selected.created_at)})으로 본문을 복원할까요?\n\n현재 작업 중인 본문은 = 자동저장으로 또 다른 snapshot이 박힙니다 = 옛 거 그대로 안전.`)) {
      return;
    }
    onRestore(preview, selected.notes_text);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 99997,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        maxWidth: 880, width: "100%", maxHeight: "85vh",
        background: "var(--bg, #fff)",
        borderRadius: 14,
        display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--ink-1)" }}>
            ⏮ 작품 옛 버전 ({snapshots.length}개)
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", fontSize: 20, color: "var(--ink-4)" }}
          >×</button>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "grid", gridTemplateColumns: "320px 1fr", minHeight: 400 }}>
          {/* 리스트 */}
          <div style={{ borderRight: "1px solid var(--line)", overflow: "auto", background: "var(--card-soft)" }}>
            {loading && <div style={{ padding: 20, color: "var(--ink-4)", fontSize: 13 }}>옛 버전 불러오는 중…</div>}
            {!loading && snapshots.length === 0 && (
              <div style={{ padding: 24, color: "var(--ink-4)", fontSize: 13, textAlign: "center" }}>
                아직 옛 버전이 없습니다.<br />
                <span style={{ fontSize: 11, color: "var(--ink-5)" }}>5분마다 자동 박힙니다.</span>
              </div>
            )}
            {snapshots.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handlePreview(s)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "none",
                  background: selected?.id === s.id ? "var(--card)" : "transparent",
                  borderLeft: selected?.id === s.id ? "3px solid var(--coral)" : "3px solid transparent",
                  borderBottom: "1px solid var(--line)",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", gap: 4,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>
                  {fmtTime(s.created_at)}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                  {SOURCE_LABEL[s.source] || s.source} · {s.char_count.toLocaleString()}자 · {s.block_count}단락
                </div>
              </button>
            ))}
          </div>

          {/* 미리보기 */}
          <div style={{ overflow: "auto", padding: 24 }}>
            {!selected && (
              <div style={{ color: "var(--ink-4)", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                왼쪽에서 옛 버전을 클릭하시면 = 본문 미리보기가 여기에 표시됩니다.
              </div>
            )}
            {selected && preview === null && (
              <div style={{ color: "var(--ink-4)", fontSize: 13 }}>본문 불러오는 중…</div>
            )}
            {selected && preview !== null && (
              <>
                <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--card-soft)", border: "1px solid var(--coral)", borderRadius: 8, fontSize: 12, color: "var(--coral-deep, #c84738)" }}>
                  📅 {fmtTime(selected.created_at)} 시점 본문 · {SOURCE_LABEL[selected.source] || selected.source}
                </div>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14, lineHeight: 1.8,
                  color: "var(--ink-1)",
                  whiteSpace: "pre-wrap",
                  marginBottom: 20,
                  maxHeight: "55vh", overflowY: "auto",
                  padding: 12, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8,
                }}>
                  {preview || "(빈 본문)"}
                </div>
                <button
                  type="button"
                  onClick={handleRestore}
                  style={{
                    padding: "10px 22px",
                    background: "var(--coral, #ff6b53)", color: "#fff",
                    border: "none", borderRadius: 8,
                    fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  ⏮ 이 버전으로 복원
                </button>
                <span style={{ marginLeft: 12, fontSize: 12, color: "var(--ink-4)" }}>
                  복원해도 현재 작업 = 자동저장으로 함께 보관돼 = 안전합니다.
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
