"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { KEY, loadJSON, usePersistedState } from "@/lib/persist";

export default function HomePage() {
  return (
    <AppShell>
      <HomeMain />
    </AppShell>
  );
}

interface LibraryWork {
  id: number | string;
  title: string;
  genre: string;
  letter: string;
  stage?: string;
  prog: number;
  updated: string;
  size?: string;
  next?: string;
  meta?: string;
}

function HomeMain() {
  const router = useRouter();
  const I = ICONS;
  const G = GENRES;
  const [idea, setIdea] = usePersistedState<string>(KEY.homeIdea, "");
  const [genre, setGenre] = useState("A");
  const [formatIdx, setFormatIdx] = useState(0);
  useEffect(() => { setFormatIdx(0); }, [genre]);

  const samples = [
    "잃어버린 약혼반지를 추적하는 도둑이 진짜 도둑은 자신이었다는 걸 깨닫는 이야기",
    "AI 작가가 작성한 시나리오가 실제 살인사건과 일치한다는 신고가 들어온다",
    "엘리트 입시 학원 1등 학생이, 어느 날 자기 시험지가 백지로 제출됐다는 걸 알게 된다",
  ];

  // 진행 중인 작품 — library에 누적된 데이터에서 최근 3개 (없으면 빈 상태)
  const [recent, setRecent] = useState<LibraryWork[]>([]);
  useEffect(() => {
    const works = loadJSON<LibraryWork[]>(KEY.libraryWorks, []);
    const inProgress = works
      .filter(w => (w.prog ?? 0) < 1)
      .slice(0, 3);
    setRecent(inProgress);
  }, []);

  // STATS — library 누적 기반 실시간 계산
  const [stats, setStats] = useState({ done: 0, wip: 0, pages: 0, calls: 0 });
  useEffect(() => {
    const works = loadJSON<LibraryWork[]>(KEY.libraryWorks, []);
    const done = works.filter(w => (w.prog ?? 0) >= 1).length;
    const wip = works.filter(w => (w.prog ?? 0) < 1).length;
    setStats({ done, wip, pages: 0, calls: 0 });
  }, []);

  const currentGenre = G.find(g => g.letter === genre) || G[0];

  return (
    <main className="main">
      <Topbar
        eyebrow="WORKSPACE — HOME"
        title='Good <em style="font-style:italic">morning</em>, 작가님<span class="dot">.</span>'
        sub="머릿속 한 문장이면 충분합니다. SUNNY가 로그라인부터 첫 부분 샘플까지 만들어 드려요."
      />

      {/* HERO — Pitch single-input */}
      <div className="home-hero">
        <div className="home-hero-eyebrow">
          <span className="home-hero-bullet"></span>
          오늘은 어떤 이야기를 시작할까요
        </div>

        <textarea
          className="home-hero-input"
          rows={3}
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="예) 번아웃으로 퇴사한 30대 직장인이 시골 마을 작은 카페를 인수하면서 벌어지는 일…"
        />

        <div className="home-hero-controls">
          <div className="home-hero-genre">
            <label className="home-hero-genre-label">매체</label>
            <select
              className="home-hero-genre-select"
              value={genre}
              onChange={e => setGenre(e.target.value)}
            >
              {G.map(g => (
                <option key={g.letter} value={g.letter}>{g.name}</option>
              ))}
            </select>
            <select
              className="home-hero-genre-spec home-hero-format-select"
              value={formatIdx}
              onChange={e => setFormatIdx(parseInt(e.target.value, 10))}
            >
              {(currentGenre.formatOptions || [currentGenre.pages]).map((f, i) => (
                <option key={i} value={i}>{f}</option>
              ))}
            </select>
          </div>

          <div className="home-hero-actions">
            <span className="home-hero-count">
              <span className="num">{idea.length}</span><span className="sep">/</span>200
            </span>
            <button
              className="home-hero-launch"
              disabled={!idea.trim()}
              onClick={() => {
                const params = new URLSearchParams({
                  mode: "new",
                  idea: idea.trim(),
                  genre,
                });
                router.push(`/write?${params.toString()}`);
              }}
            >
              <span className="home-hero-launch-icon">{I.spark}</span>
              <span className="home-hero-launch-text">AI 작가에게 맡기기</span>
              <span className="home-hero-launch-arrow">{I.arrow}</span>
            </button>
          </div>
        </div>

        <div className="home-hero-samples">
          <span className="home-hero-samples-label">— 영감이 필요하면</span>
          {samples.map((s, i) => (
            <button key={i} className="home-hero-sample" onClick={() => setIdea(s)}>
              {s.length > 32 ? s.slice(0, 32) + "…" : s}
            </button>
          ))}
        </div>
      </div>

      {/* CONTINUE — 이어서 작업하기 */}
      <SectionHead
        num={1}
        title="이어서 작업하기"
        sub="작가님이 마지막으로 머문 곳"
        right={
          <button className="section-link" onClick={() => router.push("/library")}>
            전체 라이브러리
            <span className="section-link-arrow">{I.arrow}</span>
          </button>
        }
      />

      {recent.length === 0 ? (
        <div style={{
          padding: "40px 24px", textAlign: "center", color: "var(--ink-3)",
          border: "1px dashed var(--line)", borderRadius: 14, background: "var(--card-soft)",
          fontSize: 14, lineHeight: 1.7,
        }}>
          아직 진행 중인 작품이 없습니다.
          <br />
          위에서 한 줄 아이디어로 시작해보세요.
        </div>
      ) : (
        <div className="home-continue-grid">
          {recent.map((w, i) => (
            <div key={w.id ?? i} className="home-continue-card"
              onClick={() => router.push(`/write?mode=continue&project=${encodeURIComponent(w.title)}`)}>
              <div className="home-continue-top">
                <div className="home-continue-icon">{I[w.letter]}</div>
                <div className="home-continue-genre">{w.genre}</div>
              </div>
              <div className="home-continue-title">{w.title}</div>
              <div className="home-continue-next">
                <span className="home-continue-next-label">NEXT</span>
                <span className="home-continue-next-text">{w.next ?? "이어쓰기 위치 미정"}</span>
              </div>
              <div className="home-continue-prog">
                <div className="home-continue-prog-bar">
                  <div className="home-continue-prog-fill" style={{ width: (w.prog * 100) + "%" }}></div>
                </div>
                <span className="home-continue-prog-meta">{w.meta ?? w.size ?? ""} · {Math.round(w.prog * 100)}%</span>
              </div>
              <div className="home-continue-foot">
                <span className="home-continue-updated">{w.updated}</span>
                <span className="home-continue-cta">
                  이어쓰기
                  <span className="home-continue-cta-arrow">{I.arrow}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GENRE GRID */}
      <SectionHead
        num={2}
        title="새로 시작하기"
        sub="매체에서부터 시작하고 싶다면"
      />

      <div className="home-genre-mini">
        {G.map(g => (
          <button
            key={g.letter}
            className="home-genre-mini-card"
            onClick={() => router.push(`/write?mode=new&genre=${g.letter}`)}
          >
            <span className="home-genre-mini-icon">{I[g.letter]}</span>
            <span className="home-genre-mini-name">{g.name}</span>
            <span className="home-genre-mini-sub">{g.sub}</span>
          </button>
        ))}
      </div>

      {/* STATS */}
      <div className="stats" style={{ marginTop: 36 }}>
        <div className="stat">
          <div className="stat-label">완성 작품</div>
          <div className="stat-value">{stats.done}<span className="unit">편</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">진행 중</div>
          <div className="stat-value">{stats.wip}<span className="unit">편</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">누적 분량</div>
          <div className="stat-value">{stats.pages}<span className="unit">p</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">SUNNY 사용</div>
          <div className="stat-value">{stats.calls}<span className="unit">회</span></div>
        </div>
      </div>

      <div className="footer-band">
        <div className="footer-band-left">
          <span>SUNNY Story Maker</span>
          <span>·</span>
          <span>v2.1 (워크룸)</span>
        </div>
        <div>마지막 동기화 — 방금 전</div>
      </div>
    </main>
  );
}
