"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Symbol } from "@/components/Symbol";
import { KEY, loadJSON, saveJSON, removeKey } from "@/lib/persist";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login?redirect=/settings");
        return;
      }
      setUserEmail(data.user.email ?? null);

      // 옛에 박힌 키 read (persist.ts 통일)
      const stored = loadJSON<string>(KEY.userApiKey, "");
      if (stored) setApiKey(stored);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave(): void {
    setError(null);
    setInfo(null);

    const trimmed = apiKey.trim();
    if (!trimmed) {
      removeKey(KEY.userApiKey);
      setInfo("API 키를 삭제했습니다.");
      return;
    }

    if (!trimmed.startsWith("sk-ant-")) {
      setError("Anthropic API 키 형식이 아닙니다. (sk-ant-... 으로 시작)");
      return;
    }

    setSaving(true);
    try {
      saveJSON(KEY.userApiKey, trimmed);
      setInfo("API 키를 저장했습니다.");
    } catch {
      setError("저장 실패. 브라우저 localStorage가 차단됐을 수 있습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(): Promise<void> {
    setError(null);
    setInfo(null);
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError("API 키를 먼저 입력해주세요.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": trimmed,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (res.ok) {
        setInfo("✓ 키 검증 성공. 정상 작동합니다.");
      } else {
        const errText = await res.text().catch(() => "");
        setError(`검증 실패 (${res.status}): ${errText.slice(0, 200) || "키가 잘못되었거나 권한이 없습니다."}`);
      }
    } catch (e) {
      setError(`네트워크 오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  }

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
          계정 및 <em style={{ fontStyle: "italic" }}>API 키</em><span style={{ color: "var(--coral)" }}>.</span>
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

        {/* 추천: 다운로드 버전 */}
        <section style={{ marginTop: 24, padding: "20px 24px", background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.25)", borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--coral)", marginBottom: 8, textTransform: "uppercase" }}>
            ★ 더 편한 방법 — 데스크탑 버전
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-1)", lineHeight: 1.65, marginBottom: 12 }}>
            <strong>Claude Pro 구독 ($20/월)</strong>만 있으면 — 본인 PC에서 <strong>API 비용 없이 무제한 사용</strong>할 수 있습니다.
            아래 API 키 등록은 <em>웹에서 굳이 사용</em>하실 때만 필요합니다.
          </div>
          <a href="/download" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "var(--coral)", borderRadius: 8, textDecoration: "none" }}>
            데스크탑 버전 다운로드 →
          </a>
        </section>

        {/* API 키 (BYOK) */}
        <section style={{ marginTop: 24, padding: "24px 24px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 8, textTransform: "uppercase" }}>
            웹 사용용 — Anthropic API 키 (BYOK)
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.65, marginBottom: 16 }}>
            웹에서 사용하실 경우, 본인의 Anthropic API 키가 필요합니다. 사용하신 만큼 본인 카드로 결제됩니다.
            <br />
            키 발급:{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: "var(--coral)", textDecoration: "underline" }}>
              console.anthropic.com/settings/keys
            </a>
          </div>

          <label style={{ fontSize: 12, color: "var(--ink-4)", display: "block", marginBottom: 6 }}>
            ANTHROPIC_API_KEY
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="field-input"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              autoComplete="off"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              style={{ padding: "0 14px", fontSize: 12, background: "transparent", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink-3)", cursor: "pointer" }}
            >
              {showKey ? "숨김" : "보기"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1, padding: "12px 18px", fontSize: 13, fontWeight: 600, color: "white", background: "var(--ink-1)", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer" }}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !apiKey.trim()}
              style={{ flex: 1, padding: "12px 18px", fontSize: 13, fontWeight: 600, color: "var(--ink-1)", background: "transparent", border: "1px solid var(--ink-1)", borderRadius: 8, cursor: testing ? "wait" : "pointer", opacity: !apiKey.trim() ? 0.4 : 1 }}
            >
              {testing ? "검증 중..." : "키 검증"}
            </button>
          </div>

          {error && (
            <div role="alert" style={{ marginTop: 14, padding: "10px 12px", background: "rgba(255, 90, 90, 0.08)", border: "1px solid rgba(255, 90, 90, 0.35)", borderRadius: 8, color: "var(--coral, #ff6b6b)", fontSize: 13, lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          {info && (
            <div role="status" style={{ marginTop: 14, padding: "10px 12px", background: "rgba(120, 200, 140, 0.08)", border: "1px solid rgba(120, 200, 140, 0.35)", borderRadius: 8, color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 1.5 }}>
              {info}
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 11, color: "var(--ink-5)", lineHeight: 1.6 }}>
            ※ API 키는 본인 브라우저(localStorage)에만 저장됩니다. 서버에 전송되지 않습니다.
            <br />※ 데스크탑 버전을 사용하시면 이 키 없이도 무료로 사용 가능합니다.
          </div>
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
