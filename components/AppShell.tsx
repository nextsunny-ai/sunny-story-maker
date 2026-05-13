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
      <Sidebar activeGenre={activeGenre} onGenreChange={setActiveGenre} />
      {children}
    </div>
  );
}
