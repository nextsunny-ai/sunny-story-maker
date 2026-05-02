/* ============================================================
   Screen 3: WRITE — 집필 화면 (의뢰 → 트리트먼트 → 시놉시스 → 캐릭터 → 구성안 → 씬 → 대본)
   ============================================================ */

function WriteScreen() {
  const I = window.ICONS;
  const steps = [
    { n: 1, label: "의뢰 분석",   state: "done" },
    { n: 2, label: "트리트먼트",  state: "done" },
    { n: 3, label: "시놉시스",    state: "done" },
    { n: 4, label: "캐릭터",      state: "done" },
    { n: 5, label: "구성안",      state: "active" },
    { n: 6, label: "씬 리스트",   state: "" },
    { n: 7, label: "대본",        state: "" },
  ];

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — WRITE"
        title='집필<span class="dot">.</span>'
        sub="매체 표준 포맷에 맞춰 시나리오를 직접 씁니다. 막히면 우측 보조작가에게 물어보세요."
      />

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

      <SectionHead num={1} title="작품 설정" sub="이미 입력한 정보는 자동으로 채워둡니다. 필요하면 수정하세요." />

      <div className="form-grid">
        <Field label="작품명" required>
          <input className="field-input" defaultValue="트랑로제" />
        </Field>
        <Field label="매체" required>
          <select className="field-select"><option>A. TV 드라마 (1~24부)</option></select>
        </Field>
        <Field label="장르">
          <select className="field-select"><option>로맨스 · 멜로</option></select>
        </Field>
        <Field label="러닝타임 / 분량">
          <select className="field-select"><option>16부작 · 회당 60분</option></select>
        </Field>
      </div>

      <SectionHead num={2} title="쓰고 싶은 내용" sub="이번 단계에서 작업할 부분을 입력해주세요." />

      <div className="form-grid cols-1">
        <Field label="이번 회차 / 단계" help="구성안 단계입니다. 16개 회차 비트를 한 번에 만들어드립니다.">
          <input className="field-input" defaultValue="16부 전체 회차 비트" />
        </Field>
        <Field label="작가의 메모 · 디렉션" help="원하는 분위기, 인물 동선, 회차 전환 포인트 등 자유롭게.">
          <textarea className="field-textarea script" rows="6" defaultValue="2회 결혼식 신을 길게. 12회 미드포인트로 5년 전 진실 공개 — 그가 떠난 진짜 이유는 동생의 사고 때문. 16회 결말은 열린 결말 (재결합 X, 화해 O). 회차 후크는 매 회 마지막 30초에 SNS 메시지·전화·만남 트리거."/>
        </Field>
      </div>

      <div className="form-grid cols-3">
        <Field label="톤"><select className="field-select"><option>로맨틱 · 다소 무거움</option></select></Field>
        <Field label="주인공 구성"><select className="field-select"><option>1주인공 (여성 30대)</option></select></Field>
        <Field label="시점"><select className="field-select"><option>3인칭 제한</option></select></Field>
      </div>

      <SectionHead
        num={3}
        title="실행"
        right={<span style={{fontSize:12, color:'var(--ink-4)'}}>매체 공식 자동 적용 — 1화 후크 · A·B플롯 · 미드포인트 · 회차 후크</span>}
      />

      <div className="btn-row">
        <Btn kind="coral" icon={I.spark}>구성안 생성</Btn>
        <Btn icon={I.save}>임시 저장</Btn>
        <Btn icon={I.download}>한글(.hwp) 다운로드</Btn>
        <span style={{marginLeft:'auto'}}>
          <Btn icon={I.trash}>초기화</Btn>
        </span>
      </div>

      <div style={{marginTop: 24}}>
        <Tip>
          한 번에 16부 전부보다는 4부씩 끊어 작업하면 작가의 디렉션이 더 잘 반영됩니다. (예: 1~4부 / 5~8부 / 9~12부 / 13~16부)
        </Tip>
      </div>

      <div style={{height: 60}}></div>
    </main>
  );
}

window.WriteScreen = WriteScreen;
