"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Btn } from "@/components/ui";
import { KEY, usePersistedState } from "@/lib/persist";

/** ★ /api/works/list — _works/ 자동 스캔 응답 (사장님 명시 2026-05-04) */
interface ApiWorkInfo {
  workId: string;
  title: string;
  genre?: string;
  preview?: string;
  fileCount: number;
  updatedAt: number;
  size: number;
}

export default function LibraryPage() {
  return (
    <AppShell>
      <LibraryMain />
    </AppShell>
  );
}

interface LibraryWork {
  id: number | string;
  title: string;
  genre: string;
  letter: string;
  stage: string;
  prog: number;
  updated: string;
  size: string;
  source?: "cloud" | "local"; // ☁ 클라우드 / 💻 본 PC만 (2026-05-14)
}

interface LibraryPersona {
  id: number | string;
  name: string;
  tags: string[];
  used: number;
  // review 페이지 PersonaCard 호환 필드 (재사용 위해)
  likes?: string;
  dislikes?: string;
  lens?: string;
  age?: string;
  gender?: string;
  lifestyle?: string;
  preference?: string;
  consumption?: string;
}

function LibraryMain() {
  const router = useRouter();
  const I = ICONS;
  const open = (idOrTitle: string) =>
    router.push(`/write?mode=continue&project=${encodeURIComponent(idOrTitle)}`);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");

  const [worksLocal] = usePersistedState<LibraryWork[]>(KEY.libraryWorks, []);
  const [personas, setPersonas] = usePersistedState<LibraryPersona[]>(KEY.libraryPersonas, []);

  // ★ V3.1 — Tauri 데스크탑 = ~/Documents/StoryMaker/프로젝트/*.smkr listing
  const [smkrFiles, setSmkrFiles] = useState<Array<{ filename: string; fullPath: string; title: string; genreLetter: string; paraCount: number; noteCount: number; updatedAt: string; sizeKb: number }>>([]);
  const [smkrFolderPath, setSmkrFolderPath] = useState<string>("");
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  useEffect(() => {
    setIsTauriEnv(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window);
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      import("@/lib/storymaker/project-file").then(async ({ listProjectFolder }) => {
        const files = await listProjectFolder();
        setSmkrFiles(files);
        if (files[0]?.fullPath) {
          const idx = files[0].fullPath.lastIndexOf("\\") !== -1
            ? files[0].fullPath.lastIndexOf("\\")
            : files[0].fullPath.lastIndexOf("/");
          setSmkrFolderPath(files[0].fullPath.slice(0, idx));
        }
      });
    }
  }, []);

  const handleOpenSmkr = async (fullPath: string) => {
    const { loadSmkrFromPath } = await import("@/lib/storymaker/project-file");
    const res = await loadSmkrFromPath(fullPath);
    if (!res.ok) {
      alert(`파일 열기 실패: ${res.error}`);
      return;
    }
    // localStorage에 임시 저장 → write 페이지가 read
    try {
      window.localStorage.setItem("sunny.storymaker.openSmkr", JSON.stringify(res.file));
      router.push("/write?mode=continue&from=smkr");
    } catch (e) {
      alert(`파일 열기 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ★ Supabase works 테이블 + localStorage 통합 (사장님 명시 2026-05-04)
  const [apiWorks, setApiWorks] = useState<ApiWorkInfo[]>([]);
  const [worksDir, setWorksDir] = useState<string>("");
  const [apiLoading, setApiLoading] = useState(true);
  // ★ 클라우드 연결 상태 — 작가에게 "클라우드 OK / 로그인 끊김" 명확히 표시 (2026-05-14)
  const [cloudStatus, setCloudStatus] = useState<"loading" | "ok" | "unauthorized" | "error">("loading");
  const [cloudMsg, setCloudMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/works/list");
        if (cancelled) return;
        if (res.status === 401) {
          setCloudStatus("unauthorized");
          setCloudMsg("로그인 세션 끊김 — 클라우드 작품 안 보임. 다시 로그인하면 다른 PC 작업도 복원됨.");
          return;
        }
        if (!res.ok) {
          setCloudStatus("error");
          setCloudMsg(`클라우드 list 실패 (HTTP ${res.status}) — 본 PC 작품만 표시.`);
          return;
        }
        const data = await res.json() as { works: ApiWorkInfo[]; worksDir?: string };
        setApiWorks(data.works || []);
        setWorksDir(data.worksDir || "");
        setCloudStatus("ok");
      } catch (err) {
        if (cancelled) return;
        setCloudStatus("error");
        setCloudMsg(`네트워크 끊김 — 본 PC 작품만 표시. ${err instanceof Error ? err.message : ""}`);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ★ API 작품 + localStorage 작품 통합 (workId 기준 dedup) — source 표시 (2026-05-14)
  const works = useMemo<LibraryWork[]>(() => {
    const apiAsLib: LibraryWork[] = apiWorks.map(w => ({
      id: w.workId,
      title: w.title,
      genre: w.genre || "",
      letter: w.genre || "A",
      stage: w.fileCount >= 5 ? "집필 중" : w.fileCount >= 3 ? "트리트먼트" : "기획",
      prog: Math.min(1, w.fileCount / 6),
      updated: new Date(w.updatedAt).toLocaleDateString("ko-KR"),
      size: `${(w.size / 1024).toFixed(1)} KB · ${w.fileCount}개 .md`,
      source: "cloud" as const,
    }));
    const apiIds = new Set(apiAsLib.map(w => w.id));
    const localOnly: LibraryWork[] = worksLocal
      .filter(w => !apiIds.has(String(w.id)))
      .map(w => ({ ...w, source: "local" as const }));
    return [...apiAsLib, ...localOnly];
  }, [apiWorks, worksLocal]);

  // 새 페르소나 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState({
    name: "", tags: "", likes: "", dislikes: "", lens: "",
  });
  const resetDraft = () => setDraft({ name: "", tags: "", likes: "", dislikes: "", lens: "" });

  const savePersona = () => {
    const name = draft.name.trim();
    if (!name) {
      alert("리뷰어 이름을 입력해 주세요.");
      return;
    }
    const tags = draft.tags.split(",").map(t => t.trim()).filter(Boolean).slice(0, 5);
    const newPersona: LibraryPersona = {
      id: Date.now(),
      name,
      tags: tags.length > 0 ? tags : ["커스텀"],
      used: 0,
      likes: draft.likes.trim() || "(없음)",
      dislikes: draft.dislikes.trim() || "(없음)",
      lens: draft.lens.trim() || "자연스러운 평가 시각",
    };
    setPersonas(prev => [...prev, newPersona]);
    resetDraft();
    setShowAddForm(false);
  };

  const removePersona = (id: number | string) => {
    if (!confirm("이 페르소나를 삭제할까요?")) return;
    setPersonas(prev => prev.filter(p => p.id !== id));
  };

  const filters = useMemo(() => {
    const total = works.length;
    const wip = works.filter(w => w.stage === "집필 중" || w.stage === "트리트먼트" || w.stage === "리뷰 대기").length;
    const done = works.filter(w => w.stage === "완성").length;
    const draft = works.filter(w => w.stage === "기획").length;
    return [
      { id: "all", label: "전체", count: total },
      { id: "wip", label: "진행 중", count: wip },
      { id: "done", label: "완성", count: done },
      { id: "draft", label: "기획", count: draft },
    ];
  }, [works]);

  const filteredWorks = useMemo(() => {
    let rows = works;
    if (filter === "wip") rows = rows.filter(w => w.stage === "집필 중" || w.stage === "트리트먼트" || w.stage === "리뷰 대기");
    else if (filter === "done") rows = rows.filter(w => w.stage === "완성");
    else if (filter === "draft") rows = rows.filter(w => w.stage === "기획");
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(w =>
        w.title.toLowerCase().includes(q) ||
        w.genre.toLowerCase().includes(q) ||
        w.letter.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [works, filter, query]);

  return (
    <main className="main">
      <Topbar
        eyebrow="LIBRARY"
        title='라이브러리<span class="dot">.</span>'
        sub="모든 작업물과 리뷰어 페르소나를 한 곳에서. 검색하고 이어서 작업하세요."
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Btn icon={I.plus} kind="coral" onClick={() => router.push("/")}>새 작품</Btn>
          </div>
        }
      />

      <div className="lib-toolbar">
        <div className="lib-filter">
          {filters.map(f => (
            <button
              key={f.id}
              className="lib-filter-pill"
              data-active={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="lib-filter-count">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="lib-toolbar-right">
          <div className="lib-search">
            {I.review}
            <input
              placeholder="작품명·매체·장르 검색"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="lib-view-toggle">
            <button data-active={view === "grid"} onClick={() => setView("grid")} title="그리드">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>
            </button>
            <button data-active={view === "list"} onClick={() => setView("list")} title="리스트">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ★ V3.1 — Tauri 데스크탑: 프로젝트 폴더 .smkr 파일 listing (= 작가 라이브러리) */}
      {isTauriEnv && smkrFiles.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <SectionHead num={1} title="📁 프로젝트 파일" sub={`${smkrFiles.length}개 · ${smkrFolderPath || "~/Documents/StoryMaker/프로젝트"}`} />
          <div className="lib-grid" style={{ marginTop: 16 }}>
            {smkrFiles.map(f => (
              <button
                key={f.fullPath}
                type="button"
                onClick={() => handleOpenSmkr(f.fullPath)}
                style={{
                  textAlign: "left",
                  padding: "16px 18px",
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", gap: 6,
                  transition: "border-color 0.15s, transform 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--coral)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--coral)", fontWeight: 700, letterSpacing: "0.04em" }}>
                  <span>📁 {f.genreLetter}.</span>
                  <span style={{ color: "var(--ink-4)" }}>.smkr</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.4 }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>{f.paraCount}단락</span>
                  <span>·</span>
                  <span>{f.noteCount}노트</span>
                  <span>·</span>
                  <span>{f.sizeKb}KB</span>
                </div>
                {f.updatedAt && (
                  <div style={{ fontSize: 10.5, color: "var(--ink-5)" }}>
                    {new Date(f.updatedAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-5)" }}>
            💡 작가가 [💾 프로젝트] 누르면 = 이 폴더에 저장됩니다.
          </div>
        </section>
      )}

      <SectionHead num={isTauriEnv && smkrFiles.length > 0 ? 2 : 1} title="작품" sub={`${works.length}편`} />

      {/* ★ 클라우드 연결 상태 — 작가가 "보이는 작품이 다인가?" 헷갈리지 않게 (2026-05-14) */}
      {!apiLoading && cloudStatus !== "ok" && (
        <div
          role="status"
          style={{
            margin: "12px 0",
            padding: "10px 14px",
            background: cloudStatus === "unauthorized" ? "rgba(255, 165, 0, 0.12)" : "rgba(255, 90, 90, 0.10)",
            border: `1px solid ${cloudStatus === "unauthorized" ? "rgba(255, 165, 0, 0.4)" : "rgba(255, 90, 90, 0.4)"}`,
            borderRadius: 8,
            fontSize: 12.5,
            lineHeight: 1.6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>
            <strong style={{ color: cloudStatus === "unauthorized" ? "#cc7a00" : "#cc3333" }}>
              {cloudStatus === "unauthorized" ? "⚠ 클라우드 연결 끊김" : "⚠ 클라우드 list 실패"}
            </strong>
            <span style={{ marginLeft: 8, color: "var(--ink-3)" }}>— {cloudMsg}</span>
          </span>
          {cloudStatus === "unauthorized" && (
            <a
              href="/login?redirect=/library"
              style={{
                padding: "5px 12px",
                background: "var(--coral)",
                color: "#fff",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              다시 로그인 →
            </a>
          )}
        </div>
      )}
      {!apiLoading && cloudStatus === "ok" && works.length > 0 && (
        <div style={{
          margin: "8px 0 4px", fontSize: 11.5, color: "var(--ink-4)",
          display: "flex", gap: 12, alignItems: "center",
        }}>
          <span>☁ 클라우드 = {works.filter(w => w.source === "cloud").length}편</span>
          <span>💻 본 PC만 = {works.filter(w => w.source === "local").length}편</span>
        </div>
      )}

      {filteredWorks.length === 0 ? (
        <div style={{
          padding: "60px 24px", textAlign: "center", color: "var(--ink-3)",
          border: "1px dashed var(--line)", borderRadius: 14, background: "var(--card-soft)",
          fontSize: 14, lineHeight: 1.7,
        }}>
          아직 작품이 없습니다.
          <br />
          <button
            onClick={() => router.push("/")}
            style={{
              marginTop: 14, padding: "10px 20px", background: "var(--coral)",
              color: "#fff", border: 0, borderRadius: 10, cursor: "pointer",
              fontSize: 13, fontWeight: 600,
            }}
          >
            새 작품 시작하기
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="lib-grid">
          {filteredWorks.map(w => (
            <div key={w.id} className="lib-card" onClick={() => open(String(w.id ?? w.title))}>
              <div className="lib-card-top">
                <div className="lib-card-icon">{I[w.letter]}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span
                    title={w.source === "cloud" ? "클라우드 = 다른 PC에서도 보임" : "본 PC만 = 클라우드 미저장"}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: w.source === "cloud" ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 165, 0, 0.12)",
                      color: w.source === "cloud" ? "#0a8a5e" : "#cc7a00",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {w.source === "cloud" ? "☁" : "💻"}
                  </span>
                  <div className="lib-card-stage" data-stage={w.stage === "완성" ? "done" : w.stage === "리뷰 대기" ? "review" : ""}>
                    {w.stage}
                  </div>
                </div>
              </div>
              <div className="lib-card-title">{w.title}</div>
              <div className="lib-card-meta">{w.genre} · {w.size}</div>
              <div className="lib-card-prog">
                <div className="lib-card-prog-bar">
                  <div className="lib-card-prog-fill" style={{ width: (w.prog * 100) + "%" }}></div>
                </div>
                <span>{Math.round(w.prog * 100)}%</span>
              </div>
              <div className="lib-card-foot">
                <span className="lib-card-updated">{w.updated}</span>
                <span className="lib-card-arrow">{I.arrow}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="work-list">
          {filteredWorks.map(w => (
            <div key={w.id} className="work-row" onClick={() => open(String(w.id ?? w.title))}>
              <div className="work-row-title">
                {w.title}
                <span className="work-row-genre">{w.genre}</span>
              </div>
              <div className="work-row-prog">
                <div className="work-row-prog-bar">
                  <div className="work-row-prog-fill" style={{ width: (w.prog * 100) + "%" }}></div>
                </div>
                <span>{Math.round(w.prog * 100)}%</span>
              </div>
              <div className="work-row-meta">{w.size} · {w.updated}</div>
              <span className="work-row-arrow">{I.arrow}</span>
            </div>
          ))}
        </div>
      )}

      <SectionHead
        num={2}
        title="리뷰어 페르소나"
        sub="다중 타겟 리뷰에 사용한 가상 독자들. 재사용·복제 가능."
        right={
          <Btn
            icon={I.plus}
            onClick={() => {
              if (showAddForm) {
                resetDraft();
                setShowAddForm(false);
              } else {
                setShowAddForm(true);
              }
            }}
          >
            {showAddForm ? "취소" : "새 페르소나"}
          </Btn>
        }
      />

      {showAddForm && (
        <div className="output-item" style={{
          padding: "16px 18px", marginBottom: 10, display: "grid", gap: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>새 리뷰어 추가</div>
          <div className="form-grid">
            <Field label="이름" required>
              <input className="field-input" placeholder="예: 50대 주부 시청자"
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="태그 (콤마 구분)" help="예: 정통드라마, 가족">
              <input className="field-input" placeholder="멜로, 드라마"
                value={draft.tags}
                onChange={e => setDraft({ ...draft, tags: e.target.value })} />
            </Field>
          </div>
          <Field label="좋아함">
            <input className="field-input" placeholder="예: 가족애, 따뜻한 결말, 정통적 구성"
              value={draft.likes}
              onChange={e => setDraft({ ...draft, likes: e.target.value })} />
          </Field>
          <Field label="싫어함">
            <input className="field-input" placeholder="예: 자극적 소재, 빠른 컷 편집"
              value={draft.dislikes}
              onChange={e => setDraft({ ...draft, dislikes: e.target.value })} />
          </Field>
          <Field label="시각 / 평가 관점">
            <input className="field-input" placeholder="예: 가족·세대 갈등을 자기 인생 경험으로 본다"
              value={draft.lens}
              onChange={e => setDraft({ ...draft, lens: e.target.value })} />
          </Field>
          <div className="btn-row">
            <Btn kind="primary" icon={I.plus} onClick={savePersona}>리뷰어 추가</Btn>
            <Btn onClick={() => { resetDraft(); setShowAddForm(false); }}>닫기</Btn>
          </div>
        </div>
      )}

      {personas.length === 0 ? (
        <div style={{
          padding: "40px 24px", textAlign: "center", color: "var(--ink-3)",
          border: "1px dashed var(--line)", borderRadius: 14, background: "var(--card-soft)",
          fontSize: 14, lineHeight: 1.7,
        }}>
          아직 등록된 페르소나가 없습니다.
          <br />
          상단 <strong>+ 새 페르소나</strong> 버튼이나 리뷰 페이지에서 만들면 여기에 누적됩니다.
        </div>
      ) : (
        <div className="persona-grid">
          {personas.map(p => (
            <div
              key={p.id}
              className="persona-card"
              style={{ cursor: "default", position: "relative" }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); removePersona(p.id); }}
                title="삭제"
                style={{
                  position: "absolute", top: 10, right: 10,
                  width: 24, height: 24, padding: 0,
                  background: "transparent", border: "1px solid var(--line)",
                  borderRadius: 6, cursor: "pointer", color: "var(--ink-3)",
                  fontSize: 14, lineHeight: 1,
                }}
              >×</button>
              <div className="persona-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="9" r="4"/>
                  <path d="M4 21 a8 8 0 0 1 16 0"/>
                </svg>
              </div>
              <div className="persona-info">
                <div className="persona-name">{p.name}</div>
                <div className="persona-tags">
                  {p.tags.map(t => <span key={t} className="chip">{t}</span>)}
                </div>
              </div>
              <div className="persona-used">
                <div className="persona-used-num">{p.used}</div>
                <div className="persona-used-label">회 사용</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 60 }}></div>
    </main>
  );
}
