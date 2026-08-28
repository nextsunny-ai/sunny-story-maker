"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Symbol } from "@/components/Symbol";
import { createClient } from "@/lib/supabase/client";
import { STORYMAKER_VERSION } from "@/lib/storymaker/version";

type DownloadType = "windows-exe" | "windows" | "mac";

// V3.1 E5 — 버전 정보 = lib/storymaker/version.ts 단일 소스
const V = STORYMAKER_VERSION;
const DOWNLOAD_OPTIONS: {
  id: DownloadType;
  emoji: string;
  label: string;
  hint: string;
  recommended?: boolean;
}[] = [
  { id: "windows-exe", emoji: "⊞", label: `Windows 데스크탑 앱 (.exe · v${V.version})`, hint: `${V.sizes["windows-exe"]} · 더블클릭 = 자동 설치 · 추천 ★`, recommended: true },
  //   ★ Windows ZIP · Mac .dmg 는 내렸다 (2026-08-28).
  //   파일이 5월 것(v3.1.0)인데 화면에는 최신 버전으로 표기돼, 받는 분은 옛 버전을 최신인 줄 알고 받게 된다.
  //   최신 파일을 올린 뒤 다시 켠다. 파일 자체는 _private_downloads 에 그대로 있다.
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
        "SUNNY Story Maker.dmg";
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
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, lineHeight: 1.2, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
              본인 PC에서 <em style={{ fontStyle: "italic" }}>무료로 사용</em><span style={{ color: "var(--coral)" }}>.</span>
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-3)", lineHeight: 1.7, marginTop: 14 }}>
              Claude Pro/Max 구독($20/월)만 있으면 <strong style={{ color: "var(--ink-1)" }}>추가 비용 없이 무제한</strong>.
            </p>
          </div>

          {/* 준비 — 한 줄 */}
          <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)" }}>준비</span>
            <br />
            <a href="https://claude.ai/upgrade" target="_blank" rel="noreferrer" style={{ color: "var(--coral)", textDecoration: "underline" }}>Claude Pro</a> 또는 Max 구독 ($20/월) — 평소 쓰는 Claude 계정이면 OK.
          </div>

          {/* 설치 3단계 — 간결 */}
          <div style={{ background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 12 }}>설치 · 3분</div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--ink-2)", lineHeight: 2 }}>
              <li>우측 <strong style={{ color: "var(--ink-1)" }}>다운로드</strong> 클릭 → 파일 받기 (약 5MB)</li>
              <li>받은 파일 더블클릭 → 보안 경고 시 <strong style={{ color: "var(--coral)" }}>"추가 정보 → 실행"</strong> (<a href="/guide#defender-guide" style={{ color: "var(--coral)", textDecoration: "underline" }}>자세히</a>)</li>
              <li>"다음" 몇 번 → 바탕화면 단축키 더블클릭하면 끝</li>
            </ol>
          </div>

          {/* 자동 — 짧게 */}
          <div style={{ background: "rgba(120, 200, 140, 0.06)", border: "1px solid rgba(120, 200, 140, 0.25)", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8 }}>
            ✓ 새 버전 자동 알림 + 1클릭 설치<br />
            ✓ 작법 노하우 매주 자동 갱신<br />
            ✓ 작품 = 자동 저장 = 어디서든 이어쓰기
          </div>

          {/* 도움 */}
          <div style={{ fontSize: 12.5, color: "var(--ink-4)", lineHeight: 1.7 }}>
            막힐 때 = <a href="/guide" style={{ color: "var(--ink-2)", textDecoration: "underline" }}>가이드 페이지</a> 또는 = <a href="mailto:sunny@sunnyent.co.kr" style={{ color: "var(--ink-2)", textDecoration: "underline" }}>sunny@sunnyent.co.kr</a>
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

          {/* ★ 다운로드 직후 = Defender 경고 안내 (= 작가 헤맴 방지) ★ */}
          {selected === "windows-exe" && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(160, 24, 95, 0.04)", border: "1px solid rgba(160, 24, 95, 0.18)", borderRadius: 8, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>
              <strong style={{ color: "#A0185F" }}>🛡️ 다운로드 후 빨간 화면이 뜨면 = 정상.</strong>
              <br />
              "추가 정보 → 실행" 한 번 클릭하면 통과됩니다.{" "}
              <a href="/guide#defender-guide" style={{ color: "#A0185F", textDecoration: "underline", fontWeight: 600 }}>
                3단계 안내 보기 →
              </a>
            </div>
          )}

          {/* ★ Mac 보안 우회 안내 (= Apple 코드 서명 미적용 = 첫 실행 우클릭 → 열기) ★ */}
          {selected === "mac" && (
            <div style={{ marginTop: 14, padding: "14px 16px", background: "rgba(160, 24, 95, 0.04)", border: "1px solid rgba(160, 24, 95, 0.18)", borderRadius: 8, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.7 }}>
              <strong style={{ color: "#A0185F" }}>🍎 Mac 첫 실행 = 보안 안내</strong>
              <br />
              <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                Apple 코드 서명 미적용 = 더블클릭만 하면 "확인되지 않은 개발자" 경고가 뜹니다. 한 번만 우회하시면 이후엔 더블클릭 OK.
              </span>
              <ol style={{ margin: "8px 0 4px", paddingLeft: 18, fontSize: 12, lineHeight: 1.9 }}>
                <li>받은 <strong>.dmg 더블클릭</strong> → 마운트 → <strong>SUNNY Story Maker.app</strong>을 <strong>응용 프로그램</strong> 폴더로 드래그</li>
                <li>응용 프로그램 폴더에서 앱을 <strong>우클릭(또는 Control+클릭) → "열기"</strong></li>
                <li>경고창에서 <strong>"열기"</strong> 한 번 더 클릭 → 끝. (다음부터는 더블클릭으로 바로 열립니다)</li>
              </ol>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-5)" }}>
                ★ macOS Sequoia(15.0+) 사용자가 위 단계로 안 되시면 → <strong>시스템 설정 → 개인 정보 보호 및 보안</strong> → 페이지 아래 <strong>"그래도 열기"</strong> 버튼 클릭.
              </div>
            </div>
          )}

          <div style={{ marginTop: 18, padding: "12px 14px", background: "rgba(120, 200, 140, 0.06)", border: "1px solid rgba(120, 200, 140, 0.25)", borderRadius: 8, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7 }}>
            <strong>🔄 이미 설치하신 분 — 자동 업데이트</strong>
            <br />
            앱을 켜면 새 버전이 있을 때 알림이 뜨고 클릭 한 번으로 설치됩니다. <strong>웹에서 쓰는 기능은 자동 반영</strong>되므로 앱을 켜 둔 채로도 새 기능을 쓸 수 있습니다. 알림이 뜨지 않으면 이 페이지에서 다시 받아주세요.
          </div>

          <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--ink-5)", lineHeight: 1.7 }}>
            ※ Windows .exe = V{V.version} (NSIS 자동 설치 · 자동 업데이터). <strong>{V.requirements.windows}</strong> 권장.<br />
            ※ macOS = 최신 버전 준비 중입니다. 맥을 쓰시면 알려주시면 바로 보내드립니다.<br />
            ※ 메모리 {V.requirements.memory} · 디스크 {V.requirements.disk} · {V.requirements.network}.<br />
            ※ 1차 오픈 매체 = 영화 · TV 드라마 · 숏드라마 · 웹툰 · 웹소설 · 소설. 나머지 매체는 2차 오픈 예정.<br />
            ※ iOS·Android = 준비 중.
          </div>
        </section>
      </div>

      <footer style={{ padding: "20px 32px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-5)" }}>
        <span>SUNNY Story Maker · V{V.version} · {V.releaseDate.slice(0, 10)}</span>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/guide" style={{ color: "var(--ink-4)", textDecoration: "none" }}>가이드</a>
          <a href="/changelog" style={{ color: "var(--ink-4)", textDecoration: "none" }}>변경 이력</a>
          <a href="/" style={{ color: "var(--ink-4)", textDecoration: "none" }}>← 홈으로</a>
        </div>
      </footer>
    </main>
  );
}
