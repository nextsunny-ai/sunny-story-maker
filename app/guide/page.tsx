import { Symbol } from "@/components/Symbol";

export const metadata = {
  title: "사용 가이드 — Story Maker",
};

/**
 * /guide — 작가 사용법 안내 페이지 (V2.11.3)
 *
 * 사장님 명시 옛: "매번 카톡으로 설명 = X = 영구 가이드 페이지로".
 * 사장님 명시 2026-05-12: "Windows Defender 경고 = 작가 헤맴 = 안내 강화".
 *
 * 박힌 내용:
 * - 4단계 설치 가이드
 * - ★ Windows Defender 우회 전용 섹션 (= 단계별 + 시각화) ★
 * - FAQ 10개
 * - 트러블슈팅
 */

const STEPS = [
  {
    n: 1,
    title: "Claude Pro 구독 (한 번만)",
    body: (
      <>
        <a href="https://claude.ai/upgrade" target="_blank" rel="noreferrer" style={{ color: "var(--coral)", textDecoration: "underline" }}>
          claude.ai/upgrade
        </a>{" "}
        → Pro ($20/월) 또는 Max ($100/월) 구독.
        <br />
        <span style={{ fontSize: 13, color: "var(--ink-4)" }}>
          * Story Maker = 본인 Claude 구독으로 동작 = 추가 비용 0원. 작가별 본인 구독.
        </span>
      </>
    ),
  },
  {
    n: 2,
    title: "Claude Code 설치 + 본인 계정 로그인",
    body: (
      <>
        <a href="https://docs.anthropic.com/en/docs/claude-code/quickstart" target="_blank" rel="noreferrer" style={{ color: "var(--coral)", textDecoration: "underline" }}>
          Claude Code Quickstart
        </a>{" "}
        → 설치 + 평소 쓰는 Claude 계정으로 로그인.
        <br />
        <span style={{ fontSize: 13, color: "var(--ink-4)" }}>
          * Story Maker가 본인 PC의 Claude Code OAuth 토큰을 빌려서 = AI 호출.
        </span>
      </>
    ),
  },
  {
    n: 3,
    title: "Story Maker 가입 + 다운로드",
    body: (
      <>
        <a href="https://story.sunnytoon.com/login" style={{ color: "var(--coral)", textDecoration: "underline" }}>
          story.sunnytoon.com
        </a>{" "}
        → Google 또는 이메일 가입 (약관 동의) → <a href="/download" style={{ color: "var(--coral)", textDecoration: "underline" }}>다운로드 페이지</a>에서 "Windows 데스크탑 앱 (.exe)" 받기 (4.5MB).
      </>
    ),
  },
  {
    n: 4,
    title: "더블클릭 → Windows 경고 → 실행 → 설치 완료",
    body: (
      <>
        받은 setup.exe 더블클릭 → <strong style={{ color: "var(--coral)" }}>Windows Defender 경고 뜸 (★ 정상 ★)</strong> → 아래 "Windows Defender 경고 안내" 섹션 따라 "추가 정보 → 실행" 한 번 → "다음 다음 다음" 설치.
        <br />
        시작 메뉴 + 바탕화면 단축키 자동 생성. 매번 단축키 더블클릭만.
      </>
    ),
  },
];

