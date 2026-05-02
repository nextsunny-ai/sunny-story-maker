"use client";

import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";

export default function AdaptPage() {
  return (
    <AppShell>
      <main className="main">
        <Topbar
          eyebrow="CREATE — ADAPT"
          title='각색<span class="dot">.</span>'
          sub="기존 시나리오를 다른 매체·길이·톤으로 옮기는 작업. 디자인 준비 중."
        />
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-4)" }}>
          준비 중인 화면입니다.
        </div>
      </main>
    </AppShell>
  );
}
