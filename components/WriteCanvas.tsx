"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { KEY, loadJSON } from "@/lib/persist";
import { GENRES } from "@/lib/genres";
import { Markdown } from "@/components/Markdown";
import { LibraryPicker } from "@/components/LibraryPicker";

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
  notes?: string;  // AI 자가 검증·분석·다음 단계 (본문에서 마커로 분리됨, "💭 분석" 클릭 시 표시)
}

interface WriteCanvasProps {
  work: WorkInfo;
  paras: Para[];
  paused: boolean;
  onPauseToggle: () => void;
  onRewrite: (id: string) => void;
  onEdit?: (id: string, newText: string) => void;       // 작가 직접 수정 저장 (단락별)
  onEditAll?: (fullText: string) => void;                // ★ 본문 전체를 한 번에 수정
  onContinue?: (id: string) => void;                     // 이 단락 다음에 이어쓰기
  onImport?: (text: string) => void;                     // ★ V2.13.4 — 쓰던 원고(파일·붙여넣기)를 본문으로 가져옴
  onDownload?: (format: "docx" | "txt") => void;        // 본문 다운로드 (워드/텍스트)
  bookOpen: boolean;
  onBookToggle: () => void;
  notesCount: number;
  aiBusy?: boolean;                                      // ★ 외부 AI 호출 진행 중 여부 — 스탑 버튼 노출 통제
}

