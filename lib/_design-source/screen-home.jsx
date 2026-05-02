/* ============================================================
   Screen 1: HOME — AI Pitch 중심 재설계
   "들어오자마자 글쓰기 시작" — 영웅 영역에 single-input
   ============================================================ */

function HomeScreen() {
  const I = window.ICONS;
  const G = window.GENRES;
  const [idea, setIdea] = React.useState("");
  const [genre, setGenre] = React.useState("A");
  // 매체별 분량 옵션 — 매체 바뀌면 첫 번째 옵션으로 리셋
  const [formatIdx, setFormatIdx] = React.useState(0);
  React.useEffect(() => { setFormatIdx(0); }, [genre]);

  const samples = [
    "잃어버린 약혼반지를 추적하는 도둑이 진짜 도둑은 자신이었다는 걸 깨닫는 이야기",
    "AI 작가가 작성한 시나리오가 실제 살인사건과 일치한다는 신고가 들어온다",
    "엘리트 입시 학원 1등 학생이, 어느 날 자기 시험지가 백지로 제출됐다는 걸 알게 된다",
  ];

  // 가장 최근 진행 중 작품 3개 — 큰 카드로
  const recent = [
    { title: "트랑로제",         genre: "TV 드라마",   letter: "A", prog: 0.62, meta: "5부 / 8부", updated: "2시간 전",  next: "5부 60p — 회상 시퀀스 이어쓰기" },
    { title: "마지막 인사",      genre: "영화",        letter: "B", prog: 0.34, meta: "24p / 70p", updated: "어제",      next: "2막 진입 — 대결 시퀀스 트리트먼트" },
    { title: "회귀한 황녀",      genre: "웹소설",      letter: "H", prog: 0.18, meta: "36화 / 200화", updated: "3일 전",  next: "황궁 도착 — 36화 이어쓰기" },
  ];

  const currentGenre = G.find(g => g.letter === genre) || G[0];

  return (
    <main className="main">
      <Topbar
        eyebrow="WORKSPACE — HOME"
        title='Good <em style="font-style:italic">morning</em>, 작가님<span class="dot">.</span>'
        sub="머릿속 한 문장이면 충분합니다. SUNNY가 로그라인부터 첫 부분 샘플까지 만들어 드려요."
      />

      {/* ============================================================
         HERO — Pitch single-input (가장 중요한 행동)
         ============================================================ */}
      <div className="home-hero">
        <div className="home-hero-eyebrow">
          <span className="home-hero-bullet"></span>
          오늘은 어떤 이야기를 시작할까요
        </div>

        <textarea
          className="home-hero-input"
          rows="3"
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder='예) 번아웃으로 퇴사한 30대 직장인이 시골 마을 작은 카페를 인수하면서 벌어지는 일…'
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
            <button className="home-hero-launch" disabled={!idea.trim()} onClick={() => window.__appNav && window.__appNav('write')}>
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
              {s.length > 32 ? s.slice(0, 32) + '…' : s}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
         CONTINUE — 이어서 작업하기 (큰 카드)
         ============================================================ */}
      <SectionHead
        num={1}
        title="이어서 작업하기"
        sub="작가님이 마지막으로 머문 곳"
        right={
          <button className="section-link" onClick={() => window.__appNav && window.__appNav('library')}>
            전체 라이브러리
            <span className="section-link-arrow">{I.arrow}</span>
          </button>
        }
      />

      <div className="home-continue-grid">
        {recent.map((w, i) => (
          <div key={i} className="home-continue-card" onClick={() => window.__appNav && window.__appNav('write')}>
            <div className="home-continue-top">
              <div className="home-continue-icon">{I[w.letter]}</div>
              <div className="home-continue-genre">{w.genre}</div>
            </div>

            <div className="home-continue-title">{w.title}</div>

            <div className="home-continue-next">
              <span className="home-continue-next-label">NEXT</span>
              <span className="home-continue-next-text">{w.next}</span>
            </div>

            <div className="home-continue-prog">
              <div className="home-continue-prog-bar">
                <div className="home-continue-prog-fill" style={{width: (w.prog*100)+'%'}}></div>
              </div>
              <span className="home-continue-prog-meta">{w.meta} · {Math.round(w.prog*100)}%</span>
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

      {/* ============================================================
         GENRE GRID — 컴팩트, 보조 진입점
         ============================================================ */}
      <SectionHead
        num={2}
        title="새로 시작하기"
        sub="매체에서부터 시작하고 싶다면"
      />

      <div className="home-genre-mini">
        {G.map((g, i) => (
          <button
            key={g.letter}
            className="home-genre-mini-card"
            onClick={() => { setGenre(g.letter); window.__appNav && window.__appNav('write'); }}
          >
            <span className="home-genre-mini-icon">{I[g.letter]}</span>
            <span className="home-genre-mini-name">{g.name}</span>
            <span className="home-genre-mini-sub">{g.sub}</span>
          </button>
        ))}
      </div>

      {/* ============================================================
         STATS — 미니
         ============================================================ */}
      <div className="stats" style={{marginTop: 36}}>
        <div className="stat">
          <div className="stat-label">완성 작품</div>
          <div className="stat-value">12<span className="unit">편</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">진행 중</div>
          <div className="stat-value">4<span className="unit">편</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">누적 분량</div>
          <div className="stat-value">847<span className="unit">p</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">SUNNY 사용</div>
          <div className="stat-value">128<span className="unit">회</span></div>
        </div>
      </div>

      <div className="footer-band">
        <div className="footer-band-left">
          <span>SUNNY Story Maker</span>
          <span>·</span>
          <span>v1.0</span>
        </div>
        <div>마지막 동기화 — 방금 전</div>
      </div>
    </main>
  );
}

window.HomeScreen = HomeScreen;
