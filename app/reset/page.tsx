"use client";

/**
 * /reset — 데이터 초기화 페이지.
 * - localStorage 다 비움 (작가 프로필·라이브러리·작품·세션 등)
 * - sessionStorage 비움
 * - Supabase 세션 signOut (현재 로그인 상태 끊음)
 * - 마지막에 /login 으로 redirect
 *
 * Supabase의 가입된 사용자(이메일) 자체를 삭제하려면 = Supabase 대시보드에서 직접
 * (Auth → Users → 삭제). 이 페이지는 = 본 PC의 데이터·세션만 정리.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPage() {
  const router = useRouter();
  const [step, setStep] = useState<"confirm" | "running" | "done">("confirm");
  const [removedKeys, setRemovedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runReset = async () => {
    setStep("running");
    setError(null);
    const removed: string[] = [];

    try {
      // 1) localStorage 전체 dump 후 삭제
      if (typeof window !== "undefined") {
        const ls = window.localStorage;
        const keys: string[] = [];
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          if (k) keys.push(k);
        }
        for (const k of keys) {
          ls.removeItem(k);
          removed.push(`localStorage: ${k}`);
        }
        // sessionStorage 도 클리어
        const ss = window.sessionStorage;
        const skeys: string[] = [];
        for (let i = 0; i < ss.length; i++) {
          const k = ss.key(i);
          if (k) skeys.push(k);
        }
        for (const k of skeys) {
          ss.removeItem(k);
          removed.push(`sessionStorage: ${k}`);
        }
      }

      // 2) Supabase signOut — 현재 로그인 세션 끊기
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
        removed.push("supabase: 세션 signOut");
      } catch {
        // signOut 실패해도 계속 진행
      }

      // 3) Supabase auth cookies 직접 삭제 (sb-* cookies)
      if (typeof document !== "undefined") {
        const cookies = document.cookie.split(";");
        for (const c of cookies) {
          const eq = c.indexOf("=");
          const name = (eq > -1 ? c.substring(0, eq) : c).trim();
          if (name.startsWith("sb-") || name.startsWith("supabase")) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            removed.push(`cookie: ${name}`);
          }
        }
      }

      setRemovedKeys(removed);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "초기화 실패");
      setStep("confirm");
    }
  };

  // done 상태 = 2초 후 자동 /login 이동
  useEffect(() => {
    if (step === "done") {
      const t = setTimeout(() => router.push("/login"), 2000);
      return () => clearTimeout(t);
    }
  }, [step, router]);

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, background: "var(--bg, #fafaf7)",
    }}>
      <div style={{
        maxWidth: 540, width: "100%",
        padding: "32px 36px",
        background: "var(--card, #fff)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
          color: "var(--coral)", marginBottom: 8,
        }}>
          STORY MAKER · DATA RESET
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: "var(--ink-1)",
          marginBottom: 12, letterSpacing: "-0.01em",
        }}>
          본 PC의 데이터·세션 초기화
        </h1>

        {step === "confirm" && (
          <>
            <p style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 8 }}>
              아래 항목이 <strong style={{ color: "var(--ink-1)" }}>되돌릴 수 없이</strong> 삭제됩니다:
            </p>
            <ul style={{
              fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8,
              paddingLeft: 18, marginBottom: 18,
            }}>
              <li>작가 프로필 (이름·작가명·대표 작품 등)</li>
              <li>누적 학습 노하우 (admin 작가 탭에서 박은 거)</li>
              <li>라이브러리 작품 목록 + 각 작품 본문·노트</li>
              <li>리뷰어 페르소나 (직접 만든 것)</li>
              <li>리뷰·각색·OSMU·Write 페이지의 임시 입력</li>
              <li>현재 Supabase 로그인 세션 (signOut)</li>
            </ul>
            <p style={{ fontSize: 12, color: "var(--ink-4)", lineHeight: 1.6, marginBottom: 22 }}>
              ※ Supabase에 가입된 <strong>이메일 계정 자체</strong>를 삭제하려면 Supabase 대시보드에서 직접 (Auth → Users → 사용자 삭제). 이 페이지는 = 본 PC의 데이터·세션만 정리합니다.
            </p>

            {error && (
              <div style={{
                padding: "10px 12px", marginBottom: 14,
                background: "rgba(255, 90, 90, 0.08)",
                border: "1px solid rgba(255, 90, 90, 0.35)",
                borderRadius: 8, color: "var(--coral, #d96a5a)",
                fontSize: 13,
              }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={runReset}
                style={{
                  padding: "10px 20px", fontSize: 13.5, fontWeight: 700,
                  background: "var(--coral)", color: "#fff",
                  border: "1px solid var(--coral)", borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                전체 초기화 + /login 이동
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                style={{
                  padding: "10px 20px", fontSize: 13.5,
                  background: "transparent", color: "var(--ink-3)",
                  border: "1px solid var(--line)", borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                취소 (홈으로)
              </button>
            </div>
          </>
        )}

        {step === "running" && (
          <p style={{ fontSize: 14, color: "var(--ink-3)" }}>
            ⏳ 데이터 정리 중…
          </p>
        )}

        {step === "done" && (
          <>
            <div style={{
              padding: "12px 16px", marginBottom: 16,
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              borderRadius: 10,
              color: "var(--ink-1)", fontSize: 13.5, fontWeight: 600,
            }}>
              ✓ 초기화 완료 — {removedKeys.length}개 항목 삭제. 2초 후 /login으로 이동합니다.
            </div>
            {removedKeys.length > 0 && (
              <details style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                <summary style={{ cursor: "pointer", padding: "4px 0" }}>
                  삭제된 항목 보기
                </summary>
                <pre style={{
                  marginTop: 8, padding: 10,
                  background: "var(--card-soft)",
                  borderRadius: 6, lineHeight: 1.5,
                  whiteSpace: "pre-wrap", wordBreak: "break-all",
                  maxHeight: 200, overflowY: "auto",
                }}>
                  {removedKeys.join("\n")}
                </pre>
              </details>
            )}
          </>
        )}
      </div>
    </main>
  );
}