export function WriteCanvas({
  work, paras, paused, onPauseToggle, onRewrite, onEdit, onEditAll, onContinue, onImport, onDownload, bookOpen, onBookToggle, notesCount, aiBusy,
}: WriteCanvasProps) {
  const I = ICONS;
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 작품 변경 모달 — 사장님 명시: 작업실에서 다른 작품 불러오기
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  // ★ ImportPanel 노출 토글 — 빈 작업실에서는 자동 노출, 본문 있어도 헤더 버튼으로 다시 켤 수 있음.
  //   (옛엔 본문 비었을 때만 = 작가가 중간에 원고 추가 가져오기가 막혔던 사고)
  const [showImport, setShowImport] = useState<boolean>(() => paras.every(p => !p.text || !p.text.trim()));

  // ★ V2.14.5 — 데스크탑(Tauri) 환경 = 다운로드 폴더 바로 열기 버튼 노출
  //   (대표님 명시: 작가가 자기 작품 저장된 폴더를 폴더 클릭으로 바로 열 수 있게)
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  useEffect(() => {
    setIsTauriEnv(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window);
  }, []);

  const openDownloadsFolder = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      const { downloadDir } = await import("@tauri-apps/api/path");
      const dir = await downloadDir();
      await open(dir);
    } catch (err) {
      alert(`폴더 열기 실패. 데스크탑 앱에서만 동작합니다. (${err instanceof Error ? err.message : String(err)})`);
    }
  };

  // 새 빈 작품 시작 (현재 작업실에서 = 새 작품으로 전환)
  const startNewBlank = () => {
    const blankIdea = `새 작품 ${new Date().toLocaleDateString("ko-KR")}`;
    // ★ 매체 = 홈에서 고른 매체(homeMediumOverride) 우선. 옛엔 "A" 하드코딩 = 웹툰 작가도 TV드라마로 시작되던 버그.
    const homeOverride = loadJSON<string | null>(KEY.homeMediumOverride, null);
    const adminMedium = loadJSON<string | null>(KEY.adminPrimaryMedium, null);
    const params = new URLSearchParams({
      mode: "new",
      idea: blankIdea,
      genre: homeOverride || adminMedium || "A",
      fast: "1",
      blank: "1",
    });
    router.push(`/write?${params.toString()}`);
    router.refresh();
  };

  // 빈 작업실에서 매체(장르) 직접 변경 — 본문이 비었을 때만 노출. 고른 매체로 새 빈 작업실.
  const switchMedium = (letter: string) => {
    if (!letter) return;
    const blankIdea = `새 작품 ${new Date().toLocaleDateString("ko-KR")}`;
    try { window.localStorage.setItem(KEY.homeMediumOverride, JSON.stringify(letter)); } catch { /* ignore */ }
    const params = new URLSearchParams({ mode: "new", idea: blankIdea, genre: letter, fast: "1", blank: "1" });
    router.push(`/write?${params.toString()}`);
    router.refresh();
  };

  // ★ 전체 수정 모드 — 본문 전체를 한 textarea에서 통째로 편집
  const [editingAll, setEditingAll] = useState(false);
  const [draftAll, setDraftAll] = useState("");

  const startEditAll = () => {
    const fullText = paras
      .filter(p => p.text && p.text.trim())
      .map(p => p.text)
      .join("\n\n");
    setDraftAll(fullText);
    setEditingAll(true);
  };
  const saveEditAll = () => {
    if (onEditAll) onEditAll(draftAll);
    setEditingAll(false);
  };
  const cancelEditAll = () => {
    setEditingAll(false);
  };

  // 새 글자가 써질 때 자동 스크롤 — wcanvas-body 컨테이너 내부 scroll 강제
  useEffect(() => {
    const streaming = paras.find(p => p.status === "streaming");
    if (!streaming) return;
    const container = containerRef.current;
    if (!container) return;
    // 컨테이너 자체를 맨 아래로 (sticky bottom)
    container.scrollTop = container.scrollHeight;
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
            {paras.every(p => !p.text || !p.text.trim()) ? (
              <select
                value={(work.medium || "").trim().charAt(0)}
                onChange={(e) => switchMedium(e.target.value)}
                title="빈 작업실 — 매체를 바꿀 수 있습니다"
                style={{
                  fontSize: 12, fontFamily: "inherit", color: "var(--ink-2)",
                  background: "var(--card-soft)", border: "1px solid var(--line)",
                  borderRadius: 6, padding: "2px 6px", cursor: "pointer",
                }}
              >
                {GENRES.map(g => (
                  <option key={g.letter} value={g.letter}>{g.letter}. {g.name}</option>
                ))}
              </select>
            ) : (
              <span>{work.medium}</span>
            )}
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
          {(isStreaming || aiBusy) && (
            <button
              type="button"
              className={"wcanvas-pause" + (paused ? " is-paused" : "")}
              onClick={onPauseToggle}
              title="AI 즉시 중지"
              style={{
                background: "var(--coral)",
                color: "#fff",
                border: "1px solid var(--coral)",
                fontWeight: 700,
              }}
            >
              🛑 중지
            </button>
          )}
          {doneCount > 0 && !isStreaming && !editingAll && (
            <>
              <button
                type="button"
                className="wcanvas-book-toggle"
                onClick={async () => {
                  const fullText = paras
                    .filter(p => p.text && p.text.trim())
                    .map(p => p.text)
                    .join("\n\n");
                  if (!fullText) return;
                  try {
                    await navigator.clipboard.writeText(fullText);
                    const btn = document.activeElement as HTMLElement | null;
                    if (btn) {
                      const orig = btn.querySelector("span:last-child");
                      const before = orig?.textContent || "";
                      if (orig) orig.textContent = "✓ 복사됨";
                      setTimeout(() => { if (orig) orig.textContent = before; }, 1200);
                    }
                  } catch { /* ignore */ }
                }}
                title="본문 전체 복사"
              >
                <span className="wcanvas-book-toggle-icon">📋</span>
                <span>전체 카피</span>
              </button>
              {onEditAll && (
                <button
                  type="button"
                  className="wcanvas-book-toggle"
                  onClick={startEditAll}
                  title="본문 전체를 한 번에 수정"
                >
                  <span className="wcanvas-book-toggle-icon">✎</span>
                  <span>전체 수정</span>
                </button>
              )}
            </>
          )}
          {onDownload && doneCount > 0 && (
            <>
              <button
                type="button"
                className="wcanvas-book-toggle"
                onClick={() => onDownload("docx")}
                title="본문을 워드(.docx)로 다운로드"
              >
                <span className="wcanvas-book-toggle-icon">{I.download}</span>
                <span>워드</span>
              </button>
              <button
                type="button"
                className="wcanvas-book-toggle"
                onClick={() => onDownload("txt")}
                title="본문을 텍스트(.txt)로 다운로드"
              >
                <span className="wcanvas-book-toggle-icon">{I.download}</span>
                <span>TXT</span>
              </button>
              {/* ★ V2.13.4 — 프린트 (작가들이 프린트해 많이 읽음). @media print가 본문만 출력. */}
              <button
                type="button"
                className="wcanvas-book-toggle"
                onClick={() => window.print()}
                title="본문 프린트 / PDF로 저장"
              >
                <span className="wcanvas-book-toggle-icon">🖨</span>
                <span>프린트</span>
              </button>
              {/* ★ V2.14.5 — 데스크탑 작가만: 워드/TXT 받은 다운로드 폴더 바로 열기 */}
              {isTauriEnv && (
                <button
                  type="button"
                  className="wcanvas-book-toggle"
                  onClick={openDownloadsFolder}
                  title="작품 파일(워드·TXT)이 저장된 다운로드 폴더를 엽니다"
                >
                  <span className="wcanvas-book-toggle-icon">📂</span>
                  <span>폴더 열기</span>
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="wcanvas-book-toggle"
            onClick={() => setShowProjectPicker(true)}
            title="다른 작품으로 변경"
            style={{ background: "transparent", border: "1px solid var(--line)" }}
          >
            <span className="wcanvas-book-toggle-icon">📁</span>
            <span>작품 변경</span>
          </button>
          <button
            type="button"
            className="wcanvas-book-toggle"
            onClick={startNewBlank}
            title="새 빈 작품 시작"
            style={{ background: "transparent", border: "1px solid var(--line)" }}
          >
            <span className="wcanvas-book-toggle-icon">+</span>
            <span>새 작품</span>
          </button>
          {onImport && (
            <button
              type="button"
              className="wcanvas-book-toggle"
              onClick={() => setShowImport(s => !s)}
              title="기존 원고 가져오기 (워드·PDF·텍스트·붙여넣기)"
              style={{ background: showImport ? "rgba(255,107,107,0.08)" : "transparent", border: `1px solid ${showImport ? "var(--coral)" : "var(--line)"}` }}
            >
              <span className="wcanvas-book-toggle-icon">📥</span>
              <span>원고 가져오기</span>
            </button>
          )}
          {!bookOpen && (
            <button
              type="button"
              className="wcanvas-book-toggle"
              onClick={onBookToggle}
              title="작가 노트 · AI 흐름 · 대화 열기"
            >
              <span className="wcanvas-book-toggle-icon">{I.book || I.write}</span>
              <span>작가노트</span>
              {notesCount ? <span className="wcanvas-book-toggle-badge">{notesCount}</span> : null}
            </button>
          )}
        </div>
      </header>

      {/* 본문 — 원고지 (스크롤 강제: CSS .wcanvas-body가 안 통할 환경 대비 inline 백업) */}
      <div
        className="wcanvas-body"
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
          scrollBehavior: "smooth",
        }}
      >
        <div className="wcanvas-page">
          {editingAll ? (
            // ★ 전체 수정 모드 — 본문 통째로 textarea
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 0" }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                본문 전체를 통째로 수정합니다. 단락 사이는 빈 줄(2번 엔터)로 구분 — 저장 시 자동으로 단락 분리됩니다.
              </div>
              <textarea
                value={draftAll}
                onChange={(e) => setDraftAll(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  minHeight: "60vh",
                  padding: "16px 18px",
                  fontSize: 14,
                  lineHeight: 1.75,
                  fontFamily: "var(--font-display)",
                  color: "var(--ink-1)",
                  background: "var(--bg)",
                  border: "1px solid var(--coral)",
                  borderRadius: 12,
                  resize: "vertical",
                  whiteSpace: "pre-wrap",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={saveEditAll}
                  style={{
                    padding: "10px 18px", fontSize: 13, fontWeight: 700,
                    background: "var(--coral)", color: "#fff",
                    border: "1px solid var(--coral)", borderRadius: 10,
                    cursor: "pointer",
                  }}
                >✓ 전체 저장</button>
                <button
                  type="button"
                  onClick={cancelEditAll}
                  style={{
                    padding: "10px 18px", fontSize: 13,
                    background: "transparent", color: "var(--ink-3)",
                    border: "1px solid var(--line)", borderRadius: 10,
                    cursor: "pointer",
                  }}
                >취소</button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(draftAll);
                      alert("✓ 전체 본문 복사됨");
                    } catch { /* ignore */ }
                  }}
                  style={{
                    padding: "10px 18px", fontSize: 13,
                    background: "transparent", color: "var(--coral-deep)",
                    border: "1px solid var(--coral)", borderRadius: 10,
                    cursor: "pointer",
                    marginLeft: "auto",
                  }}
                >📋 전체 카피</button>
              </div>
            </div>
          ) : (
            <>
              {/* ★ V2.14 — 헤더 [📥 원고 가져오기] 토글로 노출. 빈 작업실은 자동 노출(state initial), 본문 있어도 헤더 버튼으로 다시 켜기 가능. */}
              {onImport && showImport && (
                <ImportPanel onImport={(text) => { onImport(text); setShowImport(false); }} hasContent={paras.some(p => p.text && p.text.trim())} />
              )}
              {paras.map((p, i) => (
                <Paragraph
                  key={p.id}
                  p={p}
                  i={i}
                  onRewrite={() => onRewrite(p.id)}
                  onEdit={onEdit ? (newText) => onEdit(p.id, newText) : undefined}
                  onContinue={onContinue ? () => onContinue(p.id) : undefined}
                  paused={paused}
                />
              ))}

              {paras.every(p => p.status !== "streaming") &&
               paras.every(p => p.status !== "pending") &&
               paras.length > 0 && (
                <div className="wcanvas-end">
                  <span>초고 완료 · 다음 단계로 넘어가시겠어요?</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 작품 변경 모달 — 사장님 명시: 작업실에서 다른 작품 불러오기 */}
      <LibraryPicker
        open={showProjectPicker}
        onClose={() => setShowProjectPicker(false)}
        title="작업할 작품 선택"
        subtitle="다른 작품으로 즉시 전환합니다. 현재 작품은 자동 저장됨."
        onPick={(work) => {
          router.push(`/write?mode=continue&project=${encodeURIComponent(String(work.id))}`);
          // mode=continue 진입 시 = 그 작품 자동 복원
          setTimeout(() => router.refresh(), 50);
        }}
      />
    </section>
  );
}

// ★ V2.13.4 — 빈 작업실에서 쓰던 원고를 가져오는 패널 (파일 업로드 / 붙여넣기).
//   작가는 백지에서 시작하지 X — 이미 쓰던 원고를 Write로 바로 가져와 이어쓰기.
function ImportPanel({ onImport, hasContent }: { onImport: (text: string) => void; hasContent?: boolean }) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) {
        setErr(json.error || "업로드 실패");
        return;
      }
      setText(prev => (prev ? prev + "\n\n" : "") + (json.text || ""));
    } catch {
      setErr("파일을 읽지 못했습니다. 본문을 붙여넣기로 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      margin: "24px 0", padding: "20px 22px",
      border: "1px dashed var(--coral)", borderRadius: 14,
      background: "var(--card-soft)",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)" }}>
        쓰던 원고가 있으세요?
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
        이미 쓴 원고를 가져와 이어쓸 수 있습니다. 파일을 올리거나 본문을 붙여넣으세요.
      </div>
      {hasContent && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(255, 180, 162, 0.18)",
          border: "1px solid rgba(255, 107, 83, 0.4)",
          borderRadius: 8, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55,
        }}>
          ⚠ <strong>현재 본문이 가져온 원고로 교체됩니다.</strong> 이어쓰기는 가능하지만, 기존 본문을 보존하려면 가져오기 전에 <strong>워드/TXT로 다운로드</strong>하세요.
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".docx,.doc,.pdf,.txt"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
            background: "transparent", color: "var(--coral-deep)",
            border: "1px solid var(--coral)", borderRadius: 8,
            cursor: uploading ? "wait" : "pointer",
          }}
        >
          {uploading ? "읽는 중…" : "📄 파일 가져오기 (Word·PDF·TXT)"}
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="또는 원고를 여기에 붙여넣으세요…"
        style={{
          width: "100%", minHeight: 140, padding: "12px 14px",
          fontSize: 13, lineHeight: 1.7, fontFamily: "var(--font-display)",
          border: "1px solid var(--line)", borderRadius: 10,
          resize: "vertical", whiteSpace: "pre-wrap",
        }}
      />
      {err && (
        <div style={{ fontSize: 12, color: "var(--coral-deep)" }}>⚠ {err}</div>
      )}
      <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
        {text.trim()
          ? `${text.trim().length.toLocaleString()}자 — 단락은 빈 줄로 자동 분리됩니다.`
          : "원고 없이 그냥 처음부터 써도 됩니다."}
      </div>
      <button
        type="button"
        disabled={!text.trim()}
        onClick={() => onImport(text.trim())}
        style={{
          alignSelf: "flex-start",
          padding: "9px 18px", fontSize: 13, fontWeight: 700,
          background: text.trim() ? "var(--coral)" : "var(--card-soft)",
          color: text.trim() ? "#fff" : "var(--ink-4)",
          border: `1px solid ${text.trim() ? "var(--coral)" : "var(--line)"}`,
          borderRadius: 10, cursor: text.trim() ? "pointer" : "not-allowed",
        }}
      >
        이 원고로 집필 시작 →
      </button>
    </div>
  );
}

