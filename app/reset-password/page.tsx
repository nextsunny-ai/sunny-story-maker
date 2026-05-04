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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!password || !confirm) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      // 세션이 없으면 = 메일 링크가 만료됨
      if (updateErr.message.toLowerCase().includes("auth session missing")) {
        setError("재설정 세션이 만료됐습니다. 로그인 페이지에서 다시 비밀번호 찾기를 시도해주세요.");
      } else {
        setError(updateErr.message);
      }
      setLoading(false);
      return;
    }
    setInfo("비밀번호 변경 완료. 잠시 후 홈으로 이동합니다.");
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
          <label>새 비밀번호</label>
          <input
            className="field-input"
            type="password"
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
            type="password"
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
