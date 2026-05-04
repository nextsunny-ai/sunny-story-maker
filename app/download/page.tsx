"use client";

import { useState } from "react";
import { Symbol } from "@/components/Symbol";

type OS = "mac" | "windows";

export default function DownloadPage() {
  const [invite, setInvite] = useState("");
  const [os, setOs] = useState<OS>(() => {
    if (typeof window === "undefined") return "mac";
    // 자동 감지 — 사용자 OS 추정
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes("win")) return "windows";
    return "mac";
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showInvite, setShowInvite] = useState(true); // ★ 코드는 기본 보임 (작가 입력 확인용)

  const onDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invite: invite.trim(), os }),
      });

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error || "다운로드 실패");
        setStatus("error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sunny-story-maker-${os}.zip`;
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
              — LOCAL VERSION v2.3 · 2026-05-04
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, lineHeight: 1.2, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
              본인 PC에서 <em style={{ fontStyle: "italic" }}>무료로 사용</em><span style={{ color: "var(--coral)" }}>.</span>
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-3)", lineHeight: 1.7, marginTop: 14 }}>
              Claude Pro/Max 구독자라면, 본인 PC에 Story Maker를 설치해서 <strong style={{ color: "var(--ink-1)" }}>API 비용 없이</strong> 자유롭게 사용할 수 있습니다.
              <br />작품 데이터는 베타 인스턴스에 안전하게 저장됩니다.
            </p>
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: "var(--coral-soft)", borderRadius: 8,
              fontSize: 12, color: "var(--coral-deep)", lineHeight: 1.6,
            }}>
              <strong>v2.3 새 기능 (2026-05-04):</strong> 한 클로드 conversation 모델 (작품 = 1 conversation, prompt cache 1h TTL = 토큰 1/10)
              · 자료실 7카테고리 · 공고 메타 자동 추출 · 비번 찾기/리셋
            </div>
          </div>

          <div style={{ background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 10 }}>준비물</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.9 }}>
              <li>Claude Pro 또는 Max 구독 (월 $20부터)</li>
              <li><strong>그 외 다른 건 = 없어도 됩니다.</strong> 셋업 스크립트가 자동:
                <ul style={{ paddingLeft: 16, marginTop: 4, fontSize: 12.5, color: "var(--ink-3)" }}>
                  <li>Node.js (없으면 자동 설치)</li>
                  <li>Python (없으면 자동 설치 — 안전망)</li>
                  <li>Claude Code CLI (없으면 자동 설치)</li>
                  <li>PDF 읽기 (unpdf), DOCX 읽기·쓰기 (mammoth, docx)</li>
                  <li>그 외 Story Maker 의존성 다</li>
                </ul>
              </li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 10 }}>아주 쉬운 셋업 (5~10분)</div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.9 }}>
              <li>우측에서 본인 OS(Mac/Windows) 선택 + 초대코드 입력 → ZIP 다운로드</li>
              <li>ZIP 압축 해제</li>
              <li><strong>Mac:</strong> 폴더 안 <code style={{ background: "var(--card-soft)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>setup.command</code> 더블클릭<br/>
                <strong>Windows:</strong> 폴더 안 <code style={{ background: "var(--card-soft)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>setup_windows.ps1</code> 우클릭 → "PowerShell로 실행"
              </li>
              <li>스크립트가 = 필요한 것 다 자동 설치 + 첫 실행 + 바탕화면 바로가기</li>
              <li>다음부터는 = 바탕화면 바로가기 더블클릭만</li>
            </ol>
          </div>

          <div style={{ fontSize: 12, color: "var(--ink-5)", lineHeight: 1.6 }}>
            막힐 때 → 개발사로 문의 + 화면 캡처. 셋업 한 번이면 그 다음부턴 자동.
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
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6, margin: "0 0 20px" }}>
            본인 OS 선택 + 초대코드 입력 → ZIP 다운로드.
          </p>

          {/* OS 선택 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", marginBottom: 6, letterSpacing: "0.04em" }}>
              운영체제
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {([
                { id: "mac" as OS, label: "🍎 Mac", hint: ".command" },
                { id: "windows" as OS, label: "⊞ Windows", hint: ".ps1" },
              ]).map(opt => {
                const on = os === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOs(opt.id)}
                    disabled={status === "loading"}
                    style={{
                      padding: "12px 14px", textAlign: "center",
                      background: on ? "var(--coral-soft)" : "transparent",
                      color: on ? "var(--coral-deep)" : "var(--ink-2)",
                      border: `1px solid ${on ? "var(--coral)" : "var(--line)"}`,
                      borderRadius: 10, cursor: "pointer",
                      fontSize: 14, fontWeight: 700,
                      display: "flex", flexDirection: "column", gap: 2,
                    }}
                  >
                    <span>{opt.label}</span>
                    <span style={{ fontSize: 10, color: on ? "var(--coral-deep)" : "var(--ink-4)", fontWeight: 500 }}>
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={onDownload} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", marginBottom: 6, letterSpacing: "0.04em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>초대 코드 (베타 한정)</span>
                <button
                  type="button"
                  onClick={() => setShowInvite(prev => !prev)}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 11, color: "var(--ink-4)", padding: 0, fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                  title={showInvite ? "코드 가리기" : "코드 보기"}
                >
                  {showInvite ? "🙈 가리기" : "👁 보기"}
                </button>
              </div>
              <input
                type={showInvite ? "text" : "password"}
                className="field-input"
                placeholder="개발사가 발급한 다운로드 코드를 입력하세요"
                value={invite}
                onChange={e => setInvite(e.target.value)}
                autoFocus
                disabled={status === "loading"}
                autoComplete="off"
              />
            </div>

            {status === "error" && (
              <div style={{ fontSize: 12, color: "var(--coral-deep)", padding: "8px 12px", background: "var(--coral-soft)", borderRadius: 8 }}>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-coral"
              disabled={!invite.trim() || status === "loading"}
              style={{ padding: "14px 18px", fontSize: 14, justifyContent: "center" }}
            >
              {status === "loading" ? "다운로드 중…"
                : os === "mac" ? "🍎 Mac용 ZIP 다운로드"
                : "⊞ Windows용 ZIP 다운로드"}
            </button>
          </form>

          <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 10, textTransform: "uppercase" }}>
              ZIP 안에 들어있는 것
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.8 }}>
              <li>{os === "mac" ? "setup.command (Mac 자동 셋업)" : "setup_windows.ps1 (Windows 자동 셋업)"}</li>
              <li>30년 CD 시스템 프롬프트 + humanizer 6패턴</li>
              <li>16개 매체 한국 표준 양식 (큐시트·희곡·웹툰 컷 등)</li>
              <li>PDF·DOCX 자동 파싱·생성 라이브러리</li>
              <li>워크룸 UI · 작가 노하우 학습 · Supabase 자동 저장</li>
            </ul>
          </div>
        </section>
      </div>

      <footer style={{ padding: "20px 32px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-5)" }}>
        <span>SUNNY Story Maker · LOCAL v2.3 · 2026-05-04</span>
        <a href="/" style={{ color: "var(--ink-4)", textDecoration: "none" }}>← 홈으로</a>
      </footer>
    </main>
  );
}
