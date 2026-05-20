"use client";

// V3.1 F1 — 사장님 운영 대시보드.
// 작가 피드백·에러·구독·신규 가입을 한 화면. Supabase 콘솔 X.

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

interface Feedback {
  id: string;
  user_email: string | null;
  category: string;
  message: string;
  page_url: string | null;
  app_version: string | null;
  resolved: boolean;
  created_at: string;
}

interface ErrorLog {
  id: string;
  user_email: string | null;
  message: string;
  source: string | null;
  url: string | null;
  app_version: string | null;
  created_at: string;
}

interface Subscription {
  user_id: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string | null;
}

interface DashboardData {
  recentFeedbacks: Feedback[];
  recentErrors: ErrorLog[];
  subscriptions: Subscription[];
  counts: {
    totalUsers: number;
    totalFeedbacks: number;
    totalErrors24h: number;
    activeSubscriptions: number;
    trial: number;
  };
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardMain />
    </AppShell>
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function DashboardMain() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const d = await res.json() as DashboardData;
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // 30초마다 자동 갱신
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return <main className="main"><div style={{ padding: 40, textAlign: "center", color: "var(--ink-4)" }}>대시보드 불러오는 중…</div></main>;
  }
  if (error) {
    return <main className="main"><div style={{ padding: 40, textAlign: "center", color: "var(--ink-2)" }}>
      ⚠ {error}
      <br />
      <button onClick={load} style={{ marginTop: 16, padding: "8px 16px", background: "var(--coral)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>다시 시도</button>
    </div></main>;
  }
  if (!data) return null;

  return (
    <main className="main" style={{ padding: "32px 32px 60px" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>운영 대시보드</h1>
        <button onClick={load} style={{ padding: "6px 14px", fontSize: 12, background: "transparent", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer", color: "var(--ink-3)" }}>↻ 새로고침</button>
      </div>

      {/* 카운트 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
        <Card label="작가 총합" value={data.counts.totalUsers} />
        <Card label="활성 구독" value={data.counts.activeSubscriptions} accent="green" />
        <Card label="체험판" value={data.counts.trial} />
        <Card label="누적 피드백" value={data.counts.totalFeedbacks} />
        <Card label="24h 에러" value={data.counts.totalErrors24h} accent={data.counts.totalErrors24h > 0 ? "red" : "ink"} />
      </div>

      {/* 작가 피드백 */}
      <Section title={`📋 최근 작가 피드백 (${data.recentFeedbacks.length}개)`}>
        {data.recentFeedbacks.length === 0 ? <Empty>피드백 없음</Empty> : (
          <Table>
            <thead>
              <tr><Th>시간</Th><Th>작가</Th><Th>카테고리</Th><Th>메시지</Th><Th>버전</Th></tr>
            </thead>
            <tbody>
              {data.recentFeedbacks.map(f => (
                <tr key={f.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <Td>{fmtTime(f.created_at)}</Td>
                  <Td>{f.user_email || "—"}</Td>
                  <Td><Pill color={f.category === "bug" ? "red" : f.category === "feature" ? "blue" : "ink"}>{f.category}</Pill></Td>
                  <Td title={f.message}>{f.message.slice(0, 100)}{f.message.length > 100 ? "…" : ""}</Td>
                  <Td>{f.app_version || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      {/* 클라이언트 에러 */}
      <Section title={`🚨 최근 클라이언트 에러 (${data.recentErrors.length}개)`}>
        {data.recentErrors.length === 0 ? <Empty>에러 없음 — 안정 ✅</Empty> : (
          <Table>
            <thead>
              <tr><Th>시간</Th><Th>작가</Th><Th>소스</Th><Th>메시지</Th><Th>URL</Th></tr>
            </thead>
            <tbody>
              {data.recentErrors.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <Td>{fmtTime(e.created_at)}</Td>
                  <Td>{e.user_email || "(비로그인)"}</Td>
                  <Td>{e.source || "?"}</Td>
                  <Td title={e.message} style={{ color: "var(--coral-deep, #c84738)" }}>{e.message.slice(0, 80)}{e.message.length > 80 ? "…" : ""}</Td>
                  <Td>{e.url ? e.url.replace(/^https?:\/\/[^/]+/, "") : "?"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      {/* 구독 */}
      <Section title={`💳 구독 (${data.subscriptions.length}명)`}>
        {data.subscriptions.length === 0 ? <Empty>구독 없음</Empty> : (
          <Table>
            <thead>
              <tr><Th>작가 ID</Th><Th>플랜</Th><Th>상태</Th><Th>시작</Th><Th>만료</Th><Th>변경</Th></tr>
            </thead>
            <tbody>
              {data.subscriptions.map(s => (
                <tr key={s.user_id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{s.user_id.slice(0, 8)}…</Td>
                  <Td><Pill color={s.plan === "pro" ? "green" : s.plan === "trial_30days" ? "blue" : s.plan === "banned" ? "red" : "ink"}>{s.plan}</Pill></Td>
                  <Td>{s.status}</Td>
                  <Td>{fmtTime(s.started_at)}</Td>
                  <Td>{s.expires_at ? fmtTime(s.expires_at) : "—"}</Td>
                  <Td><PlanChangeMenu userId={s.user_id} current={s.plan} onChanged={load} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </main>
  );
}

function Card({ label, value, accent = "ink" }: { label: string; value: number; accent?: "ink" | "red" | "green" | "blue" }) {
  const color = { ink: "var(--ink-1)", red: "#c84738", green: "#10b981", blue: "#3b82f6" }[accent];
  return (
    <div style={{ padding: "16px 14px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}>
      <div style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value.toLocaleString()}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
        {children}
      </div>
    </section>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        {children}
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "var(--ink-4)", borderBottom: "1px solid var(--line)", background: "var(--card-soft)" }}>{children}</th>;
}

function Td({ children, style, title }: { children: React.ReactNode; style?: React.CSSProperties; title?: string }) {
  return <td title={title} style={{ padding: "8px 12px", color: "var(--ink-2)", verticalAlign: "top", ...style }}>{children}</td>;
}

function Pill({ children, color }: { children: React.ReactNode; color: "ink" | "red" | "green" | "blue" }) {
  const bg = { ink: "var(--card-soft)", red: "#fee2e2", green: "#dcfce7", blue: "#dbeafe" }[color];
  const fg = { ink: "var(--ink-3)", red: "#c84738", green: "#15803d", blue: "#1e40af" }[color];
  return <span style={{ padding: "2px 8px", borderRadius: 999, background: bg, color: fg, fontSize: 11, fontWeight: 600 }}>{children}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 32, textAlign: "center", color: "var(--ink-5)", fontSize: 13 }}>{children}</div>;
}

// ★ V3.1 F2 — 작가 plan 변경 인라인 메뉴
function PlanChangeMenu({ userId, current, onChanged }: { userId: string; current: string; onChanged: () => void }) {
  const plans = ["trial_30days", "free", "pro", "studio", "lifetime", "banned"];
  return (
    <select
      defaultValue={current}
      onChange={async (e) => {
        const next = e.target.value;
        if (next === current) return;
        if (!confirm(`작가 ${userId.slice(0, 8)}… 의 plan을 "${current}" → "${next}"로 변경할까요?`)) {
          e.target.value = current;
          return;
        }
        try {
          const res = await fetch("/api/admin/subscription", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ userId, plan: next }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert(`변경 실패: ${j.error || res.status}`);
            e.target.value = current;
            return;
          }
          onChanged();
        } catch (err) {
          alert(`변경 실패: ${err instanceof Error ? err.message : String(err)}`);
          e.target.value = current;
        }
      }}
      style={{ fontSize: 11, padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--card)", color: "var(--ink-2)" }}
    >
      {plans.map(p => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}
