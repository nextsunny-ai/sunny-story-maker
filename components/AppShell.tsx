"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";

/**
 * AppShell — 모든 페이지(login 제외) 공통 레이아웃
 * .app grid (sidebar 240px + main 1fr) + Sidebar
 *
 * 사용:
 *   <AppShell>
 *     <main className="main">...</main>
 *   </AppShell>
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  // 활성 장르 상태 — 향후 작가 프로필이나 URL param으로 끌어옴
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  return (
    <div className="app">
      <Sidebar activeGenre={activeGenre} onGenreChange={setActiveGenre} />
      {children}
    </div>
  );
}