const FAQ = [
  {
    q: "Windows Defender 경고가 뜨는데 안전한가요? 바이러스 아닌가요?",
    a: "★ 정상이고 안전합니다 ★. Story Maker는 바이러스가 아닙니다. Windows Defender(SmartScreen)는 \"인터넷에서 받은 모든 새 앱\"에 처음 한 번 경고를 띄우는 기본 보안 기능입니다. \"새로 만든 앱 = 아직 많은 사람이 안 써본 앱\" = Microsoft가 \"신뢰도 데이터\"를 모으는 동안 띄우는 표준 안내입니다. 가이드 페이지 \"Windows Defender 경고 안내\" 섹션 따라 \"추가 정보 → 실행\" 한 번 클릭하면 통과되고, 이후엔 다시 묻지 않습니다.",
  },
  {
    q: "API 비용이 정말 0원인가요?",
    a: "네. Claude Pro/Max 구독($20/월부터)에 포함된 사용량으로 동작합니다. Story Maker가 따로 청구하지 않습니다. (웹 버전은 Settings에 본인 API 키 등록 시 = 종량제로 본인 카드 청구)",
  },
  {
    q: "Mac에서도 쓸 수 있나요?",
    a: "Mac 데스크탑 앱은 V2.12 출시 예정 (Apple Developer 인증 필요). 현재 Mac 사용자는 = 다운로드 페이지의 \"Mac 자동 설치 ZIP\" 옵션 사용 가능 (Node.js + Claude Code 자동 설치).",
  },
  {
    q: "iOS·Android는 언제 나오나요?",
    a: "V2.13~14 출시 예정. App Store + Google Play 심사 통과 후. 현재 = Windows 데스크탑 앱이 가장 안정적.",
  },
  {
    q: "작품 데이터는 어디 저장되나요?",
    a: "Supabase 클라우드(AWS ap-northeast-2 한국 리전)에 본인 계정으로 자동 저장. 어떤 PC에서 로그인해도 동일하게 이어쓰기 가능. 본인만 접근 가능 (Row Level Security).",
  },
  {
    q: "업데이트는 어떻게 받나요?",
    a: "V2.11.x 현재 = 수동 (= /download 페이지에서 새 버전 받음). V2.12부터 = 앱 시작 시 자동 알림 + 1클릭 설치 예정. /changelog 페이지에서 최신 버전 확인 가능.",
  },
  {
    q: "작법 노하우는 자동 업데이트되나요?",
    a: "네. 매주 한 번 사장님 큐레이션 + GitHub 자료 검색을 통해 작법 노하우가 자동 갱신되고, 다음 사용 시 자동 적용됩니다. (앱 자체 업데이트 없이 = 노하우만 최신 유지)",
  },
  {
    q: "유료로 전환되면 어떻게 되나요?",
    a: "현재 = 베타 = 30일 무료 trial 자동 발급. 유료 전환 시 = 결제하지 않으면 (= 다음 라이선스 갱신 시) 사용 제한. 결제 = Stripe·Toss Payments(예정) = V2.13 출시.",
  },
  {
    q: "피드백·버그 신고는 어떻게 하나요?",
    a: "앱 우측 하단 💬 위젯 클릭 → 카테고리 선택(버그·기능·칭찬·질문·기타) → 메시지 보내기. 또는 = sunny@sunnyent.co.kr 이메일.",
  },
  {
    q: "다른 PC에서도 같은 작품 이어쓸 수 있나요?",
    a: "네. 같은 계정으로 로그인하면 = 작품 데이터 + 작가 노하우가 자동 동기화됩니다. 단, 새 PC에서도 Claude Pro 구독·Claude Code 설치 + 본인 계정 로그인은 필요.",
  },
];

const TROUBLESHOOTING = [
  {
    issue: "앱 실행 시 \"OAuth 토큰 없음\" 또는 \"Claude /login\" 메시지",
    fix: "Claude Code가 설치되지 않았거나 본인 계정으로 로그인되지 않은 상태. 터미널에서 `claude /login` 실행 후 본인 계정 로그인. 그 다음 Story Maker 재시작.",
  },
  {
    issue: "Windows Defender \"PC 보호\" 빨간 화면이 뜸",
    fix: "정상입니다. 아래 \"Windows Defender 경고 안내\" 섹션의 3단계를 그대로 따라하시면 됩니다. 한 번만 하면 다시 안 뜹니다.",
  },
  {
    issue: "분당 토큰 한도 초과 (429 에러)",
    fix: "Claude Pro/Max 구독의 분당 한도 초과. 1~2분 기다린 후 다시 시도. 또는 = 본문 길이를 줄이거나 = 빠른 모드(Haiku) 사용.",
  },
  {
    issue: "AI 응답이 이상하게 \"일반 클로드\"처럼 나옴 (스토리 전문성 X)",
    fix: "앱 재시작 → 최신 버전으로 업데이트 (V2.11.2부터 fix됨). /changelog 확인.",
  },
];

// ★ Windows Defender 경고 안내 = 단계별 시각화 (SVG mock-up) ★
const DEFENDER_STEPS = [
  {
    n: 1,
    title: "빨간 화면이 뜹니다 (= 정상)",
    desc: "setup.exe 더블클릭 시 = 아래 화면이 자동으로 뜹니다. Story Maker는 안전한 앱이지만 Windows Defender는 \"새 앱 = 일단 경고\"하는 표준 보안 절차로 처리합니다.",
    mockup: "redScreen",
  },
  {
    n: 2,
    title: "왼쪽 아래 \"추가 정보\" 텍스트 클릭",
    desc: "화면 왼쪽 아래 작은 글씨로 \"추가 정보\"가 있습니다. 그걸 클릭하세요. (\"실행 안 함\" 버튼이 옆에 있는데 그건 누르지 마세요)",
    mockup: "clickMoreInfo",
  },
  {
    n: 3,
    title: "나타난 \"실행\" 버튼 클릭 → 설치 진행",
    desc: "\"추가 정보\" 클릭하면 = 회색 \"실행\" 버튼이 화면 아래쪽에 나타납니다. 그걸 클릭하면 = 정상 설치 시작. \"다음 다음 다음\" 누르면 끝.",
    mockup: "clickRun",
  },
];

