"use client";

import { useState } from "react";
import { Symbol } from "@/components/Symbol";

export default function DownloadPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const onDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error || "다운로드 실패");
        setStatus("error");
        return;
      }

      // ZIP blob 다운로드 트리거
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sunny-story-maker-local.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "네트워크 오류");
      setStatus("error");
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* 상단 브랜드 바 */}
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--line)" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--ink)" }}>
          <span style={{ width: 28, height: 28, color: "var(--ink)" }}><Symbol size={28} /></span>
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, fontWeight: 500 }}>
            Story Maker<span style={{ color: "var(--coral)" }}>.</span>
          </span>
        </a>
      </header>

      {/* 본문 */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: 1200, margin: "0 auto", width: "100%", padding: "60px 32px", gap: 60, alignItems: "start" }}>
        {/* 좌: 가이드 */}
        <section style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              — LOCAL VERSION (BETA)
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, lineHeight: 1.2, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
              본인 PC에서 <em style={{ fontStyle: "italic" }}>무료로 사용</em><span style={{ color: "var(--coral)" }}>.</span>
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-3)", lineHeight: 1.7, marginTop: 14 }}>
              Claude Pro/Max 구독자라면, 본인 PC에 Story Maker를 설치해서 <strong style={{ color: "var(--ink-1)" }}>API 비용 없이</strong> 자유롭게 사용할 수 있습니다.
              <br />작품 데이터는 사장님 베타 인스턴스에 안전하게 저장됩니다.
            </p>
          </div>

          <div style={{ background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 10 }}>준비물</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.9 }}>
              <li>Claude Pro 또는 Max 구독 (월 $20부터)</li>
              <li>Claude Code 설치 + 본인 계정 로그인 완료</li>
              <li>Node.js 20+ (없으면 nodejs.org에서 LTS 설치)</li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 10 }}>셋업 (5분)</div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.9 }}>
              <li>우측에서 ZIP 다운로드 후 압축 해제</li>
              <li>해당 폴더에서 <code style={{ background: "var(--card-soft)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>npm install</code></li>
              <li><code style={{ background: "var(--card-soft)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>npm run dev</code> → <a href="http://localhost:3001" target="_blank" rel="noreferrer" style={{ color: "var(--coral)" }}>http://localhost:3001</a></li>
              <li>자세한 가이드: 압축 해제 폴더의 <code style={{ background: "var(--card-soft)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>SETUP_FOR_WRITERS.md</code></li>
            </ol>
          </div>

          <div style={{ fontSize: 12, color: "var(--ink-5)", lineHeight: 1.6 }}>
            막힐 때 → 사장님께 카톡 + 화면 캡처. 셋업 한 번이면 그 다음부턴 자동.
          </div>
        </section>

        {/* 우: 다운로드 폼 */}
        <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "32px 28px", boxShadow: "var(--shadow-md)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 8, textTransform: "uppercase" }}>
            — 베타 액세스 코드 필요
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.015em", margin: "0 0 8px" }}>
            <em style={{ fontStyle: "italic" }}>다운로드</em>
          </h2>
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6, margin: "0 0 24px" }}>
            사장님께 받은 다운로드 암호를 입력해주세요.
          </p>

          <form onSubmit={onDownload} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              type="password"
              className="field-input"
              placeholder="다운로드 암호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              disabled={status === "loading"}
            />

            {status === "error" && (
              <div style={{ fontSize: 12, color: "var(--coral-deep)", padding: "8px 12px", background: "var(--coral-soft)", borderRadius: 8 }}>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-coral"
              disabled={!password.trim() || status === "loading"}
              style={{ padding: "14px 18px", fontSize: 14, justifyContent: "center" }}
            >
              {status === "loading" ? "다운로드 중…" : "ZIP 다운로드 (≈ 290KB)"}
            </button>
          </form>

          <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 10, textTransform: "uppercase" }}>
              포함된 것
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.8 }}>
              <li>30년 CD 시스템 프롬프트 + humanizer 6패턴</li>
              <li>12장르 매뉴얼 (한국 표준 양식)</li>
              <li>워크룸 UI (단락 hover 수정 + 채팅 + 노트)</li>
              <li>작가 노하우 학습 시스템</li>
              <li>Supabase 작품 자동 저장</li>
            </ul>
          </div>
        </section>
      </div>

      <footer style={{ padding: "20px 32px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-5)" }}>
        <span>SUNNY Story Maker · LOCAL v2.1</span>
        <a href="/" style={{ color: "var(--ink-4)", textDecoration: "none" }}>← 홈으로</a>
      </footer>
    </main>
  );
}
