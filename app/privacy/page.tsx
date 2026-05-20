import { Symbol } from "@/components/Symbol";

export const metadata = {
  title: "개인정보처리방침 — Story Maker",
};

const LAST_UPDATED = "2026-05-10";

export default function PrivacyPage() {
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

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "60px 32px", color: "var(--ink-1)", lineHeight: 1.75, fontSize: 15 }}>
        <div style={{ fontSize: 11, color: "var(--ink-5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          — PRIVACY POLICY
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          개인정보처리방침
        </h1>
        <div style={{ fontSize: 12, color: "var(--ink-5)", marginBottom: 40 }}>최종 갱신: {LAST_UPDATED}</div>

        <p>
          Story Maker (이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 서비스 이용 시 수집되는 개인정보의 항목, 이용 목적, 보유·이용 기간, 제3자 제공, 처리 위탁, 이용자 권리에 관한 사항을 규정합니다.
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>1. 수집하는 개인정보 항목</h2>
        <ul>
          <li><strong>회원가입 시</strong>: 이메일 주소, 비밀번호(암호화 저장), 이름(선택)</li>
          <li><strong>OAuth 로그인 시</strong>: Google에서 제공받는 이메일·이름·프로필 사진</li>
          <li><strong>서비스 이용 시</strong>: 작성한 작품 본문, 작가 노하우(학습 데이터), 사용 통계(접속 시간·기능 사용 빈도)</li>
          <li><strong>결제 시 (유료 플랜)</strong>: 결제 대행사(Stripe·Toss Payments)를 통해 처리하며, 본 서비스는 카드 번호 등을 직접 저장하지 않습니다.</li>
          <li><strong>자동 수집</strong>: 접속 IP, 브라우저 정보, 쿠키, 오류 로그</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>2. 이용 목적</h2>
        <ul>
          <li>서비스 제공 및 본인 확인</li>
          <li>작품 데이터 저장·동기화</li>
          <li>서비스 개선 및 신규 기능 개발</li>
          <li>오류 분석 및 보안 사고 대응</li>
          <li>법령상 의무 이행</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>3. 보유·이용 기간</h2>
        <p>
          회원 탈퇴 시 즉시 파기를 원칙으로 하며, 단 다음의 정보는 관계 법령에 따라 일정 기간 보관합니다.
        </p>
        <ul>
          <li>전자상거래 등에서의 소비자 보호에 관한 법률에 따른 거래 기록: 5년</li>
          <li>통신비밀보호법에 따른 접속 로그: 3개월</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>4. 처리 위탁</h2>
        <p>서비스 운영을 위해 다음 업체에 개인정보 처리를 위탁합니다.</p>
        <ul>
          <li><strong>Supabase Inc.</strong> — 회원 인증 및 데이터베이스 (AWS ap-northeast-2 리전)</li>
          <li><strong>Vercel Inc.</strong> — 웹 호스팅 및 배포</li>
          <li><strong>Anthropic, PBC</strong> — AI 응답 생성 (작가 본인 API 키 사용 시 작가↔Anthropic 직접 통신, 본 서비스 경유 X)</li>
          <li><strong>Resend, Inc.</strong> — 인증·알림 이메일 발송 (예정)</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>5. 작가 작품 데이터 처리</h2>
        <p>
          작가가 작성한 작품 본문과 학습 노하우는 본인 계정에 귀속되며, 본 서비스는 이를 학습 데이터로 사용하지 않습니다. AI 응답 생성을 위해 일시적으로 Anthropic에 전송되며, Anthropic의 정책에 따라 처리됩니다.
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>6. 이용자 권리</h2>
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>개인정보 열람·정정·삭제·처리 정지 요청</li>
          <li>회원 탈퇴 (Settings 페이지)</li>
          <li>작품 데이터 다운로드(이전성)</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>7. 보호 조치</h2>
        <ul>
          <li>비밀번호 단방향 암호화 저장</li>
          <li>HTTPS 전 구간 암호화 통신</li>
          <li>접근 권한 최소화 및 정기 점검</li>
          <li>개인정보 취급자 교육</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>8. 책임자</h2>
        <p>
          개인정보보호 책임자: 유희정 (Story Maker 운영자)<br />
          이메일: sunny@sunnyent.co.kr
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>9. 정책 변경</h2>
        <p>
          본 방침은 법령·서비스 정책 변경에 따라 갱신될 수 있으며, 변경 시 서비스 내 공지사항을 통해 안내드립니다. 중요한 변경의 경우 별도 동의를 요청드릴 수 있습니다.
        </p>

        <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--ink-5)" }}>
          <a href="/" style={{ color: "var(--ink-4)", textDecoration: "none" }}>← 홈으로</a>
          <span style={{ marginLeft: 16 }}>
            <a href="/terms" style={{ color: "var(--ink-4)", textDecoration: "none" }}>이용약관</a>
          </span>
        </div>
      </article>
    </main>
  );
}