// 화면 mock-up (SVG)
function MockupRedScreen() {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, border: "1px solid var(--line)", borderRadius: 8, display: "block" }}>
      <rect width="320" height="200" fill="#A0185F" />
      <rect x="280" y="10" width="22" height="22" fill="none" stroke="#fff" strokeWidth="1.5" />
      <text x="285" y="26" fontSize="14" fill="#fff" fontFamily="sans-serif">×</text>
      <text x="20" y="50" fontSize="20" fontWeight="700" fill="#fff" fontFamily="sans-serif">Windows의 PC 보호</text>
      <text x="20" y="80" fontSize="11" fill="#fff" fontFamily="sans-serif">Microsoft Defender SmartScreen에서</text>
      <text x="20" y="96" fontSize="11" fill="#fff" fontFamily="sans-serif">인식할 수 없는 앱의 시작을 차단했습니다.</text>
      <text x="20" y="112" fontSize="11" fill="#fff" fontFamily="sans-serif">PC가 위험에 노출될 수 있습니다.</text>
      <text x="20" y="148" fontSize="13" fill="#fff" fontFamily="sans-serif" textDecoration="underline" fontWeight="700">추가 정보</text>
      <circle cx="60" cy="143" r="22" fill="none" stroke="#FFD700" strokeWidth="2.5" />
      <path d="M 80 140 L 95 138" stroke="#FFD700" strokeWidth="2" fill="none" markerEnd="url(#arrow1)" />
      <defs>
        <marker id="arrow1" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#FFD700" />
        </marker>
      </defs>
      <text x="100" y="142" fontSize="11" fill="#FFD700" fontFamily="sans-serif" fontWeight="700">여기 클릭</text>
    </svg>
  );
}

function MockupClickMoreInfo() {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, border: "1px solid var(--line)", borderRadius: 8, display: "block" }}>
      <rect width="320" height="200" fill="#A0185F" />
      <text x="20" y="50" fontSize="20" fontWeight="700" fill="#fff" fontFamily="sans-serif">Windows의 PC 보호</text>
      <text x="20" y="78" fontSize="10" fill="#fff" fontFamily="sans-serif">Microsoft Defender SmartScreen에서</text>
      <text x="20" y="92" fontSize="10" fill="#fff" fontFamily="sans-serif">인식할 수 없는 앱의 시작을 차단했습니다.</text>
      <text x="20" y="120" fontSize="10" fill="#fff" fontFamily="sans-serif">앱: SUNNY Story Maker_2.11.0_x64-setup.exe</text>
      <text x="20" y="134" fontSize="10" fill="#fff" fontFamily="sans-serif">게시자: 알 수 없는 게시자</text>
      <rect x="80" y="158" width="70" height="26" fill="#fff" rx="2" />
      <text x="92" y="176" fontSize="12" fill="#A0185F" fontFamily="sans-serif" fontWeight="700">실행</text>
      <rect x="160" y="158" width="120" height="26" fill="none" stroke="#fff" strokeWidth="1.5" rx="2" />
      <text x="170" y="176" fontSize="12" fill="#fff" fontFamily="sans-serif">실행 안 함</text>
      <circle cx="115" cy="171" r="22" fill="none" stroke="#FFD700" strokeWidth="3" />
      <path d="M 138 171 L 150 171" stroke="#FFD700" strokeWidth="2.5" fill="none" markerEnd="url(#arrow2)" />
      <defs>
        <marker id="arrow2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#FFD700" />
        </marker>
      </defs>
      <text x="100" y="200" fontSize="11" fill="#FFD700" fontFamily="sans-serif" fontWeight="700" style={{ display: "none" }}>여기 클릭</text>
    </svg>
  );
}

