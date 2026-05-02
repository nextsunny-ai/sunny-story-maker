"use client";

import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";

export default function OsmuPage() {
  return (
    <AppShell>
      <main className="main">
        <Topbar
          eyebrow="CREATE — OSMU"
          title='OSMU<span class="dot">.</span>'
          sub="원천 IP를 다른 매체로 확장. 드라마 → 영화, 웹툰 → 소설, 다큐 → 전시 등. 디자인 준비 중."
        />
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-4)" }}>
          준비 중인 화면입니다.
        </div>
      </main>
    </AppShell>
  );
}
