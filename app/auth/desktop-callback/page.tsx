"use client";

// /auth/desktop-callback — 데스크탑 앱(.exe)용 Supabase OAuth callback
//
// 흐름:
// 1. .exe = "구글로 로그인" 버튼 → shell.open(supabaseOAuthUrl with redirectTo=/auth/desktop-callback)
// 2. 시스템 기본 브라우저(크롬) 열림 = 이미 로그인된 구글 세션 사용 = 비번 X = 1클릭 동의
// 3. Supabase OAuth → 이 페이지에 ?code=... 로 callback
// 4. 이 페이지 = exchangeCodeForSession(code) → session 받음
// 5. window.location = "story-maker://auth#access_token=...&refresh_token=..." (= .exe deep link)
// 6. .exe = deep link 받음 → supabase.auth.setSession → 로그인 완료
// 7. 브라우저는 = "로그인 완료, 이 창을 닫아주세요" 안내

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type State = "loading" | "success" | "error";

export default function DesktopCallback() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh" }} />}>
      <DesktopCallbackInner />
    </Suspense>
  );
}

function DesktopCallbackInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    (async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error_description") || searchParams.get("error");

      if (errorParam) {
        setState("error");
        setMessage(decodeURIComponent(errorParam));
        return;
      }
      if (!code) {
        setState("error");
        setMessage("OAuth 코드가 없습니다. (= URL에 ?code= 파라미터 누락)");
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          setState("error");
          setMessage(error?.message || "세션 교환 실패");
          return;
        }
        const { access_token, refresh_token, expires_in } = data.session;

        // ★ Deep link로 .exe에 세션 전달 (= URL fragment에 박음 = 서버 로그에 안 남음)
        const params = new URLSearchParams({
          access_token,
          refresh_token,
          expires_in: String(expires_in ?? 3600),
          type: "google",
        });
        const deepLink = `story-maker://auth#${params.toString()}`;

        setState("success");
        setMessage("로그인 완료 — 스토리메이커 앱으로 돌아갑니다…");

        // 약간의 지연 후 deep link 호출 (= 사용자에게 안내 보여주고)
        setTimeout(() => {
          window.location.href = deepLink;
        }, 500);

        // 추가 안내 = 5초 후 = "창을 닫아도 됩니다" 메시지
        setTimeout(() => {
          setMessage("로그인 완료 — 이 브라우저 창을 닫고 SUNNY Story Maker 앱으로 돌아가세요.");
        }, 3000);
      } catch (e) {
        setState("error");
        setMessage(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [searchParams]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f6f2",
        padding: 24,
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          boxShadow: "0 12px 48px rgba(0,0,0,0.08)",
          padding: "40px 44px",
          textAlign: "center",
          color: "#1a1a1a",
        }}
      >
        <div style={{ fontSize: 13, color: "#888", letterSpacing: "0.04em", marginBottom: 8 }}>
          SUNNY Story Maker
        </div>
        {state === "loading" && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>로그인 처리 중…</h2>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: 0 }}>
              Google 인증 결과를 확인하고 있습니다.
            </p>
          </>
        )}
        {state === "success" && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px", color: "#2d6a3e" }}>
              로그인 완료
            </h2>
            <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, margin: 0 }}>{message}</p>
            <p style={{ fontSize: 12, color: "#888", marginTop: 18, lineHeight: 1.6 }}>
              앱으로 자동 복귀가 안 되면 = 브라우저에서 "story-maker:// 열기" 알림에 "허용" 클릭.
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px", color: "#a33" }}>
              로그인 실패
            </h2>
            <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, margin: 0 }}>{message}</p>
            <p style={{ fontSize: 12, color: "#888", marginTop: 18 }}>
              앱으로 돌아가서 다시 시도해주세요.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
