"use client";

import { useState } from "react";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Btn } from "@/components/ui";

export default function LibraryPage() {
  return (
    <AppShell>
      <LibraryMain />
    </AppShell>
  );
}

function LibraryMain() {
  const I = ICONS;
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const works = [
    { id: 1, title: "트랑로제", genre: "TV 드라마", letter: "A", stage: "집필 중", prog: 0.62, updated: "2시간 전", size: "8부 / 5부 진행" },
    { id: 2, title: "마지막 인사", genre: "영화", letter: "B", stage: "트리트먼트", prog: 0.34, updated: "어제", size: "70p / 24p" },
    { id: 3, title: "회귀한 황녀", genre: "웹소설", letter: "H", stage: "집필 중", prog: 0.18, updated: "3일 전", size: "200화 / 36화" },
    { id: 4, title: "서울 네 번째 봄", genre: "숏드라마", letter: "C", stage: "리뷰 대기", prog: 0.92, updated: "1주 전", size: "60화 / 55화" },
    { id: 5, title: "달빛 무대", genre: "뮤지컬", letter: "I", stage: "기획", prog: 0.08, updated: "2주 전", size: "100p / 8p" },
    { id: 6, title: "옛날 옛적, 우리는", genre: "다큐", letter: "G", stage: "완성", prog: 1.0, updated: "1개월 전", size: "60분 · 완료" },
    { id: 7, title: "메이드 인 부산", genre: "예능", letter: "M", stage: "완성", prog: 1.0, updated: "2개월 전", size: "8회 · 완료" },
    { id: 8, title: "코어 스토리", genre: "게임", letter: "L", stage: "기획", prog: 0.12, updated: "3개월 전", size: "엑셀 · 진행" },
  ];

  const personas = [
    { id: 1, name: "30대 도시 직장인 여성", tags: ["멜로", "드라마"], used: 12 },
    { id: 2, name: "40대 남성 PD", tags: ["기획", "상업성"], used: 8 },
    { id: 3, name: "20대 OTT 헤비유저", tags: ["글로벌"], used: 5 },
    { id: 4, name: "60대 작가 멘토", tags: ["문학", "고전"], used: 2 },
  ];

  const filters = [
    { id: "all", label: "전체", count: 8 },
    { id: "wip", label: "진행 중", count: 5 },
    { id: "done", label: "완성", count: 2 },
    { id: "draft", label: "기획", count: 2 },
  ];

  return (
    <main className="main">
      <Topbar
        eyebrow="LIBRARY"
        title='라이브러리<span class="dot">.</span>'
        sub="모든 작업물과 리뷰어 페르소나를 한 곳에서. 검색하고 이어서 작업하세요."
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Btn icon={I.plus} kind="coral">새 작품</Btn>
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
            <input placeholder="작품명·매체·장르 검색" />
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

      {view === "grid" ? (
        <div className="lib-grid">
          {works.map(w => (
            <div key={w.id} className="lib-card">
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
          {works.map(w => (
            <div key={w.id} className="work-row">
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

      <SectionHead num={2} title="리뷰어 페르소나" sub="다중 타겟 리뷰에 사용한 가상 독자들. 재사용·복제 가능." right={<Btn icon={I.plus}>새 페르소나</Btn>} />

      <div className="persona-grid">
        {personas.map(p => (
          <div key={p.id} className="persona-card">
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

      <div style={{ height: 60 }}></div>
    </main>
  );
}
