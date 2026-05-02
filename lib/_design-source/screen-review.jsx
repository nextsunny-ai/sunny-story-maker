/* ============================================================
   Screen 4: REVIEW — 다중 타겟 리뷰
   ============================================================ */

function ReviewScreen() {
  const I = window.ICONS;
  const personas = [
    { id: 1, name: "30대 도시 직장인 여성", tags: ["멜로","드라마","웹툰"], on: true,
      likes: "긴 디테일, 위로받는 결말, 캐릭터의 성장",
      dislikes: "공감 안 가는 재벌물, 비현실적 신데렐라",
      lens: "직장·연애·동거의 디테일을 기준으로 평가" },
    { id: 2, name: "40대 남성 PD",         tags: ["기획","상업성"],         on: true,
      likes: "기획 의도 명확, 회차 후크, 글로벌 가능성",
      dislikes: "한국 한정 소재, 1화 늘어짐",
      lens: "편성 가능성·시청률 곡선·CP 매력" },
    { id: 3, name: "20대 OTT 헤비유저",    tags: ["글로벌","빠른전개"],     on: false,
      likes: "12부 단축 포맷, 첫 5분 사건, 비주얼",
      dislikes: "16부 늘어짐, 한국적 개그",
      lens: "넷플릭스·디즈니+ 알고리즘 적합성" },
  ];

  return (
    <main className="main">
      <Topbar
        eyebrow="REVIEW — MULTI-PERSONA"
        title='리뷰<span class="dot">.</span>'
        sub="배급사가 작가에게 보내는 다중 타겟 리뷰를 시뮬레이션. 연령·라이프스타일·취향별로 별도 의견을 즉시 받습니다."
      />

      <div className="hero-callout">
        <div className="hero-callout-num">3<span style={{fontSize: 28, color: 'var(--ink-3)', fontStyle: 'italic'}}>×</span></div>
        <div className="hero-callout-text">
          <div className="hero-callout-title">왜 다중 타겟인가</div>
          <div className="hero-callout-sub">
            한 명의 의견은 편향됩니다. 3명 이상이 동시에 보면 작품의 약점·강점이 입체적으로 드러납니다. 작가가 가장 궁금한 영역만 골라 즉시 무한 반복 가능합니다.
          </div>
        </div>
      </div>

      <SectionHead num={1} title="리뷰어 · 매체" sub="시나리오를 첨부하기 전에 누가 어떻게 볼지부터 정해두세요." />

      <div className="form-grid">
        <Field label="매체" required>
          <select className="field-select"><option>A. TV 드라마 (1~24부)</option></select>
        </Field>
        <Field label="작품명 (저장용)" help="리뷰 결과 저장에 사용됩니다.">
          <input className="field-input" placeholder="예: 트랑로제" defaultValue="트랑로제" />
        </Field>
      </div>

      <SectionHead
        num={2}
        title="리뷰어 선택"
        sub="여러 명을 동시에 켤 수 있습니다. 각자의 시각으로 따로 리뷰가 나옵니다."
        right={
          <div style={{display:'flex', gap: 8}}>
            <Btn>라이브러리에서</Btn>
            <Btn icon={I.plus}>직접 작성</Btn>
          </div>
        }
      />

      <div style={{display:'flex', flexDirection:'column', gap: 10}}>
        {personas.map(p => (
          <div key={p.id} className="output-item" data-on={p.on} style={{
            display:'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, padding: '16px 18px', alignItems: 'flex-start'
          }}>
            <div className="output-check" style={{marginTop: 4}}>{I.check}</div>
            <div>
              <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 6, flexWrap:'wrap'}}>
                <span className="output-name" style={{fontSize: 14}}>{p.name}</span>
                {p.tags.map(t => <span key={t} className="chip">{t}</span>)}
              </div>
              <div style={{fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, display:'grid', gap: 3}}>
                <div><span style={{color:'var(--ink-5)', marginRight: 6, fontWeight: 600}}>좋아함</span>{p.likes}</div>
                <div><span style={{color:'var(--ink-5)', marginRight: 6, fontWeight: 600}}>싫어함</span>{p.dislikes}</div>
                <div><span style={{color:'var(--ink-5)', marginRight: 6, fontWeight: 600}}>관점</span>{p.lens}</div>
              </div>
            </div>
            <div style={{fontSize: 11, color: 'var(--ink-4)', whiteSpace:'nowrap'}}>{p.on ? '리뷰 ON' : '꺼짐'}</div>
          </div>
        ))}
      </div>

      <SectionHead num={3} title="작품 첨부" sub="텍스트로 붙여넣거나, 한글·워드 파일을 업로드하세요." />

      <div className="form-grid cols-1">
        <Field label="시나리오 본문">
          <textarea className="field-textarea script" rows="8" placeholder="시나리오 전체 또는 일부를 붙여넣어 주세요. 회차 단위, 또는 한 씬 단위도 가능합니다."/>
        </Field>
      </div>

      <div className="btn-row">
        <Btn kind="coral" icon={I.spark}>리뷰 받기</Btn>
        <Btn icon={I.download}>파일 업로드</Btn>
        <span style={{marginLeft:'auto', fontSize: 12, color:'var(--ink-4)'}}>선택된 리뷰어 — {personas.filter(p=>p.on).length}명</span>
      </div>

      <div style={{height: 60}}></div>
    </main>
  );
}

window.ReviewScreen = ReviewScreen;
