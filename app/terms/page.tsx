import { Symbol } from "@/components/Symbol";

export const metadata = {
  title: "서비스 이용약관 — Story Maker",
};

const LAST_UPDATED = "2026-05-10";

export default function TermsPage() {
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
          — TERMS OF SERVICE
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          서비스 이용약관
        </h1>
        <div style={{ fontSize: 12, color: "var(--ink-5)", marginBottom: 40 }}>최종 갱신: {LAST_UPDATED}</div>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제1조 (목적)</h2>
        <p>
          본 약관은 Story Maker (이하 &ldquo;서비스&rdquo;)가 제공하는 인터넷 기반 시나리오 작성 보조 서비스의 이용 조건과 절차, 회사와 회원의 권리·의무·책임 사항을 규정합니다.
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제2조 (정의)</h2>
        <ul>
          <li><strong>회원</strong>: 본 약관에 동의하고 서비스에 가입한 자</li>
          <li><strong>BYOK (Bring Your Own Key)</strong>: 회원이 본인의 Anthropic API 키 또는 Claude Pro/Max 구독을 통해 서비스를 이용하는 방식</li>
          <li><strong>데스크탑 버전</strong>: 회원의 PC에 설치되어 본인의 Claude 구독으로 동작하는 응용 프로그램</li>
          <li><strong>웹 버전</strong>: 브라우저로 접속하여 본인 API 키로 사용하는 버전</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제3조 (이용료 및 결제)</h2>
        <p>
          본 서비스는 BYOK 모델을 채택하며, AI 응답 생성에 따른 비용은 회원 본인이 Anthropic 또는 Claude 구독을 통해 직접 부담합니다.
        </p>
        <ul>
          <li>데스크탑 버전: Claude Pro/Max 구독 ($20~$200/월) 보유 시 추가 비용 없이 무제한 사용 가능</li>
          <li>웹 버전: 본인의 Anthropic API 키 등록 후 사용량에 따라 Anthropic에서 직접 청구</li>
          <li>Story Maker 서비스 자체 이용료(향후 도입 가능): 별도 공지 후 적용</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제4조 (회원의 의무)</h2>
        <ul>
          <li>본인의 정확한 정보를 제공하고 유지</li>
          <li>계정 정보를 타인과 공유하지 않음</li>
          <li>저작권·명예훼손 등 타인의 권리를 침해하는 콘텐츠를 생성하지 않음</li>
          <li>서비스를 자동화 봇·크롤링·과도한 요청 등 비정상적 방법으로 이용하지 않음</li>
          <li>서비스의 보안 취약점을 발견 시 책임자에게 신고하고 악용하지 않음</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제5조 (저작권 및 콘텐츠)</h2>
        <ul>
          <li>회원이 작성한 시나리오·작품 본문에 대한 저작권은 회원에게 귀속됩니다.</li>
          <li>서비스는 회원의 작품을 학습 데이터로 사용하지 않습니다.</li>
          <li>AI 응답으로 생성된 콘텐츠의 저작권 귀속은 Anthropic의 정책 및 관련 법령을 따르며, 회원은 이를 자유롭게 활용할 수 있습니다.</li>
          <li>서비스에 표시된 로고·UI·코드의 저작권은 운영자에게 있으며, 무단 복제·배포를 금지합니다.</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제6조 (서비스 변경 및 중단)</h2>
        <p>
          서비스는 운영상·기술상 필요에 따라 기능을 변경하거나 일시 중단할 수 있으며, 사전 공지를 원칙으로 합니다. 회원의 귀책 없이 발생한 손해에 대해 합리적 조치를 취합니다.
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제7조 (이용 제한)</h2>
        <p>
          회원이 본 약관을 위반하거나 다음에 해당할 경우, 사전 통지 후(긴급한 경우 사후 통지) 이용을 제한할 수 있습니다.
        </p>
        <ul>
          <li>타인의 명의 도용 또는 허위 정보 제공</li>
          <li>저작권 등 타인의 권리 침해</li>
          <li>서비스의 정상 운영을 방해하는 행위</li>
          <li>관련 법령 위반</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제8조 (면책)</h2>
        <ul>
          <li>천재지변·전쟁·외부 서비스(Anthropic·Supabase 등) 장애로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
          <li>회원이 AI 응답의 내용을 사용·배포함에 따른 결과는 회원의 책임입니다.</li>
          <li>회원의 본인 부주의로 인한 API 키 노출, 작품 데이터 유실에 대해 책임을 지지 않습니다.</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제9조 (분쟁 해결)</h2>
        <p>
          본 약관과 관련된 분쟁은 대한민국 법령을 준거법으로 하며, 운영자의 본점 소재지를 관할하는 법원을 합의 관할로 합니다.
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, marginTop: 36, marginBottom: 12 }}>제10조 (약관 변경)</h2>
        <p>
          본 약관은 법령 또는 서비스 정책 변경에 따라 개정될 수 있으며, 변경 시 7일 전(중대한 변경은 30일 전) 공지합니다. 회원이 변경 약관에 동의하지 않을 경우 회원 탈퇴를 통해 이용을 종료할 수 있습니다.
        </p>

        <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--ink-5)" }}>
          <a href="/" style={{ color: "var(--ink-4)", textDecoration: "none" }}>← 홈으로</a>
          <span style={{ marginLeft: 16 }}>
            <a href="/privacy" style={{ color: "var(--ink-4)", textDecoration: "none" }}>개인정보처리방침</a>
          </span>
        </div>
      </article>
    </main>
  );
}
