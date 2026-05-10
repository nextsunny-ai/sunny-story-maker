"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { Symbol } from "@/components/Symbol";
import { createClient } from "@/lib/supabase/client";

// ★ 2026-05-11 INVITE_CODE 게이트 제거 (Option B = 이메일 인증 자동 가입 + 약관 체크박스). 글로벌 룰 16 BYOK 모델 합의.

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const I = ICONS;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false); // ★ 비번 보기 토글 (옛 V2.11 사장님 명시)

  const quotes = [
    { line: "첫 줄을 쓰는 일은,", em: "언제나 가장 어려운 일.", by: "어떤 작가" },
    { line: "지지 않는 해처럼,", em1: "이야기는 매일", em2: "떠오릅니다.", by: "Sunny." },
    { line: "맡기세요. 처음부터 끝까지,", em: "다 써드립니다.", by: "Story Maker." },
  ];
  const q = quotes[1];

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        if (!termsAgreed) {
          setError("서비스 이용약관 및 개인정보처리방침 동의가 필요합니다.");
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name || "" },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        });

        if (signUpError) {
          setError(translateAuthError(signUpError.message));
          setLoading(false);
          return;
        }

        // 이메일 확인이 필요한 경우 session이 없음
        if (!data.session) {
          setInfo("가입 완료. 이메일로 발송된 확인 링크를 눌러주세요.");
          setLoading(false);
          return;
        }

        // ★ 새 가입자 = 진짜 깨끗하게 시작. 같은 브라우저에 옛 작가의 localStorage·세션이
        //   남아있을 수 있으니 (homeIdea·라이브러리·작가 프로필 등) signup 직후 자동 클리어.
        try {
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch {
          // ignore — 클리어 실패는 redirect 막지 않음
        }

        router.push(redirectTo);
        router.refresh();
        return;
      }

      // login mode
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(translateAuthError(signInError.message));
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(message);
      setLoading(false);
    }
  }

  async function handleGoogle(): Promise<void> {
    setError(null);
    setInfo(null);

    // ★ 2026-05-11 INVITE_CODE 게이트 제거 (Option B = 이메일 인증 자동 가입 + 약관 체크박스).
    // Google OAuth = Google 자체 인증 = 신뢰. 약관 동의는 = 가입 후 Settings에서 별도 박을 수도 있음.

    setLoading(true);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setError(translateAuthError(oauthError.message));
      setLoading(false);
    }
    // 성공 시 Supabase가 외부 redirect 수행 → 이 함수는 더 이상 진행되지 않음
  }

  async function handleForgotPassword(e: React.MouseEvent<HTMLAnchorElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email) {
      setError("비밀번호를 재설정할 이메일을 먼저 입력해주세요.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });

    if (resetError) {
      setError(translateAuthError(resetError.message));
    } else {
      setInfo("비밀번호 재설정 링크를 이메일로 발송했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      {/* ---- LEFT: Brand panel ---- */}
      <div className="login-brand">
        <div className="login-brand-top">
          <div className="login-mark">
            <div className="login-mark-icon"><Symbol /></div>
            <div className="login-mark-text">
              <div className="login-mark-name">Story Maker<span className="dot">.</span></div>
              <div className="login-mark-by">BY <em>Sunny<span className="dot">.</span></em></div>
            </div>
          </div>
        </div>

        <div className="login-quote">
          <div className="login-quote-eyebrow">— A WRITER&apos;S NOTE</div>
          <div className="login-quote-text">
            {q.line}<br/>
            <em>{q.em1}<br/>{q.em2}</em>
          </div>
          <div className="login-quote-by">— {q.by}</div>
        </div>

        <div style={{ marginTop: 28, padding: "16px 18px", background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", marginBottom: 6 }}>
            — Claude Pro 구독자라면
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.55, marginBottom: 10 }}>
            본인 PC에 설치해서 <strong>API 비용 0원</strong>으로 사용 가능
          </div>
          <a href="/download" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--coral)", fontWeight: 600, textDecoration: "none" }}>
            로컬 버전 다운로드 →
          </a>
        </div>

        <div className="login-brand-foot">
          <div className="login-brand-foot-row">
            <span className="login-brand-foot-k">Built for writers</span>
            <span className="login-brand-foot-v">12 genres · KR standards</span>
          </div>
          <div className="login-brand-foot-row">
            <span className="login-brand-foot-k">© 2026</span>
            <span className="login-brand-foot-v">Sunny<span className="dot">.</span></span>
          </div>
        </div>
      </div>

      {/* ---- RIGHT: Form panel ---- */}
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-form-eyebrow">
            <span className="login-form-bullet"></span>
            {mode === "login" ? "다시 오셨네요" : "처음 오셨네요"}
          </div>

          <h1 className="login-form-title">
            {mode === "login" ? (
              <>오늘도 한 줄,<br/><em>시작해 볼까요</em><span className="dot">.</span></>
            ) : (
              <>이야기의 첫 줄,<br/><em>여기서 시작</em><span className="dot">.</span></>
            )}
          </h1>

          <p className="login-form-sub">
            {mode === "login"
              ? "이메일로 로그인하시면 마지막 작업이 그대로 열립니다."
              : "계정을 만들면 12개 매체 워크플로우가 모두 열립니다. 첫 30일 무료."}
          </p>

          <div className="login-fields">
            {mode === "signup" && (
              <div className="login-field">
                <label>이름</label>
                <input
                  className="field-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="예: 홍길동"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="login-field">
              <label>이메일</label>
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            {mode === "signup" ? (
              // signup 모드 — 비밀번호 + 초대 코드 한 줄 (2단 grid). 사장님 의도: 작가가 초대 코드 어디 적는지 한눈에 보임.
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="login-field">
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>비밀번호</span>
                    <button type="button" onClick={() => setShowPassword(p => !p)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--ink-4)", padding: 0, fontWeight: 600 }} title={showPassword ? "가리기" : "보기"}>
                      {showPassword ? "🙈 가리기" : "👁 보기"}
                    </button>
                  </label>
                  <input
                    className="field-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            ) : (
              // login 모드 — 비밀번호만 (초대 코드는 아래 옵션 toggle)
              <div className="login-field">
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                    비밀번호
                    <a href="#" className="login-field-link" onClick={handleForgotPassword}>
                      비밀번호 찾기
                    </a>
                  </span>
                  <button type="button" onClick={() => setShowPassword(p => !p)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--ink-4)", padding: 0, fontWeight: 600 }} title={showPassword ? "가리기" : "보기"}>
                    {showPassword ? "🙈 가리기" : "👁 보기"}
                  </button>
                </label>
                <input
                  className="field-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            )}
          </div>

          {mode === "signup" && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16, fontSize: 12.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.55, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={e => setTermsAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: "var(--coral, #ff6b6b)" }}
              />
              <span>
                <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "var(--coral, #ff6b6b)", textDecoration: "underline" }}>서비스 이용약관</a>
                {" 및 "}
                <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--coral, #ff6b6b)", textDecoration: "underline" }}>개인정보처리방침</a>
                에 동의합니다.
              </span>
            </label>
          )}

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                padding: "10px 12px",
                background: "rgba(255, 90, 90, 0.08)",
                border: "1px solid rgba(255, 90, 90, 0.35)",
                borderRadius: 8,
                color: "var(--coral, #ff6b6b)",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}
          {info && (
            <div
              role="status"
              style={{
                marginTop: 14,
                padding: "10px 12px",
                background: "rgba(120, 200, 140, 0.08)",
                border: "1px solid rgba(120, 200, 140, 0.35)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.9)",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {info}
            </div>
          )}

          <button className="login-cta" type="submit" disabled={loading}>
            <span>
              {loading
                ? "처리 중..."
                : mode === "login"
                  ? "로그인"
                  : "30일 무료로 시작"}
            </span>
            <span className="login-cta-arrow">{I.arrow}</span>
          </button>

          <div className="login-divider"><span>또는</span></div>

          <div className="login-oauth">
            <button
              className="login-oauth-btn"
              type="button"
              onClick={handleGoogle}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google로 계속</span>
            </button>
          </div>

          <div className="login-switch">
            {mode === "login" ? (
              <>처음이신가요? <a href="#" onClick={e => { e.preventDefault(); setError(null); setInfo(null); setMode("signup"); }}>30일 무료 시작</a></>
            ) : (
              <>이미 계정이 있으신가요? <a href="#" onClick={e => { e.preventDefault(); setError(null); setInfo(null); setMode("login"); }}>로그인</a></>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (m.includes("email not confirmed")) return "이메일 확인이 필요합니다. 메일함을 확인해주세요.";
  if (m.includes("user already registered")) return "이미 가입된 이메일입니다. 로그인해주세요.";
  if (m.includes("password should be at least")) return "비밀번호는 6자 이상이어야 합니다.";
  if (m.includes("rate limit")) return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  if (m.includes("network")) return "네트워크 오류가 발생했습니다.";
  return message;
}
