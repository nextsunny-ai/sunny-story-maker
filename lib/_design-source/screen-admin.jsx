/* ============================================================
   Screen 8: ADMIN — 작가 / 시스템 설정
   ============================================================ */

function AdminScreen() {
  const I = window.ICONS;
  const [tab, setTab] = React.useState("writer");

  return (
    <main className="main">
      <Topbar
        eyebrow="ADMIN"
        title='어드민<span class="dot">.</span>'
        sub="작가 프로필과 시스템 설정. SUNNY가 더 잘 도울 수 있도록 본인의 정보를 알려주세요."
      />

      {/* Tabs */}
      <div className="adm-tabs">
        <button
          className="adm-tab"
          data-active={tab === "writer"}
          onClick={() => setTab("writer")}
        >
          <span className="adm-tab-num">— 01</span>
          <span className="adm-tab-label">작가</span>
        </button>
        <button
          className="adm-tab"
          data-active={tab === "system"}
          onClick={() => setTab("system")}
        >
          <span className="adm-tab-num">— 02</span>
          <span className="adm-tab-label">시스템</span>
        </button>
      </div>

      {tab === "writer" ? <WriterTab /> : <SystemTab />}

      <div style={{height: 60}}></div>
    </main>
  );
}

function WriterTab() {
  const I = window.ICONS;
  return (
    <React.Fragment>
      {/* Profile Hero */}
      <div className="adm-profile">
        <div className="adm-profile-avatar">
          <span>유</span>
        </div>
        <div className="adm-profile-text">
          <div className="adm-profile-eyebrow">내 프로필</div>
          <div className="adm-profile-name">유희정</div>
          <div className="adm-profile-role">작가 · 감독</div>
          <div className="adm-profile-bio">현대 드라마 · 멜로 중심. SBS 단막극 1편. KBS 드라마 스페셜 작가 데뷔. OTT 12부작 진행 중.</div>
        </div>
        <div className="adm-profile-side">
          <Btn kind="primary" icon={I.write}>편집</Btn>
        </div>
      </div>

      {/* Writer details */}
      <SectionHead num={1} title="기본 정보" sub="작품 저장 시 자동으로 들어갑니다." />

      <div className="form-grid">
        <Field label="이름" required>
          <input className="field-input" defaultValue="유희정" />
        </Field>
        <Field label="작가명 / 필명">
          <input className="field-input" defaultValue="유희정" />
        </Field>
        <Field label="역할">
          <select className="field-select">
            <option>작가 · 감독</option>
            <option>작가</option>
            <option>감독</option>
            <option>기획자</option>
          </select>
        </Field>
        <Field label="이메일" help="공모전 제출용 연락처">
          <input className="field-input" defaultValue="nextsunny@gmail.com" />
        </Field>
      </div>

      <SectionHead num={2} title="활동 정보" sub="SUNNY가 작가의 톤과 경험치에 맞춰 결과물을 조정합니다." />

      <div className="form-grid">
        <Field label="주력 장르" help="3개까지 선택">
          <select className="field-select"><option>TV 드라마, 영화, 웹소설</option></select>
        </Field>
        <Field label="경력 연차">
          <select className="field-select">
            <option>5~10년</option>
            <option>1~5년</option>
            <option>10년 이상</option>
            <option>지망생</option>
          </select>
        </Field>
        <Field label="대표 작품" span={2}>
          <textarea className="field-textarea" rows="3" defaultValue="단막 「봄밤의 메일」 (SBS, 2021) / 미니시리즈 「작은 빛으로」 (KBS, 2023, 4부작) / OTT 「트랑로제」 (제작 중, 16부작)"/>
        </Field>
      </div>

      <SectionHead num={3} title="작가의 선호" sub="SUNNY가 도움말을 줄 때 참고합니다." />

      <div className="form-grid cols-1">
        <Field label="피하고 싶은 표현 · 스타일" help="AI투, 클리셰, 어휘 등 자유롭게.">
          <textarea className="field-textarea" rows="3" defaultValue="격언체 대사 ✗ / 영어 번역체 ✗ / '당신' 호명 ✗ / 대사로 감정 직접 설명 ✗"/>
        </Field>
        <Field label="좋아하는 작가 · 작품" help="레퍼런스로 톤을 맞춥니다.">
          <textarea className="field-textarea" rows="3" defaultValue="박해영 작가 (나의 아저씨), 노희경 작가 (디어 마이 프렌즈), 김영하 (살인자의 기억법). 차분하고 깊은 인물 내면."/>
        </Field>
      </div>

      {/* Stats */}
      <div className="stats" style={{marginTop: 36}}>
        <div className="stat">
          <div className="stat-label">완성 작품</div>
          <div className="stat-value">12<span className="unit">편</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">활동 기간</div>
          <div className="stat-value">8<span className="unit">년</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">SUNNY 사용</div>
          <div className="stat-value">128<span className="unit">회</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">총 작성</div>
          <div className="stat-value">847<span className="unit">p</span></div>
        </div>
      </div>
    </React.Fragment>
  );
}