function Paragraph({ p, paused, onRewrite, onEdit, onContinue }: {
  p: Para;
  i: number;
  onRewrite: () => void;
  onEdit?: (newText: string) => void;
  onContinue?: () => void;
  paused: boolean;
}) {
  const isStreaming = p.status === "streaming";
  const isDone = p.status === "done";
  const isPending = p.status === "pending";

  // 인라인 직접 편집 모드
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.text);

  const startEdit = () => {
    setDraft(p.text);
    setEditing(true);
  };
  const saveEdit = () => {
    if (onEdit) onEdit(draft);
    setEditing(false);
  };
  const cancelEdit = () => {
    setDraft(p.text);
    setEditing(false);
  };

  // ★ 한국 시나리오 자동 형식 감지 (2026-05-14 대표님 명시 사고 정정):
  //   - "S#1.", "씬 1.", "INT.", "EXT." = scene heading = 라벨 X + 굵게
  //   - 따옴표 "..." 또는 캐릭터: 대사 형태 = 대사 = 라벨 "대사"
  //   - 그 외 = 지문 (액션·묘사)
  const trimmedText = (p.text || "").trim();
  const isSceneHeading = /^(S#\s*\d+|씬\s*\d+|INT[\.\s]|EXT[\.\s]|장면\s*\d+|자막[\.\s])/i.test(trimmedText);
  const looksLikeDialogue = /^["「『][^"」』]+["」』]\s*$/.test(trimmedText)
    || /^[가-힣A-Za-z]{1,12}\s*:\s*/.test(trimmedText)
    || /^[가-힣A-Za-z]{1,12}\s*\(.*\)\s*\n/.test(trimmedText);
  const autoLabel = isSceneHeading ? "씬" : looksLikeDialogue ? "대사" : (p.label || "지문");

  return (
    <div
      className={"wpara is-" + p.status + (paused && isStreaming ? " is-paused" : "") + (isSceneHeading ? " is-heading" : "")}
      data-para-id={p.id}
    >
      <div className="wpara-gutter">
        <span className="wpara-num">{String(p.n).padStart(2, "0")}</span>
        <span className="wpara-label">{autoLabel}</span>
      </div>

      <div className="wpara-body">
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              placeholder="여기에 직접 쓰세요…"
              style={{
                width: "100%",
                minHeight: 200,
                padding: "12px 14px",
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: "var(--font-display)",
                color: "var(--ink-1)",
                background: "var(--bg)",
                border: "1px solid var(--coral)",
                borderRadius: 10,
                resize: "vertical",
                whiteSpace: "pre-wrap",
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="wpara-action" onClick={saveEdit} title="저장">
                <span className="wpara-action-icon">✓</span>
                <span>저장</span>
              </button>
              <button type="button" className="wpara-action" onClick={cancelEdit} title="취소">
                <span className="wpara-action-icon">✕</span>
                <span>취소</span>
              </button>
            </div>
          </div>
        ) : isPending ? (
          // ★ 빈 단락 = 작가가 직접 쓸 수 있음 (옛엔 "대기 중"만 = AI만 채울 수 있었음)
          <div className="wpara-pending">
            <span className="wpara-pending-dot"></span>
            <span>{onEdit ? "여기부터 직접 쓰거나, 우측 채팅에서 AI에게 맡기세요" : "대기 중"}</span>
            {onEdit && (
              <button
                type="button"
                className="wpara-action"
                onClick={startEdit}
                title="이 단락을 작가가 직접 씁니다"
                style={{ marginLeft: 10 }}
              >
                <span className="wpara-action-icon">✍️</span>
                <span>직접 쓰기</span>
              </button>
            )}
          </div>
        ) : (
          <div className="wpara-text">
            <Markdown text={p.text} />
            {isStreaming && (
              <span className={"wpara-cursor" + (paused ? " is-paused" : "")}></span>
            )}
          </div>
        )}

        {isDone && !editing && (
          <div className="wpara-actions">
            <button type="button" className="wpara-action" onClick={onRewrite} title="이 단락 다시 쓰기">
              <span className="wpara-action-icon">↻</span>
              <span>다시 써</span>
            </button>
            <button type="button" className="wpara-action" onClick={startEdit} title="직접 수정">
              <span className="wpara-action-icon">✎</span>
              <span>수정</span>
            </button>
            <button
              type="button"
              className="wpara-action"
              onClick={async (e) => {
                if (!p.text) return;
                try {
                  await navigator.clipboard.writeText(p.text);
                  const btn = e.currentTarget;
                  const span = btn.querySelector("span:last-child");
                  if (span) {
                    const before = span.textContent;
                    span.textContent = "✓ 복사됨";
                    setTimeout(() => { span.textContent = before; }, 1200);
                  }
                } catch { /* ignore */ }
              }}
              title="이 단락 텍스트 복사"
            >
              <span className="wpara-action-icon">📋</span>
              <span>복사</span>
            </button>
            <button
              type="button"
              className="wpara-action"
              onClick={onContinue}
              disabled={!onContinue}
              title="이어서 더 쓰기 (다음 단락 추가)"
            >
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
