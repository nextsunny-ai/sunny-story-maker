"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Btn } from "@/components/ui";
import { KEY, usePersistedState } from "@/lib/persist";

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
}

interface LibraryPersona {
  id: number | string;
  name: string;
  tags: string[];
  used: number;
}

function LibraryMain() {
  const router = useRouter();
  const I = ICONS;
  const open = (title: string) =>
    router.push(`/write?mode=continue&project=${encodeURIComponent(title)}`);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");

  const [works] = usePersistedState<LibraryWork[]>(KEY.libraryWorks, []);
  const [personas] = usePersistedState<LibraryPersona[]>(KEY.libraryPersonas, []);

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

      <SectionHead num={1} title="작품" sub={`${works.length}편`} />

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
            <div key={w.id} className="lib-card" onClick={() => open(w.title)}>
              <div className="lib-card-top">
                <div className="lib-card-icon">{I[w.letter]}</div>
                <div className="lib-card-stage" data-stage={w.stage === "완성" ? "done" : w.stage === "리뷰 대기" ? "review" : ""}>
                  {w.stage}
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
            <div key={w.id} className="work-row" onClick={() => open(w.title)}>
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
        right={<Btn icon={I.plus} onClick={() => router.push("/review")}>새 페르소나</Btn>}
      />

      {personas.length === 0 ? (
        <div style={{
          padding: "40px 24px", textAlign: "center", color: "var(--ink-3)",
          border: "1px dashed var(--line)", borderRadius: 14, background: "var(--card-soft)",
          fontSize: 14, lineHeight: 1.7,
        }}>
          아직 등록된 페르소나가 없습니다.
          <br />
          리뷰 페이지에서 페르소나를 만들면 여기에 누적됩니다.
        </div>
      ) : (
        <div className="persona-grid">
          {personas.map(p => (
            <div
              key={p.id}
              className="persona-card"
              onClick={() => alert(`페르소나 편집 — 곧 출시\n\n${p.name}`)}
              style={{ cursor: "pointer" }}
            >
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
