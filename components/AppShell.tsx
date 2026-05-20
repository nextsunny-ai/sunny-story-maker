"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { createClient } from "@/lib/supabase/client";
import { setUserNamespace, migrateAnonToUser } from "@/lib/persist";

/**
 * AppShell — 모든 페이지(login 제외) 공통 레이아웃
 * .app grid (sidebar 240px + main 1fr) + Sidebar
 *
 * ★ 2026-05-14 — Auth bootstrap:
 *   - Supabase getUser() → setUserNamespace(user.id) → KEY.xxx 자동 user.id 네임스페이스로
 *   - 옛 anon.* 키 → user.id.* 1회 마이그레이션 (= 같은 PC 작가 데이터 보존)
 *   - onAuthStateChange = 로그인·로그아웃 시 자동 갱신
 *
 * 사용:
 *   <AppShell>
 *     <main className="main">...</main>
 *   </AppShell>
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  // ★ V3.1 #4 — 모바일 사이드바 열림 상태
  const [mobileOpen, setMobileOpen] = useState(false);

  // ★ Auth bootstrap — 로그인 user.id로 localStorage 네임스페이스 전환
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        const uid = data.user?.id;
        if (uid) {
          setUserNamespace(uid);
          migrateAnonToUser(uid);
        } else {
          setUserNamespace(null);
        }
      } catch { /* ignore — fallback = anon */ }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id;
      if (uid) {
        setUserNamespace(uid);
        migrateAnonToUser(uid);
      } else {
        setUserNamespace(null);
      }
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="app">
      {/* ★ V3.1 #4 — 모바일 햄버거 (768px 미만에서만 표시) */}
      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={() => setMobileOpen(v => !v)}
        aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {mobileOpen ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </>
          )}
        </svg>
      </button>
      <div
        className={"mobile-menu-backdrop" + (mobileOpen ? " open" : "")}
        onClick={() => setMobileOpen(false)}
      />
      <div className={mobileOpen ? "sb-wrap mobile-open" : "sb-wrap"} style={{ display: "contents" }}>
        <div
          className={"sb-mobile-container"}
          style={{ display: "contents" }}
          onClick={(e) => {
            // 사이드바 내부 링크 클릭 시 = 자동 닫힘
            const target = e.target as HTMLElement;
            if (target.closest(".sb-link, .sb-genre-step")) setMobileOpen(false);
          }}
        >
          <Sidebar
            activeGenre={activeGenre}
            onGenreChange={setActiveGenre}
          />
        </div>
      </div>
      {/* 모바일 = sidebar에 .mobile-open 클래스를 외부에서 박을 방법 = inline style override.
          간단히 useEffect로 .sb DOM에 클래스 토글 */}
      <MobileSidebarSync open={mobileOpen} />
      {children}
    </div>
  );
}

// ★ V3.1 #4 — Sidebar 컴포넌트는 .sb 클래스를 가지고 있고
//   외부 wrapper로 mobile-open 토글 X = 직접 DOM에서 클래스 add/remove
function MobileSidebarSync({ open }: { open: boolean }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sb = document.querySelector(".sb");
    if (!sb) return;
    if (open) sb.classList.add("mobile-open");
    else sb.classList.remove("mobile-open");
  }, [open]);
  return null;
}
