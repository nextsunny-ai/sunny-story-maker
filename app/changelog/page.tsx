import { Symbol } from "@/components/Symbol";

export const metadata = {
  title: "변경 이력 — Story Maker",
};

interface Release {
  version: string;
  date: string;
  type: "major" | "minor" | "patch";
  highlights: string[];
}

const RELEASES: Release[] = [
  {
    version: "V2.11",
    date: "2026-05-10",
    type: "major",
    highlights: [
      "★ BYOK 정통 모델 전환 — 작가 본인 Claude 구독·API 키로 사용. 운영사 비용 0원.",
      "초대 코드 게이트 제거 — 이메일 인증 자동 가입(Option B)",
      "Settings 페이지 신규 — 본인 ANTHROPIC_API_KEY 등록 + 키 검증",
      "개인정보처리방침 + 서비스 이용약관 페이지 추가 (가입 시 동의)",
      "데스크탑 버전 안내 강화 — Claude Pro 구독 시 추가 비용 없음",
    ],
  },
  {
    version: "V2.10",
    date: "2026-05-04",
    type: "minor",
    highlights: [
      "Production Branch master → v2-wip 변경",
      "다운로드 페이지 + 베타 코드 시스템",
      "작가 학습 노하우 자동 첨부",
    ],
  },
  {
    version: "V2.0",
    date: "2026-05-02",
    type: "major",
    highlights: [
      "Streamlit V1 → Next.js + Vercel V2 전환",
      "Supabase 인증 + 작품 자동 저장",
      "12장르 매뉴얼 (한국 표준 양식)",
      "워크룸 UI (단락 hover 수정 + 채팅 + 노트)",
      "humanizer 6패턴 시스템",
    ],
  },
];

const TYPE_LABEL: Record<Release["type"], { text: string; color: string }> = {
  major: { text: "MAJOR", color: "var(--coral, #ff6b6b)" },
  minor: { text: "MINOR", color: "rgba(120, 200, 140, 0.9)" },
  patch: { text: "PATCH", color: "rgba(180, 180, 180, 0.7)" },
};

export default function ChangelogPage() {
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

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "60px 32px" }}>
        <div style={{ fontSize: 11, color: "var(--ink-5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          — CHANGELOG
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 8px", color: "var(--ink)" }}>
          변경 이력<span style={{ color: "var(--coral)" }}>.</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 48 }}>
          새 버전과 주요 변경 사항. 자동 업데이트로 받으시거나, 데스크탑 버전을 다시 다운로드해주세요.
        </p>

        {RELEASES.map(release => (
          <section key={release.version} style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, margin: 0, color: "var(--ink)", letterSpacing: "-0.015em" }}>
                {release.version}
              </h2>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: TYPE_LABEL[release.type].color, padding: "3px 8px", border: `1px solid ${TYPE_LABEL[release.type].color}`, borderRadius: 4 }}>
                {TYPE_LABEL[release.type].text}
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-5)", marginLeft: "auto" }}>{release.date}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.75 }}>
              {release.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </section>
        ))}

        <div style={{ marginTop: 32, fontSize: 12, color: "var(--ink-5)", textAlign: "center" }}>
          <a href="/" style={{ color: "var(--ink-4)", textDecoration: "none", marginRight: 16 }}>← 홈으로</a>
          <a href="/download" style={{ color: "var(--ink-4)", textDecoration: "none" }}>최신 버전 다운로드</a>
        </div>
      </article>
    </main>
  );
}
