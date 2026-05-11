"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Symbol } from "@/components/Symbol";
import { createClient } from "@/lib/supabase/client";

type DownloadType = "windows-exe" | "windows" | "mac";

const DOWNLOAD_OPTIONS: {
  id: DownloadType;
  emoji: string;
  label: string;
  hint: string;
  recommended?: boolean;
}[] = [
  { id: "windows-exe", emoji: "⊞", label: "Windows 데스크탑 앱 (.exe)", hint: "4.5MB · 더블클릭 = 자동 설치 · 추천 ★", recommended: true },
  { id: "windows", emoji: "⊞", label: "Windows 자동 설치 ZIP", hint: "PowerShell 스크립트로 자동 설치 (Node.js·Claude Code 자동)" },
  { id: "mac", emoji: "🍎", label: "Mac 자동 설치 ZIP", hint: "setup.command 더블클릭 = 자동 설치" },
];

export default function DownloadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selected, setSelected] = useState<DownloadType>("windows-exe");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setAuthed(!!data.user);
      setUserEmail(data.user?.email ?? null);

      // 자동 OS 감지 = Windows 우선
      if (typeof window !== "undefined") {
        const ua = window.navigator.userAgent.toLowerCase();
        if (ua.includes("mac")) setSelected("mac");
        else setSelected("windows-exe");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload(): Promise<void> {
    if (!authed) {
      router.push("/login?redirect=/download");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ os: selected }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErrorMsg(j.error || `다운로드 실패 (HTTP ${res.status})`);
        setStatus("error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName =
        selected === "windows-exe" ? "SUNNY Story Maker Setup.exe" :
        selected === "windows" ? "sunny-story-maker-windows.zip" :
        "sunny-story-maker-mac.zip";
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "네트워크 오류");
      setStatus("error");
    }
  }

  if (authed === null) {
    return <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-4)" }}>로딩 중...</main>;
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--ink)" }}>
          <span style={{ width: 28, height: 28, color: "var(--ink)" }}><Symbol size={28} /></span>
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, fontWeight: 500 }}>
            Story Maker<span style={{ color: "var(--coral)" }}>.</span>
          </span>
        </a>
        {authed && userEmail && (
          <div style={{ fontSize: 12, color: "var(--ink-4)" }}>
            로그인: <span style={{ color: "var(--ink-2)" }}>{userEmail}</span>
          </div>
        )}
      </header>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: 1200, margin: "0 auto", width: "100%", padding: "60px 32px", gap: 60, alignItems: "start" }}>
        {/* 좌: 가이드 4단계 */}
        <section style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              — DESKTOP APP v2.11
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, lineHeight: 1.2, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
              본인 PC에서 <em style={{ fontStyle: "italic" }}>무료로 사용</em><span style={{ color: "var(--coral)" }}>.</span>
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-3)", lineHeight: 1.7, marginTop: 14 }}>
              Claude Pro/Max 구독($20/월)만 있으면 = <strong style={{ color: "var(--ink-1)" }}>추가 비용 0원</strong>으로 무제한 사용.
            </p>
          </div>

          <div style={{ background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 10 }}>준비물 (한 번만)</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.85 }}>
              <li>
                <a href="https://claude.ai/upgrade" target="_blank" rel="noreferrer" style={{ color: "var(--coral)", textDecoration: "underline" }}>Claude Pro</a> 또는 Max 구독 ($20/월부터)
              </li>
              <li>
                <a href="https://docs.anthropic.com/en/docs/claude-code/quickstart" target="_blank" rel="noreferrer" style={{ color: "var(--coral)", textDecoration: "underline" }}>Claude Code 설치</a> + 본인 계정 로그인 (= 평소 쓰는 그 Claude 계정)
              </li>
            </ol>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 10 }}>설치 (4단계 · 3분)</div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.95 }}>
              <li>우측 <strong style={{ color: "var(--ink-1)" }}>"Windows 데스크탑 앱"</strong> 다운로드 클릭 → SetupExe 파일 받기 (4.5MB)</li>
              <li>받은 파일 더블클릭 → Windows Defender 경고 시 <strong style={{ color: "var(--coral)" }}>"추가 정보 → 실행"</strong> 한 번 클릭 (= 첫 출시 unsigned, 안전합니다)</li>
              <li>"다음 다음 다음" 설치 완료 → 시작 메뉴 + 바탕화면 단축키 자동 생성</li>
              <li>바탕화면 단축키 더블클릭 → 끝. 매번 더블클릭하면 됩니다.</li>
            </ol>
          </div>

          <div style={{ background: "rgba(120, 200, 140, 0.06)", border: "1px solid rgba(120, 200, 140, 0.25)", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65 }}>
            ✓ <strong>업데이트</strong> = 새 버전 나오면 = 앱 시작 시 자동 알림 + 1클릭 설치<br />
            ✓ <strong>작법 노하우</strong> = 매주 자동 갱신 (= 사장님 큐레이션 + GitHub 새 자료)<br />
            ✓ <strong>본인 작품 데이터</strong> = Supabase 자동 저장 = 어디서든 이어쓰기
          </div>

          <div style={{ fontSize: 12, color: "var(--ink-5)", lineHeight: 1.7 }}>
            막힐 때 = <a href="/guide" style={{ color: "var(--ink-3)", textDecoration: "underline" }}>가이드 페이지</a> 또는 = <a href="mailto:support@sunnytoon.com" style={{ color: "var(--ink-3)", textDecoration: "underline" }}>support@sunnytoon.com</a>
          </div>
        </section>

        {/* 우: 다운로드 폼 */}
        <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "32px 28px", boxShadow: "var(--shadow-md)" }}>
          {!authed && (
            <div style={{ marginBottom: 18, padding: "12px 14px", background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.2)", borderRadius: 8, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
              <strong>다운로드 = 로그인 필요.</strong>{" "}
              <a href="/login?redirect=/download" style={{ color: "var(--coral)", textDecoration: "underline" }}>가입 / 로그인</a> 후 = 자동으로 다운로드 가능.
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 8, textTransform: "uppercase" }}>
            — DOWNLOAD
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.015em", margin: "0 0 16px" }}>
            <em style={{ fontStyle: "italic" }}>버전 선택</em>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {DOWNLOAD_OPTIONS.map(opt => {
              const on = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelected(opt.id)}
                  disabled={status === "loading"}
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    background: on ? "rgba(255, 107, 107, 0.08)" : "transparent",
                    color: "var(--ink-1)",
                    border: `1px solid ${on ? "var(--coral, #ff6b6b)" : "var(--line)"}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{opt.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                      {opt.label}
                      {opt.recommended && (
                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "var(--coral, #ff6b6b)", letterSpacing: "0.05em" }}>
                          ★ 추천
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-4)", lineHeight: 1.5 }}>{opt.hint}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {status === "error" && (
            <div style={{ marginBottom: 14, fontSize: 12, color: "var(--coral-deep, #c0392b)", padding: "10px 12px", background: "rgba(255, 107, 107, 0.06)", borderRadius: 8 }}>
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={status === "loading"}
            className="btn btn-coral"
            style={{ width: "100%", padding: "14px 18px", fontSize: 14, fontWeight: 700, justifyContent: "center" }}
          >
            {status === "loading" ? "다운로드 중…" : !authed ? "로그인 후 다운로드 →" : "다운로드"}
          </button>

          <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--ink-5)", lineHeight: 1.7 }}>
            ※ Mac·iOS·Android 데스크탑 앱 = V2.12 출시 예정.<br />
            ※ 현재 Mac/Linux = ZIP 자동 설치 path 사용 가능 (Node.js·Claude Code 자동).
          </div>
        </section>
      </div>

      <footer style={{ padding: "20px 32px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-5)" }}>
        <span>SUNNY Story Maker · v2.11.2 · 2026-05-11</span>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/guide" style={{ color: "var(--ink-4)", textDecoration: "none" }}>가이드</a>
          <a href="/changelog" style={{ color: "var(--ink-4)", textDecoration: "none" }}>변경 이력</a>
          <a href="/" style={{ color: "var(--ink-4)", textDecoration: "none" }}>← 홈으로</a>
        </div>
      </footer>
    </main>
  );
}
