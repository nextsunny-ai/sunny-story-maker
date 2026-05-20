"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!password || !confirm) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    // ★ V2.14.9 — signup과 일관 (옛엔 6자였음 = 작가 헤맴)
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("두 비밀번호가 일치하지 않습니다. 같은 비밀번호를 양쪽 칸에 입력해주세요.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      const m = updateErr.message.toLowerCase();
      // 흔한 에러 한국어 변환 (V2.14.9)
      if (m.includes("auth session missing") || m.includes("session_not_found")) {
        setError("재설정 세션이 만료됐습니다. 로그인 페이지에서 [비밀번호 찾기]를 다시 눌러 새 링크를 받아주세요.");
      } else if (m.includes("same_password") || m.includes("new password should be different")) {
        setError("새 비밀번호가 기존과 같습니다. 다른 비밀번호를 입력해주세요.");
      } else if (m.includes("weak_password") || m.includes("password should be at least")) {
        setError("비밀번호가 너무 약합니다. 8자 이상, 영문·숫자 혼합 권장.");
      } else if (m.includes("rate limit") || m.includes("too many requests")) {
        setError("요청이 너무 많습니다. 1분 후 다시 시도해주세요.");
      } else if (m.includes("network") || m.includes("fetch")) {
        setError("네트워크 오류. 인터넷 연결을 확인하고 다시 시도해주세요.");
      } else {
        setError(`변경 실패: ${updateErr.message}`);
      }
      setLoading(false);
      return;
    }
    setInfo("비밀번호 변경 완료! 잠시 후 홈으로 이동합니다.");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg, #fafafa)",
      padding: 20,
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 32,
          background: "var(--card, #fff)",
          border: "1px solid var(--line, #e5e5e5)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
          비밀번호 재설정
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 8, lineHeight: 1.5 }}>
          이메일 링크로 진입한 상태입니다. 새 비밀번호를 입력하세요.
        </div>

        <div className="login-field">
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>새 비밀번호</span>
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--ink-4)", padding: 0, fontWeight: 600 }}>
              {showPw ? "🙈 가리기" : "👁 보기"}
            </button>
          </label>
          <input
            className="field-input"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="login-field">
          <label>비밀번호 확인</label>
          <input
            className="field-input"
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error && (
          <div style={{
            padding: "10px 12px",
            background: "rgba(255, 90, 90, 0.08)",
            border: "1px solid rgba(255, 90, 90, 0.35)",
            borderRadius: 8,
            color: "var(--coral, #ff6b6b)",
            fontSize: 13,
            lineHeight: 1.5,
          }}>{error}</div>
        )}
        {info && (
          <div style={{
            padding: "10px 12px",
            background: "rgba(120, 200, 140, 0.08)",
            border: "1px solid rgba(120, 200, 140, 0.35)",
            borderRadius: 8,
            color: "var(--ink-2)",
            fontSize: 13,
            lineHeight: 1.5,
          }}>{info}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: "12px 18px",
            fontSize: 14,
            fontWeight: 700,
            background: "var(--coral)",
            color: "#fff",
            border: "1px solid var(--coral)",
            borderRadius: 8,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "변경 중…" : "비밀번호 변경"}
        </button>

        <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-4)", textAlign: "center" }}>
          <a href="/login" style={{ color: "var(--ink-3)" }}>← 로그인 페이지로</a>
        </div>
      </form>
    </div>
  );
}
