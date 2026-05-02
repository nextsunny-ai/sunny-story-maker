/* ============================================================
   Screen 2: PLAN PACKAGE — 기획 패키지 (의뢰 → 산출물)
   ============================================================ */

function PackageScreen() {
  const I = window.ICONS;
  const [outputs, setOutputs] = React.useState({
    treatment: true, synopsis: true, character: true,
    structure: true, scene: false, pitch: false,
  });

  const toggle = k => setOutputs(o => ({...o, [k]: !o[k]}));

  const steps = [
    { n: 1, label: "의뢰 분석",    state: "done" },
    { n: 2, label: "트리트먼트",   state: "done" },
    { n: 3, label: "시놉시스",     state: "active" },
    { n: 4, label: "캐릭터 시트",  state: "" },
    { n: 5, label: "구성안",       state: "" },
    { n: 6, label: "씬 리스트",    state: "" },
    { n: 7, label: "피치덱",       state: "" },
  ];

  const items = [
    { k: "treatment", name: "트리트먼트",   meta: "5~7p · 줄거리 산문체",     spec: "A4 · 한글" },
    { k: "synopsis",  name: "시놉시스",     meta: "1~2p · 한 줄 ~ 한 페이지", spec: "A4 · 한글" },
    { k: "character", name: "캐릭터 시트",  meta: "3~6명 · 동기·아크",        spec: "A4 · 한글" },
    { k: "structure", name: "구성안",       meta: "회차별 / 막별 비트",       spec: "표 · 한글" },
    { k: "scene",     name: "씬 리스트",    meta: "씬 헤딩 + 한 줄 요약",     spec: "엑셀" },
    { k: "pitch",     name: "피치덱",       meta: "10~15장 · 비주얼 중심",     spec: "PPT" },
  ];

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — PLAN PACKAGE"
        title='기획 <em style="font-style:italic">패키지</em>'
        sub="의뢰 한 번으로 트리트먼트 · 시놉시스 · 캐릭터 시트 · 구성안 · 씬 리스트 · 피치덱까지 한 번에."
      />

      <div className="hero-callout">
        <div className="hero-callout-num">06</div>
        <div className="hero-callout-text">
          <div className="hero-callout-title">한 번 의뢰하면 6종 산출물</div>
          <div className="hero-callout-sub">
            매체에 맞춰 표준 포맷(한글·워드·엑셀·PPT)으로 자동 생성됩니다. 작가는 검토하고 다듬는 데에만 집중하세요.
          </div>
        </div>
        <Btn kind="coral" icon={I.spark}>의뢰 시작</Btn>
      </div>

      <div className="process-flow">
        {steps.map(s => (
          <div key={s.n} className={"process-step " + s.state}>
            <div className="process-step-num">
              {s.state === "done" ? <span style={{display:'inline-flex', width: 10, height: 10, color: '#fff'}}>{I.check}</span> : s.n}
            </div>
            <span className="process-step-text">{s.label}</span>
          </div>
        ))}
      </div>

      <SectionHead num={1} title="작품 정보" sub="매체와 장르부터 정해주세요. 이후 모든 산출물에 적용됩니다." />

      <div className="form-grid">
        <Field label="매체" required>
          <select className="field-select">
            <option>A. TV 드라마 (1~24부 / 단·미·장편)</option>
            <option>B. 영화 (극장용 장편)</option>
            <option>C. 숏드라마 (30~200화)</option>
          </select>
        </Field>
        <Field label="작품명" required help="저장과 다운로드 파일명에 사용됩니다.">
          <input className="field-input" placeholder="예: 트랑로제" defaultValue="트랑로제" />
        </Field>
        <Field label="러닝타임 / 분량" help="매체 표준에 자동 맞춤됩니다.">
          <select className="field-select">
            <option>16부작 (회당 60분)</option>
            <option>12부작 (회당 60분)</option>
            <option>8부작 (회당 60분)</option>
          </select>
        </Field>
        <Field label="편성·플랫폼">
          <select className="field-select">
            <option>OTT (글로벌)</option>
            <option>지상파</option>
            <option>케이블</option>
          </select>
        </Field>
      </div>

      <SectionHead num={2} title="이야기 핵심" sub="자유롭게. 한 문장도 좋고, 한 페이지도 좋습니다." />

      <div className="form-grid cols-1">
        <Field label="이야기 한 줄" help="아직 정해지지 않았다면 비워두세요. SUNNY가 제안합니다.">
          <input className="field-input" placeholder='예: "30대 직장인 여성이 옛 연인의 결혼식에서 첫사랑을 다시 만난다"' />
        </Field>
        <Field label="구체적인 내용·욕망·세계관">
          <textarea className="field-textarea script" rows="6" placeholder="머릿속의 이미지·대사·인물 단편을 자유롭게 적어주세요. 정리되어 있지 않아도 좋습니다." defaultValue="회사 후배의 결혼식, 신랑이 옛 연인. 5년 전 갑자기 떠난 그가 왜 거기에 있는지 — 그날부터 매일 그를 마주쳐야 하는 일이 시작된다. 첫사랑·복수·자기증명이 한 데 얽힌 이야기."/>
        </Field>
      </div>

      <div className="form-grid cols-3">
        <Field label="타겟"><select className="field-select"><option>30대 여성</option></select></Field>
        <Field label="톤"><select className="field-select"><option>로맨틱 · 다소 무거움</option></select></Field>
        <Field label="시점"><select className="field-select"><option>3인칭 제한</option></select></Field>
      </div>

      <SectionHead
        num={3}
        title="산출물 선택"
        sub="기본 4종이 선택돼 있습니다. 필요한 것만 켜고 끄세요."
        right={<span style={{fontSize:12, color:'var(--ink-4)'}}>{Object.values(outputs).filter(Boolean).length} / 6 선택됨</span>}
      />

      <div className="output-grid">
        {items.map(it => (
          <div key={it.k} className="output-item" data-on={outputs[it.k]} onClick={() => toggle(it.k)}>
            <div className="output-check">{I.check}</div>
            <div>
              <div className="output-name">{it.name}</div>
              <div className="output-meta">{it.meta}</div>
            </div>
            <div className="output-spec">{it.spec}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop: 28, display: 'flex', gap: 10, alignItems: 'center'}}>
        <Btn kind="coral" icon={I.spark}>패키지 생성</Btn>
        <Btn icon={I.save}>임시 저장</Btn>
        <span style={{marginLeft:'auto', fontSize:12, color:'var(--ink-4)'}}>예상 소요 시간 — 약 2~3분</span>
      </div>

      <div style={{marginTop: 24}}>
        <Tip>
          작가의 의도가 충분히 적힐수록 결과물이 정확해집니다. 한 줄로 시작해서 작업하면서 채워도 됩니다.
        </Tip>
      </div>

      <div style={{height: 60}}></div>
    </main>
  );
}

window.PackageScreen = PackageScreen;