function SystemTab() {
  const I = window.ICONS;
  return (
    <React.Fragment>
      <SectionHead num={1} title="AI 설정" sub="SUNNY의 동작 방식." />
      <div className="form-grid">
        <Field label="AI 모델">
          <select className="field-select">
            <option>SUNNY Pro (Sonnet 4.5)</option>
            <option>SUNNY Lite (Haiku)</option>
          </select>
        </Field>
        <Field label="응답 속도">
          <select className="field-select">
            <option>일반 (균형)</option>
            <option>빠름 (간결)</option>
            <option>느림 (정밀)</option>
          </select>
        </Field>
        <Field label="기본 출력 길이">
          <select className="field-select">
            <option>표준 (~6,000자)</option>
            <option>짧게 (~3,000자)</option>
            <option>길게 (~10,000자)</option>
          </select>
        </Field>
        <Field label="자동 저장 간격">
          <select className="field-select">
            <option>1분</option>
            <option>5분</option>
            <option>수동</option>
          </select>
        </Field>
      </div>

      <SectionHead num={2} title="저장 · 내보내기" sub="기본 파일 포맷과 저장 위치." />
      <div className="form-grid">
        <Field label="기본 출력 포맷">
          <select className="field-select">
            <option>장르별 표준 (자동)</option>
            <option>한글(.hwp) 통일</option>
            <option>워드(.docx) 통일</option>
          </select>
        </Field>
        <Field label="파일명 패턴">
          <input className="field-input" defaultValue="{작품명}_{단계}_{날짜}" />
        </Field>
      </div>

      <SectionHead num={3} title="구독 · 결제" />
      <div className="adm-plan">
        <div className="adm-plan-tag">현재 플랜</div>
        <div className="adm-plan-name">SUNNY <em>Pro</em></div>
        <div className="adm-plan-meta">월 39,000원 · 무제한 의뢰 · 라이브러리 100GB</div>
        <div className="adm-plan-side">
          <div className="kv"><div className="kv-k">다음 결제일</div><div className="kv-v">2026.05.28</div></div>
          <div className="kv"><div className="kv-k">이번 달 사용</div><div className="kv-v">128회</div></div>
        </div>
        <Btn>플랜 변경</Btn>
      </div>

      <SectionHead num={4} title="계정" />
      <div className="form-grid">
        <Field label="이메일 알림">
          <select className="field-select">
            <option>모두 받기</option>
            <option>중요만</option>
            <option>받지 않음</option>
          </select>
        </Field>
        <Field label="언어">
          <select className="field-select">
            <option>한국어</option>
            <option>English</option>
          </select>
        </Field>
      </div>

      <div style={{display:'flex', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--line)'}}>
        <Btn icon={I.download}>데이터 내보내기</Btn>
        <Btn icon={I.trash} kind="default">계정 삭제</Btn>
      </div>
    </React.Fragment>
  );
}

window.AdminScreen = AdminScreen;
