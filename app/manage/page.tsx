"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  name: string;
}

interface Stats {
  total: number;
  byProvider: Record<string, number>;
  last7d: number;
  last30d: number;
}

interface ApiResponse {
  users?: AdminUser[];
  stats?: Stats;
  adminEmails?: string[];
  error?: string;
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtDateShort(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function ManagePage() {
  return (
    <AppShell>
      <ManageMain />
    </AppShell>
  );
}

type LoadState = "loading" | "ready" | "forbidden" | "error";

function isTauriEnv(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

interface ClaudeCliInfo {
  available: boolean;
  reason: string;
  error: string | null;
}

function ManageMain() {
  const [state, setState] = useState<LoadState>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string>("");
  // ★ Claude CLI 로그인 상태 (= 데스크탑 앱에서만 검사 가능)
  const [cliInfo, setCliInfo] = useState<ClaudeCliInfo | "web" | "checking">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isTauriEnv()) { if (!cancelled) setCliInfo("web"); return; }
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const res = await invoke<ClaudeCliInfo>("claude_cli_status");
        if (!cancelled) setCliInfo(res);
      } catch (e) {
        if (!cancelled) setCliInfo({ available: false, reason: "error", error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const json: ApiResponse = await res.json();
      if (res.status === 403) {
        setState("forbidden");
        setErrorMsg(json.error || "관리자 권한이 없습니다.");
        return;
      }
      if (!res.ok || json.error) {
        setState("error");
        setErrorMsg(json.error || `HTTP ${res.status}`);
        return;
      }
      setUsers(json.users || []);
      setStats(json.stats || null);
      setAdminEmails((json.adminEmails || []).map((e) => e.toLowerCase()));
      setState("ready");
    } catch (e) {
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.provider.toLowerCase().includes(q)
    );
  }, [users, query]);

  const onDelete = async (u: AdminUser) => {
    if (adminEmails.includes(u.email.toLowerCase())) {
      alert(`관리자 계정(${u.email})은 삭제할 수 없습니다.`);
      return;
    }
    if (!confirm(`'${u.email}' 가입자를 삭제하시겠습니까?\n\n되돌릴 수 없습니다.`)) return;
    setDeletingId(u.id);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(u.id)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) {
        alert(`삭제 실패: ${json.error || `HTTP ${res.status}`}`);
        return;
      }
      // 성공 = list에서 제거
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      // 통계는 다시 로드
      void load();
    } catch (e) {
      alert(`삭제 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeletingId("");
    }
  };

  // ─── 권한 없음 ───
  if (state === "forbidden") {
    return (
      <main className="main">
        <Topbar eyebrow="MANAGE" title="가입자 관리" sub="" />
        <div style={{ maxWidth: 560, margin: "60px auto", padding: "32px 36px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 10px", color: "var(--ink)" }}>관리자 권한이 없습니다</h2>
          <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, margin: 0 }}>{errorMsg}</p>
          <p style={{ fontSize: 13, color: "var(--ink-4)", marginTop: 16 }}>이 페이지는 대표님 계정만 접근할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <Topbar
        eyebrow="MANAGE — 가입자 관리"
        title={`<em style="font-style:italic">SUNNY Story Maker</em> 가입자<span class="dot">.</span>`}
        sub="전체 가입자 조회 + 삭제 + 통계 — 대표님 전용"
      />

      {/* ★ Claude CLI 로그인 상태 배너 */}
      <ClaudeCliBanner info={cliInfo} />

      {/* 통계 카드 */}
      {state === "ready" && stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, margin: "20px 0 28px" }}>
          <StatCard label="총 가입자" value={String(stats.total)} accent />
          <StatCard label="최근 7일" value={`+${stats.last7d}`} />
          <StatCard label="최근 30일" value={`+${stats.last30d}`} />
          {Object.entries(stats.byProvider).map(([p, n]) => (
            <StatCard key={p} label={`${p} 로그인`} value={String(n)} />
          ))}
        </div>
      )}

      {/* 검색 + 새로고침 */}
      {state === "ready" && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이메일·이름·provider 검색…"
            style={{ flex: 1, minWidth: 220, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "var(--card)", color: "var(--ink-1)" }}
          />
          <button onClick={() => void load()} style={{ padding: "10px 16px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14, background: "var(--card-soft)", color: "var(--ink-1)", cursor: "pointer" }}>
            ↻ 새로고침
          </button>
          <span style={{ fontSize: 13, color: "var(--ink-4)" }}>{filtered.length} / {users.length}명</span>
        </div>
      )}

      {/* 로딩 */}
      {state === "loading" && (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-4)", fontSize: 14 }}>가입자 목록 불러오는 중…</div>
      )}

      {/* 에러 */}
      {state === "error" && (
        <div style={{ padding: "24px", background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12, color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6 }}>
          <strong>불러오기 실패</strong><br />
          {errorMsg}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => void load()} style={{ padding: "8px 14px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)", cursor: "pointer" }}>다시 시도</button>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 12 }}>
            (= SUPABASE_SERVICE_ROLE_KEY 환경변수가 production Vercel에 설정돼 있어야 합니다)
          </p>
        </div>
      )}

      {/* 테이블 */}
      {state === "ready" && (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--card-soft)", textAlign: "left" }}>
                <th style={thStyle}>이메일</th>
                <th style={thStyle}>이름</th>
                <th style={thStyle}>로그인 방식</th>
                <th style={thStyle}>가입일</th>
                <th style={thStyle}>최근 로그인</th>
                <th style={{ ...thStyle, textAlign: "right" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "var(--ink-4)" }}>검색 결과 없음</td></tr>
              )}
              {filtered.map((u) => {
                const isAdmin = adminEmails.includes(u.email.toLowerCase());
                return (
                  <tr key={u.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={tdStyle}>
                      {u.email}
                      {isAdmin && <span style={{ marginLeft: 6, fontSize: 11, padding: "2px 6px", borderRadius: 5, background: "rgba(120,200,140,0.12)", color: "var(--ink-3)" }}>관리자</span>}
                    </td>
                    <td style={tdStyle}>{u.name || "—"}</td>
                    <td style={tdStyle}>{u.provider}</td>
                    <td style={tdStyle}>{fmtDateShort(u.created_at)}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "var(--ink-4)" }}>{fmtDate(u.last_sign_in_at)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button
                        onClick={() => void onDelete(u)}
                        disabled={isAdmin || deletingId === u.id}
                        style={{
                          padding: "6px 12px",
                          fontSize: 13,
                          border: "1px solid " + (isAdmin ? "var(--line)" : "rgba(255,107,107,0.3)"),
                          borderRadius: 8,
                          background: isAdmin ? "var(--card-soft)" : "rgba(255,107,107,0.06)",
                          color: isAdmin ? "var(--ink-5)" : "var(--coral, #d44)",
                          cursor: isAdmin ? "not-allowed" : (deletingId === u.id ? "wait" : "pointer"),
                        }}
                      >
                        {deletingId === u.id ? "삭제 중…" : isAdmin ? "보호됨" : "삭제"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {state === "ready" && (
        <p style={{ fontSize: 12, color: "var(--ink-5)", marginTop: 20, lineHeight: 1.7 }}>
          ★ 관리자 계정(nextsunny@gmail.com·effectgod@gmail.com)은 = 실수 방지 위해 = 이 페이지에서 삭제 불가 (= Supabase 콘솔에서만).<br />
          ★ Supabase 콘솔 직접 = <a href="https://supabase.com/dashboard/project/lcasxovjrgbnraxzyvnf/auth/users" target="_blank" rel="noreferrer" style={{ color: "var(--ink-3)", textDecoration: "underline" }}>Authentication → Users</a>
        </p>
      )}
    </main>
  );
}

function ClaudeCliBanner({ info }: { info: ClaudeCliInfo | "web" | "checking" }) {
  if (info === "checking") return null;

  let bg: string, border: string, color: string, icon: string, title: string, desc: string;
  if (info === "web") {
    bg = "rgba(0,0,0,0.03)"; border = "var(--line)"; color = "var(--ink-3)"; icon = "🌐";
    title = "웹 브라우저에서 보는 중";
    desc = "Claude CLI 로그인 상태는 = 데스크탑 앱(SUNNY Story Maker.exe)에서 이 페이지를 열면 표시됩니다. 데스크탑 앱 = 작가 본인 PC의 Claude CLI를 통해 작동 (= API 안 씀).";
  } else if (info.available) {
    bg = "rgba(120,200,140,0.08)"; border = "rgba(120,200,140,0.3)"; color = "#2d6a3e"; icon = "✅";
    title = "Claude CLI 로그인됨 — API 안 씀 (작가 본인 구독으로 작동)";
    desc = "이 PC의 Claude Code CLI가 로그인돼 있어 = 작가 본인의 Claude Pro/Max 구독으로 AI가 작동합니다. Anthropic API key(종량제)를 쓰지 않습니다 = 사장님 비용 0 + 작가 추가 비용 0.";
  } else {
    bg = "rgba(255,107,107,0.06)"; border = "rgba(255,107,107,0.25)"; color = "#a33"; icon = "⚠️";
    title = info.reason === "not-installed" ? "Claude Code CLI 미설치" : "Claude CLI 미로그인";
    desc = info.error || "AI 작업하려면 = 본인 PC에 Claude Code CLI 설치 + claude /login 필요. (= 작가 첫 실행 시 자동 안내 모달이 뜸)";
  }

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 18px", background: bg, border: `1px solid ${border}`, borderRadius: 12, margin: "16px 0 8px" }}>
      <div style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: "16px 18px", background: accent ? "rgba(255,107,107,0.06)" : "var(--card)", border: "1px solid " + (accent ? "rgba(255,107,107,0.2)" : "var(--line)"), borderRadius: 12 }}>
      <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", color: "var(--ink-1)", whiteSpace: "nowrap" };
