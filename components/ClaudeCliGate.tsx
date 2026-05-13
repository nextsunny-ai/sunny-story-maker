"use client";

import { useCallback, useEffect, useState } from "react";

function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

type Status = "checking" | "ready" | "not-installed" | "not-logged-in";

interface CliStatusResponse {
  available: boolean;
  reason: "ready" | "not-installed" | "not-logged-in";
  error: string | null;
}

/**
 * Tauri 데스크탑 환경에서 = `claude` CLI 설치 + 로그인 강제 게이트.
 * - 미설치 = 설치 페이지로 안내
 * - 미로그인 = "터미널 열어 로그인하기" 버튼 = `claude /login` 자동 실행
 * - 5초 polling = OAuth 완료 시 = 자동 통과
 * - 미통과 시 = children 가림 (= 풀스크린 overlay)
 *
 * 웹 환경 (= 브라우저)에서는 항상 통과 (= 게이트 비활성).
 */
export function ClaudeCliGate() {
  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [openingTerminal, setOpeningTerminal] = useState(false);

  // 단일 호출 = claude_cli_status 한 번 = 결과 또는 null(실패)
  const probe = useCallback(async (): Promise<CliStatusResponse | null> => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<CliStatusResponse>("claude_cli_status");
    } catch {
      return null;
    }
  }, []);

  const applyResult = useCallback((res: CliStatusResponse | null) => {
    if (!res) {
      // invoke 자체 실패 (= 일시적, WebView mount 직후 등) = "설치 안 됨"으로 처리하지만
      // 첫 검사에서는 재시도가 먼저 (= initialCheck에서 처리)
      setStatus("not-installed");
      setErrorMsg("Claude Code CLI 상태 확인에 실패했습니다. 잠시 후 '다시 확인'을 눌러주세요.");
      return;
    }
    if (res.available) {
      setStatus("ready");
      setErrorMsg("");
    } else if (res.reason === "not-installed") {
      setStatus("not-installed");
      setErrorMsg(res.error ?? "");
    } else {
      setStatus("not-logged-in");
      setErrorMsg(res.error ?? "");
    }
  }, []);

  const check = useCallback(async () => {
    if (!isTauri()) { setStatus("ready"); return; }
    applyResult(await probe());
  }, [probe, applyResult]);

  // ★ 첫 검사 = 깜빡임 방지 = 실패하면 1.5초 후 1번 재시도 후만 모달 표시
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isTauri()) { setStatus("ready"); return; }
      const first = await probe();
      if (cancelled) return;
      if (first && first.available) { applyResult(first); return; }
      // 첫 검사 = ready 아님 → 1.5초 기다렸다가 1번 더
      await new Promise((r) => setTimeout(r, 1500));
      if (cancelled) return;
      const second = await probe();
      if (cancelled) return;
      applyResult(second ?? first);
    })();
    return () => { cancelled = true; };
  }, [probe, applyResult]);

  // 미통과 = 5초 polling = OAuth 완료 시 자동 통과
  useEffect(() => {
    if (status === "ready" || status === "checking") return;
    const id = window.setInterval(() => {
      void check();
    }, 5000);
    return () => window.clearInterval(id);
  }, [status, check]);

  const openLoginTerminal = async () => {
    setOpeningTerminal(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("claude_open_login_terminal");
    } catch (e) {
      setErrorMsg(
        "터미널 자동 실행에 실패했습니다. 직접 터미널(또는 명령 프롬프트)을 열어 `claude /login` 명령을 입력해주세요.\n\n" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setOpeningTerminal(false);
    }
  };

  if (status === "ready" || status === "checking") {
    return null;
  }

  const isInstall = status === "not-installed";

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(248, 246, 242, 0.96)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: "100%",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
          padding: "36px 40px",
          color: "#1a1a1a",
        }}
      >
        <div style={{ fontSize: 13, color: "#888", letterSpacing: "0.04em", marginBottom: 8 }}>
          SUNNY Story Maker
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35, margin: "0 0 16px" }}>
          {isInstall ? "Claude Code CLI 설치가 필요합니다" : "Claude 로그인이 필요합니다"}
        </h2>

        {isInstall ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "#333", margin: "0 0 16px" }}>
              작가 본인의 Claude Pro/Max 구독으로 작업하려면 = 본인 PC에 Claude Code CLI가 설치돼 있어야 합니다.
            </p>
            <ol style={{ fontSize: 14, lineHeight: 1.8, color: "#333", paddingLeft: 20, margin: "0 0 24px" }}>
              <li>
                <a
                  href="https://claude.com/code"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#1a73e8", textDecoration: "underline" }}
                >
                  https://claude.com/code
                </a>{" "}
                에서 Claude Code 다운로드 + 설치
              </li>
              <li>설치 후 = 이 창의 <strong>'다시 확인'</strong> 버튼 클릭</li>
            </ol>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "#333", margin: "0 0 16px" }}>
              본인 Claude 구독으로 사용하려면 = <strong>로그인 1회</strong>가 필요합니다 (= 한 번만 하면 됩니다).
            </p>
            <div
              style={{
                background: "#f8f6f2",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 10,
                padding: "14px 16px",
                fontSize: 13.5,
                lineHeight: 1.7,
                color: "#444",
                margin: "0 0 20px",
              }}
            >
              <strong style={{ color: "#1a1a1a" }}>아래 버튼을 누르면:</strong>
              <ol style={{ paddingLeft: 18, margin: "8px 0 0" }}>
                <li>검은 창이 잠시 뜹니다 — <em>정상입니다</em></li>
                <li>자동으로 브라우저가 열려 = Claude 로그인 페이지가 표시됩니다</li>
                <li>브라우저에서 로그인 완료 후 = 이 화면이 자동으로 사라집니다 (= 5초마다 자동 감지)</li>
              </ol>
            </div>
            <button
              onClick={openLoginTerminal}
              disabled={openingTerminal}
              style={{
                width: "100%",
                padding: "14px 20px",
                background: openingTerminal ? "#999" : "#1a1a1a",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: openingTerminal ? "wait" : "pointer",
                marginBottom: 12,
              }}
            >
              {openingTerminal ? "로그인 시작 중..." : "Claude로 로그인하기"}
            </button>
          </>
        )}

        {errorMsg && (
          <div
            style={{
              background: "#fff4e5",
              border: "1px solid #ffd9a8",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#8b4500",
              marginBottom: 16,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          onClick={() => void check()}
          style={{
            width: "100%",
            padding: "12px 18px",
            background: "#f3f1ec",
            color: "#1a1a1a",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          다시 확인
        </button>
      </div>
    </div>
  );
}

export default ClaudeCliGate;