function MockupClickRun() {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 360, border: "1px solid var(--line)", borderRadius: 8, display: "block" }}>
      <rect width="320" height="200" fill="#fff" stroke="#888" strokeWidth="1" />
      <rect x="0" y="0" width="320" height="28" fill="#0078D4" />
      <text x="14" y="20" fontSize="13" fill="#fff" fontFamily="sans-serif">Story Maker 설치 마법사</text>
      <text x="40" y="80" fontSize="14" fill="#222" fontFamily="sans-serif" fontWeight="600">Story Maker 설치를 시작합니다</text>
      <text x="40" y="110" fontSize="11" fill="#666" fontFamily="sans-serif">설치 위치: C:\Program Files\SUNNY Story Maker</text>
      <text x="40" y="128" fontSize="11" fill="#666" fontFamily="sans-serif">필요 공간: 약 50MB</text>
      <rect x="200" y="155" width="50" height="26" fill="#0078D4" rx="2" />
      <text x="208" y="173" fontSize="12" fill="#fff" fontFamily="sans-serif" fontWeight="600">다음 →</text>
      <rect x="255" y="155" width="50" height="26" fill="none" stroke="#0078D4" strokeWidth="1.5" rx="2" />
      <text x="265" y="173" fontSize="12" fill="#0078D4" fontFamily="sans-serif">취소</text>
      <text x="40" y="185" fontSize="10" fill="#0a7" fontFamily="sans-serif" fontWeight="700">★ 정상 설치 화면 = 이걸 보면 = 성공 ★</text>
    </svg>
  );
}

