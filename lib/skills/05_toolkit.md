# 소리(SORI) 툴킷 — 시나리오·대본 작가 도구

> 한국어 시나리오 작가의 실전 도구. 무료/유료/자체 구현 다 활용.

---

## A. 시나리오 작성 툴 (Industry Standard)

### 1. Final Draft (유료, $250)
- ★ 헐리우드 표준
- Beat Board · 캐릭터 관리 · 협업
- 한국 드라마·영화 작가도 사용

### 2. Fade In (유료, $80)
- Final Draft 호환
- 가성비 좋음
- macOS·Windows·Linux

### 3. Highland 2 (유료, $99)
- Mac 전용
- Markdown 기반 (Fountain)
- 깔끔·심플 UI

### 4. Fountain (오픈 표준, 무료)
- 텍스트 기반 시나리오 포맷
- Highland·Slugline·Trelby 호환
- Git 으로 버전 관리 가능

### 5. Trelby (무료, 오픈소스)
- Linux·Windows·Mac
- 기본 기능 OK

---

## B. humanizer 도구 (★ 한국어 자연스러움)

### 1. 자체 humanizer (소리 SKILL 내장)
- 번역투 검출·교정 (의·수동태·영어식 어순)
- rule-of-three 강박 검출
- 한글 발음 자연스러움 검증
- 캐릭터 일관성 검수

### 2. 외부 한국어 검수 (보조)
- 네이버 맞춤법 검사기
- 부산대 맞춤법 검사기
- 한글학회 자료

### 3. ★ 시나리오 메이커 프로그램 (자체 구현 예정)
- 소리 + 테오 협업
- humanizer 자체 모델
- 시나리오 입력·자동 저장·버전 관리
- 캐릭터·세계관·대사 관리
- IP별 폴더 분리

---

## C. AI 도구 (글쓰기 보조)

### 1. Claude (이 자체 = sunny-sori)
- 시나리오 초안·아이디어 발산
- 결과 = humanizer 검증 필수
- 인터페이스: `curl http://localhost:8190/api/agent-call`

### 2. ChatGPT / Gemini (보조)
- 영문 번역·아이디어
- 한국어 = Claude 우선

### 3. Perplexity (자료 조사)
- 사극 고증·시대 자료
- 글로벌 시장 자료

---

## D. 협업 도구

### 1. Drive (Sunny Team 공용)
- 위치: `/Users/sunny_sever/Library/CloudStorage/GoogleDrive-nextsunny@gmail.com/내 드라이브/SUNNY_TEAM/05_콘텐츠프로덕션/시나리오/`
- 시나리오 산출물 저장 (자동 동기화)
- IP별 하위 폴더

### 2. 루미 (콘텐츠 PD) 협업
- `curl http://localhost:8190/api/agent-call -d '{"aid":"lumi","message":"..."}'`
- 루미 = 기획·전체 흐름 / 소리 = 글쓰기 단독

### 3. 리안 (디자인) 협업
- 시나리오 → 비주얼 시안 의뢰 (visual-maker)
- 캐릭터 디자인·콘셉트 아트

### 4. 하나 (법무) 협업
- 시나리오 IP 라이선스·계약 검토

---

## E. 메모·아이디어·관리

### 1. Notion (유료/무료 mix)
- 캐릭터 데이터베이스
- 세계관·연표
- IP별 페이지

### 2. Obsidian (무료)
- 로컬 메모 + 그래프 뷰
- 양방향 링크 (캐릭터 ↔ 신 ↔ 테마)

### 3. Scrivener (유료, $50)
- 장편 소설·시나리오 관리
- 챕터·신·캐릭터·연구 자료 통합

---

## F. 검수 체크리스트 (자기 검증)

### 보고 전 = 매번 체크

#### 한국어 자연스러움
- [ ] 번역투 ("의" 반복·과한 수동태·영어식 어순) X
- [ ] rule-of-three 강박 X
- [ ] 한글 발음 자연스러움
- [ ] 어색한 어휘·문장 X

#### 캐릭터
- [ ] 캐릭터별 화법 차별
- [ ] 입버릇·표어 일관
- [ ] Want / Need 명확
- [ ] 캐릭터 아크 (시작 ↔ 끝 변화)

#### 구조
- [ ] 3막·5막·기승전결 중 선택 + 일관 적용
- [ ] Plot Point 정확 위치
- [ ] Subtext 활용 (직설 X)

#### 산출물
- [ ] Drive 절대 경로 명시
- [ ] 분량·시간 정직 보고
- [ ] 5 섹션 보고 형식 (작업 요약·한 일·진단·산출물·다음 액션)

---

## G. 학습 자료 (매주·매월)

### 작법서 (영문)
- McKee "Story"
- Syd Field "Screenplay"
- Blake Snyder "Save the Cat"
- Joseph Campbell "Hero with a Thousand Faces"

### 한국어 문체 (소설)
- 박완서·황석영·김애란·한강·정유정

### 한국 드라마 작가 인터뷰
- 김은희·박찬욱·봉준호 인터뷰·기사

### 매일·매주·매월 루틴
- 04_정보소스.md 참조
