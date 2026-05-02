/* ============================================================
   Screen 6: AI PITCH — 한 줄 → 풀 기획
   "마법 같은 첫인상" — hero 입력 + 단계 시각화
   ============================================================ */

function PitchScreen() {
  const I = window.ICONS;
  const G = window.GENRES;
  const [idea, setIdea] = React.useState("번아웃으로 퇴사한 30대 직장인이 시골 마을 작은 카페를 인수하면서 벌어지는 일");
  const [genre, setGenre] = React.useState("A");
  const [project, setProject] = React.useState("");

  const phases = [
    { n: 1, name: "로그라인",     out: "한 줄 컨셉",          time: "10초" },
    { n: 2, name: "트리트먼트",    out: "5~7p 줄거리",         time: "60초" },
    { n: 3, name: "시놉시스",      out: "1~2p",               time: "30초" },
    { n: 4, name: "첫 부분 샘플",   out: "1화 또는 첫 10p",    time: "90초" },
  ];

  const samples = [
    "잃어버린 약혼반지를 추적하는 도둑이 진짜 도둑은 자신이었다는 걸 깨닫는 이야기",
    "AI 작가가 작성한 시나리오가 실제 살인사건과 일치한다는 신고가 들어온다",
    "엘리트 입시 학원에서 1등을 한 번도 놓친 적 없는 학생이, 어느 날 자기 시험지가 백지로 제출됐다는 걸 알게 된다",
  ];

  const currentGenre = G.find(g => g.letter === genre) || G[0];

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — AI PITCH"
        title='AI <em style="font-style:italic">기획</em>'
        sub="한 줄 아이디어만. SUNNY가 로그라인부터 트리트먼트, 시놉시스, 첫 부분 샘플까지 처음부터 끝까지 씁니다."
      />

      {/* ---- HERO IDEA INPUT ---- */}
      <div className="pitch-hero">
        <div className="pitch-hero-eyebrow">
          <span className="pitch-hero-bullet"></span>
          머릿속 한 문장을 적어주세요
        </div>

        <textarea
          className="pitch-hero-input"
          rows="3"
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder='예) 번아웃으로 퇴사한 30대 직장인이 시골 마을 작은 카페를 인수하면서 벌어지는 일'
        />

        <div className="pitch-hero-meta">
          <span className="pitch-hero-count">
            <span className="num">{idea.length}</span> / 200자
          </span>
          <div className="pitch-hero-samples">
            <span className="pitch-hero-samples-label">또는 — 영감</span>
            {samples.map((s, i) => (
              <button key={i} className="pitch-sample-chip" onClick={() => setIdea(s)}>
                {s.length > 38 ? s.slice(0, 38) + '…' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- GENRE + PROJECT ---- */}
      <SectionHead num={1} title="매체" sub="매체에 따라 SUNNY가 적용할 공식이 달라집니다. (장르는 다음 단계에서)" />

      <div className="form-grid">
        <Field label="매체" required>
          <select className="field-select" value={genre} onChange={e => setGenre(e.target.value)}>
            {G.map(g => (
              <option key={g.letter} value={g.letter}>{g.letter}. {g.name} ({g.sub})</option>
            ))}
          </select>
        </Field>
        <Field label="작품명" help="저장용 — 나중에 라이브러리에서 찾기 쉽도록.">
          <input
            className="field-input"
            placeholder={"예: " + (idea.split(' ').slice(0, 3).join('') || "시골카페 일기")}
            value={project}
            onChange={e => setProject(e.target.value)}
          />
        </Field>
      </div>

      {/* Genre cheatsheet */}
      <div className="pitch-cheat">
        <div className="pitch-cheat-head">
          <span className="pitch-cheat-icon">{I[genre]}</span>
          <div>
            <div className="pitch-cheat-title">{currentGenre.name}</div>
            <div className="pitch-cheat-sub">{currentGenre.sub}</div>
          </div>
          <div className="pitch-cheat-spec">
            <div><span>분량</span>{currentGenre.pages}</div>
            <div><span>포맷</span>{currentGenre.format}</div>
          </div>
        </div>
      </div>

      {/* ---- PHASE TIMELINE ---- */}
      <SectionHead num={2} title="SUNNY가 만들 것" sub="버튼 한 번에 4단계 산출물이 순서대로 흘러나옵니다." />

      <div className="pitch-phases">
        {phases.map((p, i) => (
          <div key={p.n} className="pitch-phase">
            <div className="pitch-phase-head">
              <span className="pitch-phase-num">— {String(p.n).padStart(2, '0')}</span>
              <span className="pitch-phase-time">{p.time}</span>
            </div>
            <div className="pitch-phase-name">{p.name}</div>
            <div className="pitch-phase-out">{p.out}</div>
            {i < phases.length - 1 && <div className="pitch-phase-arrow">{I.arrow}</div>}
          </div>
        ))}
      </div>

      {/* ---- LAUNCH ---- */}
      <SectionHead num={3} title="실행" sub="평균 소요 — 약 3분. 글자가 흘러내리는 걸 실시간으로 볼 수 있습니다." />

      <div className="pitch-launch">
        <button className="pitch-launch-btn" disabled={!idea.trim()}>
          <span className="pitch-launch-icon">{I.spark}</span>
          <span>
            <div className="pitch-launch-title">AI 작가에게 맡기기</div>
            <div className="pitch-launch-sub">{currentGenre.name} · 4단계 산출물 자동 생성</div>
          </span>
          <span className="pitch-launch-arrow">{I.arrow}</span>
        </button>

        <div className="pitch-launch-side">
          <div className="kv"><div className="kv-k">예상 소요</div><div className="kv-v">~3분</div></div>
          <div className="kv"><div className="kv-k">예상 분량</div><div className="kv-v">~6,000자</div></div>
          <div className="kv"><div className="kv-k">자동 저장</div><div className="kv-v">라이브러리</div></div>
        </div>
      </div>

      <div style={{marginTop: 28}}>
        <Tip>
          한 줄이 구체적일수록 결과가 정확합니다. 인물 · 욕망 · 장애물이 포함되면 좋아요. 막연하면 SUNNY가 너무 많은 걸 가정합니다.
        </Tip>
      </div>

      <div style={{height: 60}}></div>
    </main>
  );
}

window.PitchScreen = PitchScreen;
