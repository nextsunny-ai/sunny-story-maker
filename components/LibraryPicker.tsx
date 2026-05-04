"use client";

import { useEffect, useState } from "react";
import { KEY, loadJSON } from "@/lib/persist";

// library/page.tsx의 LibraryWork와 동일 구조 (재선언 — 순환 import 방지)
export interface LibraryWorkRef {
  id: number | string;
  title: string;
  genre: string;
  letter: string;
  stage: string;
  prog: number;
  size: string;
  updated: string;
  next?: string;
}

interface PersistedProjectLite {
  paras?: { text?: string; label?: string }[];
}

interface LibraryPickerProps {
  open: boolean;
  onClose: () => void;
  /** 작품 선택 시 호출 — body는 KEY.writeProject에서 자동 read한 본문 (없으면 빈 문자열) */
  onPick: (work: LibraryWorkRef, body: string) => void;
  /** 매체 letter 필터 — 같은 매체 작품만 노출 (옵션) */
  filterLetter?: string;
  /** 모달 제목 */
  title?: string;
  /** 모달 부제 */
  subtitle?: string;
}

/**
 * 라이브러리 작품 선택 모달.
 * - KEY.libraryWorks에서 작품 목록 read
 * - 작품 클릭 시 KEY.writeProject(id)에서 본문 paras 자동 추출하여 onPick 콜백
 * - adapt / osmu / chat / package에서 공용
 */
export function LibraryPicker({
  open,
  onClose,
  onPick,
  filterLetter,
  title = "작품 선택",
  subtitle = "선택한 작품의 본문이 자동으로 들어옵니다.",
}: LibraryPickerProps) {
  const [works, setWorks] = useState<LibraryWorkRef[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setWorks(loadJSON<LibraryWorkRef[]>(KEY.libraryWorks, []));
      setSearch("");
    }
  }, [open]);

  if (!open) return null;

  const baseFiltered = filterLetter
    ? works.filter(w => w.letter === filterLetter)
    : works;

  const filtered = baseFiltered.filter(w => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      w.title.toLowerCase().includes(q) ||
      w.genre.toLowerCase().includes(q) ||
      w.letter.toLowerCase() === q
    );
  });

  const handlePick = (w: LibraryWorkRef) => {
    const proj = loadJSON<PersistedProjectLite | null>(
      KEY.writeProject(String(w.id)),
      null
    );
    const body = proj?.paras
      ? proj.paras
          .filter(p => p.text && p.text.trim())
          .map(p => p.text)
          .join("\n\n")
      : "";
    onPick(w, body);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(20, 22, 28, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg, #fff)", borderRadius: 16,
          maxWidth: 720, width: "100%", maxHeight: "85vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          border: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 11, letterSpacing: "0.18em",
              color: "var(--ink-4)", marginBottom: 4, fontWeight: 700,
            }}>
              LIBRARY
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink-1)" }}>
              {title}
              <span style={{ color: "var(--ink-4)", fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                · {baseFiltered.length}편
                {filterLetter ? ` (${filterLetter} 매체)` : ""}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.55 }}>
              {subtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              background: "transparent", border: "1px solid var(--line)",
              borderRadius: 8, padding: "8px 14px", cursor: "pointer",
              fontSize: 13, color: "var(--ink-2)",
            }}
          >
            닫기
          </button>
        </div>

        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--line)" }}>
          <input
            className="field-input"
            placeholder="작품명·매체 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 24px 24px",
        }}>
          {baseFiltered.length === 0 ? (
            <div style={{
              padding: "60px 20px", textAlign: "center",
              color: "var(--ink-3)", fontSize: 13, lineHeight: 1.75,
            }}>
              아직 등록된 작품이 없습니다.
              <br />
              <span style={{ fontSize: 11.5, color: "var(--ink-5)" }}>
                Write 페이지에서 작품을 작성하면 여기에 자동 등록됩니다.
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              padding: "40px 20px", textAlign: "center",
              color: "var(--ink-3)", fontSize: 13,
            }}>
              검색 결과가 없습니다.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(w => (
                <button
                  key={String(w.id)}
                  type="button"
                  onClick={() => handlePick(w)}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr auto",
                    gap: 16, padding: "14px 18px", alignItems: "center",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    background: "transparent",
                    border: "1px solid var(--line)", borderRadius: 12,
                    transition: "border-color 0.15s ease, background 0.15s ease",
                    font: "inherit", color: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--coral)";
                    e.currentTarget.style.background = "var(--card-soft)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--line)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: "var(--ink-1)", marginBottom: 4,
                      letterSpacing: "-0.01em",
                    }}>
                      {w.title}
                    </div>
                    <div style={{
                      fontSize: 12, color: "var(--ink-3)",
                      display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
                    }}>
                      <span>{w.letter}. {w.genre}</span>
                      <span style={{ color: "var(--ink-5)" }}>·</span>
                      <span>{w.size}</span>
                      <span style={{ color: "var(--ink-5)" }}>·</span>
                      <span style={{
                        padding: "1px 6px", borderRadius: 4,
                        background: "var(--card-soft)", fontSize: 11,
                        color: "var(--ink-2)",
                      }}>{w.stage}</span>
                      <span style={{ color: "var(--ink-5)", marginLeft: "auto" }}>{w.updated}</span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "var(--coral)",
                    whiteSpace: "nowrap", letterSpacing: "0.04em",
                  }}>
                    가져오기 →
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
