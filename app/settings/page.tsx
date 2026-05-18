"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Symbol } from "@/components/Symbol";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login?redirect=/settings");
        return;
      }
      setUserEmail(data.user.email ?? null);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut(): Promise<void> {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-4)" }}>로딩 중...</main>;
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--line)" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--ink)" }}>
          <span style={{ width: 28, height: 28, color: "var(--ink)" }}><Symbol size={28} /></span>
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, fontWeight: 500 }}>
            Story Maker<span style={{ color: "var(--coral)" }}>.</span>
          </span>
        </a>
      </header>

      <div style={{ flex: 1, maxWidth: 720, margin: "0 auto", width: "100%", padding: "60px 32px" }}>
        <div style={{ fontSize: 11, color: "var(--ink-5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          — SETTINGS
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, lineHeight: 1.2, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
          계정<span style={{ color: "var(--coral)" }}>.</span>
        </h1>

        {/* 계정 정보 */}
        <section style={{ marginTop: 36, padding: "20px 24px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 8, textTransform: "uppercase" }}>
            로그인 계정
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 14, color: "var(--ink-1)" }}>{userEmail}</div>
            <button onClick={handleSignOut} style={{ padding: "8px 14px", fontSize: 12, background: "transparent", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink-3)", cursor: "pointer" }}>
              로그아웃
            </button>
          </div>
        </section>

        {/* 데스크탑 버전 안내 */}
        <section style={{ marginTop: 24, padding: "20px 24px", background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.25)", borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--coral)", marginBottom: 8, textTransform: "uppercase" }}>
            ★ Story Maker 사용 방법 — 데스크탑 버전
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-1)", lineHeight: 1.65, marginBottom: 12 }}>
            Story Maker는 <strong>데스크탑 버전</strong>에서 사용합니다.
            <strong>Claude Pro 구독 ($20/월)</strong>만 있으면 본인 PC에서 <strong>추가 비용 없이 무제한</strong>으로 쓸 수 있습니다.
            <br />
            한 번 설치하면 바탕화면 바로가기로 바로 실행됩니다.
          </div>
          <a href="/download" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "var(--coral)", borderRadius: 8, textDecoration: "none" }}>
            데스크탑 버전 다운로드 →
          </a>
        </section>

        <div style={{ marginTop: 32, fontSize: 12, color: "var(--ink-5)", textAlign: "center" }}>
          <a href="/privacy" style={{ color: "var(--ink-4)", textDecoration: "none", marginRight: 16 }}>개인정보처리방침</a>
          <a href="/terms" style={{ color: "var(--ink-4)", textDecoration: "none", marginRight: 16 }}>이용약관</a>
          <a href="/changelog" style={{ color: "var(--ink-4)", textDecoration: "none" }}>변경 이력</a>
        </div>
      </div>
    </main>
  );
}
