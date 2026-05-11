import { Symbol } from "@/components/Symbol";

export const metadata = {
  title: "사용 가이드 — Story Maker",
};

/**
 * /guide — 작가 사용법 안내 페이지 (V2.11.2)
 *
 * 사장님 명시 옛: "매번 카톡으로 설명 = X = 영구 가이드 페이지로".
 *
 * 박힌 내용:
 * - 4단계 설치 가이드
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
    title: "더블클릭 = 끝",
    body: (
      <>
        받은 SetupExe 더블클릭 → <strong style={{ color: "var(--coral)" }}>Windows Defender 경고 시 "추가 정보 → 실행"</strong> 한 번 → "다음 다음 다음" 설치 완료.
        <br />
        시작 메뉴 + 바탕화면 단축키 자동 생성. 매번 단축키 더블클릭만.
      </>
    ),
  },
];

const FAQ = [
  {
    q: "Windows Defender가 경고를 띄우는데 안전한가요?",
    a: "네. 첫 출시 = unsigned (개발자 서명 X) 상태라 Windows가 경고를 띄웁니다. \"추가 정보 → 실행\" 한 번 클릭하면 통과되고, 이후엔 다시 묻지 않습니다. V2.12에서 Code Signing 인증서 적용 예정.",
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
    a: "V2.11.2 현재 = 수동 (= /download 페이지에서 새 버전 받음). V2.12부터 = 앱 시작 시 자동 알림 + 1클릭 설치 예정. /changelog 페이지에서 최신 버전 확인 가능.",
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
    a: "앱 우측 하단 💬 위젯 클릭 → 카테고리 선택(버그·기능·칭찬·질문·기타) → 메시지 보내기. 또는 = support@sunnytoon.com 이메일.",
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
    issue: "Windows Defender가 \"이 앱을 차단했습니다\" 띄움",
    fix: "\"추가 정보\" 텍스트 클릭 → \"실행\" 버튼. 한 번만 하면 됩니다.",
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

        {/* 문의 */}
        <section style={{ padding: "24px 28px", background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.2)", borderRadius: 12, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "var(--ink-1)", marginBottom: 8, fontWeight: 600 }}>
            해결되지 않으면?
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.65 }}>
            앱 우측 하단 💬 위젯 → 카테고리 선택 → 메시지
            <br />
            또는 = <a href="mailto:support@sunnytoon.com" style={{ color: "var(--coral)", textDecoration: "underline" }}>support@sunnytoon.com</a>
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