export default function GuidePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--line)" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--ink)" }}>
          <span style={{ width: 28, height: 28, color: "var(--ink)" }}><Symbol size={28} /></span>
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, fontWeight: 500 }}>
            Story Maker<span style={{ color: "var(--coral)" }}>.</span>
          </span>
        </a>
      </header>

      <article style={{ maxWidth: 800, margin: "0 auto", padding: "60px 32px", color: "var(--ink-1)" }}>
        <div style={{ fontSize: 11, color: "var(--ink-5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          — USER GUIDE
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
          시작하기<span style={{ color: "var(--coral)" }}>.</span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 48 }}>
          Claude Pro/Max 구독 ($20/월부터)만 있으면 = 본인 PC에서 = 추가 비용 0원으로 무제한 사용.
          <br />
          첫 설치 = 3분. 이후 = 바탕화면 단축키 더블클릭만.
        </p>

        {/* 4단계 설치 */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, margin: "0 0 24px", letterSpacing: "-0.015em" }}>
            설치 4단계
          </h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            {STEPS.map((step) => (
              <li key={step.n} style={{ display: "flex", gap: 18, padding: "18px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 12 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--coral, #ff6b6b)", lineHeight: 1, minWidth: 36 }}>
                  {step.n}
                </span>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.65 }}>
                    {step.body}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ★★★ Windows Defender 경고 안내 (전용 섹션) ★★★ */}
        <section
          id="defender-guide"
          style={{
            marginBottom: 60,
            padding: "32px 28px",
            background: "linear-gradient(180deg, rgba(160, 24, 95, 0.04), rgba(160, 24, 95, 0.02))",
            border: "2px solid rgba(160, 24, 95, 0.18)",
            borderRadius: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>🛡️</span>
            <span style={{ fontSize: 11, color: "#A0185F", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
              Windows Defender 경고가 떴을 때
            </span>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, margin: "0 0 12px", letterSpacing: "-0.015em" }}>
            정상이에요. 3단계만 따라하세요<span style={{ color: "var(--coral)" }}>.</span>
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.75, marginBottom: 28 }}>
            <strong>Story Maker는 안전한 앱입니다.</strong> Windows Defender(SmartScreen)는 <em>인터넷에서 받은 모든 새 앱</em>에 대해 "처음 한 번" 경고를 띄우는 보안 기능입니다. 새로 만든 앱은 Microsoft가 "신뢰도 데이터"를 모으는 동안 = 표준 경고가 뜹니다. <strong style={{ color: "#A0185F" }}>한 번만</strong> 아래 3단계를 따라하시면 = 다시는 안 뜹니다.
          </p>

          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 24 }}>
            {DEFENDER_STEPS.map((step) => (
              <li
                key={step.n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 360px",
                  gap: 24,
                  alignItems: "start",
                  padding: "20px 22px",
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 500, color: "#A0185F", lineHeight: 1 }}>
                      {step.n}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{step.title}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
                </div>
                <div>
                  {step.mockup === "redScreen" && <MockupRedScreen />}
                  {step.mockup === "clickMoreInfo" && <MockupClickMoreInfo />}
                  {step.mockup === "clickRun" && <MockupClickRun />}
                </div>
              </li>
            ))}
          </ol>

          <div style={{ marginTop: 24, padding: "16px 20px", background: "rgba(10, 119, 80, 0.06)", border: "1px solid rgba(10, 119, 80, 0.2)", borderRadius: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0a7750", marginBottom: 4 }}>✓ 설치 완료 후</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65 }}>
              시작 메뉴와 바탕화면에 "SUNNY Story Maker" 단축키가 자동 생성됩니다. 이후엔 그 단축키 더블클릭만 하면 = 바로 실행. Defender 경고는 다시 뜨지 않습니다.
            </div>
          </div>

          <details style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, padding: "8px 0" }}>왜 이 경고가 뜨는지 더 자세히</summary>
            <div style={{ padding: "8px 0 0 16px", lineHeight: 1.7 }}>
              Windows의 보안 기능 "SmartScreen Reputation"은 = 새 앱에 대해 "수만 명이 다운로드해서 안전 확인이 끝났는지"를 기준으로 = 경고 여부를 결정합니다. Story Maker는 갓 만들어진 신생 앱이라 = 아직 그 데이터가 누적되지 않은 상태입니다. 사용자가 늘면 자동으로 경고가 사라집니다 (Microsoft 자동 처리). 또는 = 추후 정식 Code Signing 인증서를 적용하면 = 즉시 경고가 사라집니다 (V2.12 검토).
            </div>
          </details>
        </section>

        {/* ★ V3.0 신기능 안내 (V3.1에서 추가) */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
            V3.0 신기능<span style={{ color: "var(--coral)" }}>.</span>
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 18 }}>
            본문 모델 재설계 + 16매체별 양식 틀 + 인라인 수정 + 채팅 정밀 patch.
          </p>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>📝 매체별 본문 캔버스</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                시나리오 = S#·INT./EXT.·캐릭터 대사 / 웹툰 = 컷 카드 / 큐시트 = 진짜 표 / 소설 = 회차·장 / 전시 = Zone / 게임 = 대사 데이터 표.
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>✏️ 대사 인라인 수정</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                캐릭터·대사 클릭 = 그 자리에서 바로 편집 (ContentEditable). Esc = 취소, Enter = 확정.
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>📥 채팅 → 본문 정밀 적용</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                AI가 본문 수정·추가 제안 = <strong>[📥 N번째 수정]</strong> 버튼 1클릭 = 정확히 그 위치만. 작가가 다시 손볼 필요 X.
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>🔄 매체 변경 시 텍스트 보존</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                옛 작품 무손실 마이그레이션. 영화 → 웹툰 전환해도 본문 그대로.
              </div>
            </div>
          </div>
        </section>

        {/* ★ V3.1.1 — 작가 사용 흐름 (= 메뉴 순서) */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
            작가 사용 흐름<span style={{ color: "var(--coral)" }}>.</span>
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 18 }}>
            왼쪽 사이드바 메뉴 = 작가 작업 순서 그대로. 처음부터 끝까지 = 한 작품 끝낼 수 있게 박힘.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>① 시작 — 홈 / 📂 프로젝트 열기</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                <strong>홈</strong>: 새 작품 시작 (매체 선택 → 의뢰서 또는 빈 작업실). <strong>📂 프로젝트 열기</strong>: 옛 .smkr 파일 가져오기 (= 카톡·메일·USB로 받은 작품). 같은 PC 옛 작품 = <strong>내 작품</strong>에서 1클릭.
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>② 만들기 — 기획 / 본문 쓰기 / 매체 변환</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                <strong>기획</strong>: 트리트먼트·시놉시스·캐릭터 등 사전 자료. <strong>본문 쓰기</strong>: 실제 시나리오 본문 (= ★ 가장 많이 쓰는 메뉴). 옛 작품 = <strong>📥 원고 가져오기</strong>로 통째 박고 이어쓰기. <strong>매체 변환</strong>: 영화 → 웹툰 등 또는 같은 매체 다시 쓰기 (v2·v3).
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>③ 다듬기 — AI 검토 / 자유 채팅</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                <strong>AI 검토</strong>: 30년 CD·전문가 페르소나 AI가 본문 평가·피드백. <strong>자유 채팅</strong>: 본문 외 = AI에게 질문·아이디어 브레인스토밍 (= 가벼운 단독 대화 = 토큰 적게).
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>④ 자료 — 내 작품 / 참고 자료</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                <strong>내 작품</strong>: 옛 작품 목록 (localStorage·Supabase 자동 저장). 1클릭 = 본문·인물 노트·history 그대로. <strong>참고 자료</strong>: 작법서·매체별 양식 가이드 등.
              </div>
            </div>
          </div>
        </section>

        {/* ★ V3.1.1 — 현실적 작업 가이드라인 (대표님 명시) */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
            ★ 작업 가능 범위 — 현실적 가이드라인<span style={{ color: "var(--coral)" }}>.</span>
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 18 }}>
            AI는 = 한 번에 = 너무 큰 작업 X (= 출력 한도 + 작가 Pro 구독 5시간 한도). 그래도 = 단계별로 = 한 작품 끝까지 만들 수 있게 설계. 아래 권장 단위 따르면 = 토큰 막힘 X.
          </p>

          <div style={{ display: "grid", gap: 14 }}>
            {/* 본문 쓰기 — 자동 처리 강조 */}
            <div style={{ padding: "18px 22px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 10 }}>📝 본문 쓰기 (Write)</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                ✅ <strong>옛 시나리오 = 📥 원고 가져오기로 통째 박기.</strong> 큰 시나리오 (영화 1편 등) = 자동 5구간 발췌 (앞·1/4·중반·3/4·결말) = 작가가 신경 쓸 부분 X.<br />
                ✅ <strong>AI가 알아서 한 단위씩 출력 + 자동 멈춤</strong> = 작가가 매번 분량 지정 X. 자연 발화 = 자연 작업 흐름.<br />
                ★ <strong>자연 발화 예시</strong>: "1막 1씬부터 써줘" / "다음 씬 이어줘" / "이 분위기로 더" / "이 씬 다시 써줘"
              </div>
            </div>

            {/* 매체 변환 — 풀 컨텍스트 + 자동 처리 */}
            <div style={{ padding: "18px 22px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 10 }}>🔄 매체 변환 (Adapt)</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                ✅ <strong>★ 풀 컨텍스트 보장</strong> = 각색은 캐릭터·복선·톤·디테일 다 봐야 정확. 다른 작업(쓰기·검토)보다 = 자동 발췌 한도 2배 (40K자 = 영화 1편 평균 거의 다 분석). 5구간 발췌 (앞·1/4·중반·3/4·결말) = 발단·전개·위기·절정·결말 다 보존.<br />
                ✅ 영화 → 웹툰·드라마·숏폼 등 어떤 매체로도 변환. <strong>AI가 알아서 1 단위씩</strong> 변환 = 작가는 자연 발화. "영화 → 웹툰으로" → AI가 1화부터 출력 → "다음 이어줘" 누적.<br />
                ⚠️ 8만자+ 거대 본문 = 일부 디테일 누락 가능. V3.2에서 = "2단계 path" (원본 분석 → 변환) 본격 박힐 예정.<br />
                ★ <strong>자연 발화 예시</strong>: "이 영화를 웹툰으로" / "이 분위기로 다음 회" / "더 짧게" / "더 강한 후크"
              </div>
            </div>

            {/* AI 검토 */}
            <div style={{ padding: "18px 22px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 10 }}>🔍 AI 검토 (Review)</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                ✅ 본문 단락·씬 별 정밀 검토 (= humanizer + 한국 시나리오 표준 체크). 30년 CD 페르소나.<br />
                ✅ 큰 본문 = 자동 5구간 발췌 검토 (= 핵심 다 다룸).<br />
                ★ <strong>자연 발화 예시</strong>: "3번 단락 평가해줘" / "이 씬에서 캐릭터 화법 차별 됐어?" / "AI 티 나는 부분 짚어줘"
              </div>
            </div>

            {/* 자료 가져오기 */}
            <div style={{ padding: "18px 22px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 10 }}>📂 자료 가져오기 (= 본문·기획안 업로드)</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                ✅ <strong>지원 포맷</strong>: PDF · 워드(.docx) · 한글 신버전(.hwpx) · 텍스트(.txt·.md·.fountain).<br />
                ✅ <strong>크기 4.5MB 이내</strong>는 = 통째 박으면 됨. 큰 시나리오도 = 자동 5구간 발췌로 핵심 다 보존.<br />
                ❌ <strong>비지원 포맷</strong>: 옛 워드(.doc) → .docx로 변환 / 옛 한글(.hwp) → .hwpx 또는 PDF로 변환.<br />
                ⚠️ <strong>4.5MB 초과 또는 스캔 PDF</strong>: 친절 안내 자동 표시 = "본문만 복사 → 텍스트 칸에 붙여넣기 권장" (= 크기 제한 X).<br />
                ⚠️ <strong>이미지 많은 PDF</strong>: 텍스트만 자동 추출. 스캔된 PDF (= OCR 필요) = OCR 도구로 텍스트 변환 후 박기.
              </div>
            </div>

            {/* 한도 도달 시 */}
            <div style={{ padding: "18px 22px", background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.2)", borderRadius: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-1)", marginBottom: 10 }}>⏱ 한도 도달 시 — 자동 처리됨</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                ✅ <strong>자동 Haiku 전환</strong>: 작가 Pro 구독 5시간 한도 도달 시 = AI가 자동으로 Haiku 모델로 전환 = <strong>작업 끊김 X</strong> (quality 약간 낮음, 작업 계속 가능).<br />
                ✅ <strong>5시간 후 자동 회복</strong>: 한도 = 자동 갱신 = 다시 Opus·Sonnet 풀 quality.<br />
                ✅ <strong>토스트 알림</strong>: 작가가 알 수 있게 = 화면 상단 토스트 자동 표시.
              </div>
            </div>
          </div>
        </section>

        {/* ★ V3.1 — 작가 ↔ AI 교대 쓰기 흐름 (대표님 명시 강조) */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
            작가 ↔ AI 교대 쓰기<span style={{ color: "var(--coral)" }}>.</span>
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 18 }}>
            "작가가 쓰는 종이, AI는 옆에서 거드는 것" — 작가가 쓰다가 AI가 이어쓰고, AI가 쓰다가 작가가 이어받는 흐름. 모든 단락 = 작가·AI 누구든 쓸 수 있습니다.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: "16px 20px", background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.2)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>⓪ 옛 시나리오 가져오기 (옵션 — 이미 쓰던 원고 있으면)</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                Write 페이지 헤더 <strong>📥 원고 가져오기</strong> 버튼 → 워드·한글·PDF·텍스트·Fountain 업로드, 또는 텍스트 붙여넣기 = 본문에 자동 반영. 시나리오 양식 자동 감지(S#·캐릭터·대사) = 단락 자동 분할. 빈 작업실 = 자동 노출, 본문 있어도 헤더에서 언제든 다시 켜기.
                <br />
                <strong>옛 작품 다시 열기</strong> = 사이드바 <strong>📂 프로젝트 열기</strong> (.smkr) 또는 <strong>My Works</strong> 목록에서 클릭 = 본문·인물 노트·history 그대로.
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>① 빈 작업실 = 작가가 먼저</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                새 작품 = AI가 먼저 안 씁니다. 첫 단락 클릭 → <strong>✍️ 직접 쓰기</strong> 버튼 = textarea 열림 = 작가가 타이핑 → <strong>✓ 저장</strong>. 또는 = 우측 채팅에 "시작해줘"·"1막 써줘" = AI가 첫 단락부터 씁니다.
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>② AI가 쓰는 중 = 작가가 끼어들기</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                AI가 본문을 써내려가는 중 = 상단 <strong>🛑 중지</strong> 버튼 = 즉시 멈춤. 그 단락이 done으로 박힘 → <strong>✎ 수정</strong> 액션 = 작가가 그 자리에서 이어쓰기·수정·다시 쓰기.
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>③ 작가가 쓴 다음 = AI에게 이어쓰기 부탁</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                작가 단락 끝의 <strong>+ 더 쓰기</strong> 버튼 = 빈 단락 추가 = 우측 채팅에 "이어 써줘" 또는 = "이 분위기로 다음 씬" = AI가 이어쓰기. 빈 단락 = <strong>✍️ 직접 쓰기</strong>로 작가가 또 직접 쓸 수도 있음.
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>④ AI가 쓴 단락 = 작가가 다듬기</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                AI가 쓴 단락마다 4개 액션: <strong>↻ 다시 써</strong> (AI에게 재요청) · <strong>✎ 수정</strong> (작가 직접 편집) · <strong>📋 복사</strong> · <strong>+ 더 쓰기</strong>. 자유롭게 섞어서.
              </div>
            </div>
            <div style={{ padding: "16px 20px", background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.2)", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--coral-deep, #c84738)", marginBottom: 6 }}>💡 정확한 위치 수정 (채팅 패치)</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
                "3번 단락 다시 써", "두 번째 컷 SFX 빼" = AI 응답 끝에 <strong>[📥 N번째 수정]</strong> 버튼이 자동 생김 = 1클릭으로 그 위치만 정확히 교체.
              </div>
            </div>
          </div>
        </section>

        {/* ★ V3.1 지원사업 신청서 섹션 = 토큰 한계로 V3.2 보류 (대표님 명시 2026-05-20).
            옛 인프라는 보존 (글로벌 룰 17). 작가 안내만 제거. */}

        {/* ★ 단축키 + 자동 백업 위치 (V3.1) */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
            단축키 & 자동 백업<span style={{ color: "var(--coral)" }}>.</span>
          </h2>
          <div style={{ padding: "16px 20px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--ink-1)" }}>⌨️ 키보드 단축키</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: 13, color: "var(--ink-2)" }}>
              <kbd style={{ padding: "2px 8px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>Ctrl+S</kbd>
              <span>수동 저장 (자동저장과 별개) — 💾 저장됨 토스트 알림</span>
              <kbd style={{ padding: "2px 8px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>Ctrl+F</kbd>
              <span>본문 찾기 (단어·구절 검색)</span>
              <kbd style={{ padding: "2px 8px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>Ctrl+H</kbd>
              <span>본문 바꾸기 (검색 + 모두 바꾸기)</span>
              <kbd style={{ padding: "2px 8px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>Ctrl+D</kbd>
              <span>본문 다운로드 (.docx)</span>
              <kbd style={{ padding: "2px 8px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>Ctrl+B</kbd>
              <span>오른쪽 채팅 워크북 토글</span>
              <kbd style={{ padding: "2px 8px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>Ctrl+Z / Ctrl+Y</kbd>
              <span>단락 차원 되돌리기·다시 하기</span>
              <kbd style={{ padding: "2px 8px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>Esc</kbd>
              <span>현재 편집·모달 취소·blur</span>
            </div>
          </div>
          <div style={{ padding: "16px 20px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--ink-1)" }}>💾 자동 백업 (데스크탑 앱)</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
              매 60초마다 본문이 바뀌면 = <code style={{ padding: "1px 6px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>~/Documents/StoryMaker/{"{"}작품명{"}"}/</code>에 .docx 자동 저장.
              <br />
              작품당 최근 50개 보존. 옛 거 = <code style={{ padding: "1px 6px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "monospace", fontSize: 12 }}>_archive/</code> 자동 이동 (= 삭제 X).
              <br />
              <span style={{ fontSize: 12, color: "var(--ink-4)" }}>* 웹 = localStorage + Supabase 자동저장. 데스크탑 = 추가로 PC 폴더에도.</span>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, margin: "0 0 24px", letterSpacing: "-0.015em" }}>
            자주 묻는 질문 (FAQ)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {FAQ.map((item, i) => (
              <details key={i} style={{ padding: "14px 18px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 10 }}>
                <summary style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink-1)", cursor: "pointer", listStyle: "none", outline: "none" }}>
                  <span style={{ color: "var(--coral, #ff6b6b)", marginRight: 8 }}>Q.</span>
                  {item.q}
                </summary>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.7, marginTop: 12, paddingLeft: 20 }}>
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* 트러블슈팅 */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, margin: "0 0 24px", letterSpacing: "-0.015em" }}>
            트러블슈팅
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TROUBLESHOOTING.map((item, i) => (
              <div key={i} style={{ padding: "14px 18px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--coral, #ff6b6b)", marginBottom: 6 }}>
                  ⚠️ {item.issue}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.65 }}>
                  → {item.fix}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 문의 — 2026-05-20 대표님 명시: sunny@sunnyent.co.kr */}
        <section style={{ padding: "24px 28px", background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.2)", borderRadius: 12, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "var(--ink-1)", marginBottom: 8, fontWeight: 600 }}>
            개선 제안·컴플레인·질문
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.7 }}>
            앱 우측 하단 <strong>💬 위젯</strong> → 카테고리 선택 → 메시지<br />
            또는 = <a href="mailto:sunny@sunnyent.co.kr" style={{ color: "var(--coral)", textDecoration: "underline", fontWeight: 600 }}>sunny@sunnyent.co.kr</a> 직접 메일<br />
            <span style={{ fontSize: 11.5, color: "var(--ink-4)", display: "inline-block", marginTop: 6 }}>
              답신 = 가입하신 이메일로 직접 회신드립니다.
            </span>
          </div>
        </section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--ink-5)", textAlign: "center" }}>
          <a href="/" style={{ color: "var(--ink-4)", textDecoration: "none", marginRight: 16 }}>← 홈으로</a>
          <a href="/download" style={{ color: "var(--ink-4)", textDecoration: "none", marginRight: 16 }}>다운로드</a>
          <a href="/changelog" style={{ color: "var(--ink-4)", textDecoration: "none", marginRight: 16 }}>변경 이력</a>
          <a href="/status" style={{ color: "var(--ink-4)", textDecoration: "none" }}>서비스 상태</a>
        </div>
      </article>
    </main>
  );
}
