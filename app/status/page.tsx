"use client";

import { useEffect, useState } from "react";
import { Symbol } from "@/components/Symbol";

interface ServiceStatus {
  name: string;
  status: "ok" | "degraded" | "down";
  detail?: string;
  responseTimeMs?: number;
}

interface HealthResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  version: string;
  services: ServiceStatus[];
}

const SERVICE_LABEL: Record<string, string> = {
  config: "환경 설정",
  supabase: "데이터베이스 (Supabase)",
  vercel: "웹 호스팅 (Vercel)",
  anthropic: "AI 응답 (Anthropic)",
};

const STATUS_COLOR: Record<ServiceStatus["status"], string> = {
  ok: "#3DDAB4",
  degraded: "#FFB347",
  down: "#FF6B6B",
};

const STATUS_LABEL: Record<ServiceStatus["status"], string> = {
  ok: "정상",
  degraded: "지연",
  down: "장애",
};

export default function StatusPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function check(): Promise<void> {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const json = (await res.json()) as HealthResponse;
      setData(json);
      setError(null);
      setLastChecked(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
      setLastChecked(new Date());
    }
  }

  useEffect(() => {
    check();
    const t = setInterval(check, 30000); // 30초 간격
    return () => clearInterval(t);
  }, []);

  const overall: ServiceStatus["status"] = data?.status ?? (error ? "down" : "degraded");

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--line)" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--ink)" }}>
          <span style={{ width: 28, height: 28, color: "var(--ink)" }}><Symbol size={28} /></span>
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, fontWeight: 500 }}>
            Story Maker<span style={{ color: "var(--coral)" }}>.</span>
          </span>
        </a>
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 32px" }}>
        <div style={{ fontSize: 11, color: "var(--ink-5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          — SYSTEM STATUS
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em", margin: 0, color: "var(--ink)" }}>
          서비스 상태<span style={{ color: "var(--coral)" }}>.</span>
        </h1>

        {/* 종합 상태 */}
        <section style={{ marginTop: 32, padding: "28px 24px", background: "var(--card)", border: `2px solid ${STATUS_COLOR[overall]}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: STATUS_COLOR[overall], boxShadow: `0 0 12px ${STATUS_COLOR[overall]}` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>
              {overall === "ok" && "모든 서비스 정상 작동 중"}
              {overall === "degraded" && "일부 서비스 지연"}
              {overall === "down" && "장애 발생"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-4)" }}>
              {lastChecked ? `마지막 확인: ${lastChecked.toLocaleString("ko-KR")}` : "확인 중..."}
              {data && ` · ${data.version}`}
            </div>
          </div>
          <button
            onClick={check}
            style={{ padding: "8px 14px", fontSize: 12, background: "transparent", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink-3)", cursor: "pointer" }}
          >
            새로고침
          </button>
        </section>

        {/* 개별 서비스 */}
        <section style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 12, textTransform: "uppercase" }}>
            세부 구성요소
          </div>
          {error && (
            <div style={{ padding: "16px 20px", background: "rgba(255, 90, 90, 0.08)", border: "1px solid rgba(255, 90, 90, 0.35)", borderRadius: 8, color: "var(--coral)", fontSize: 14, marginBottom: 12 }}>
              상태 확인 실패: {error}
            </div>
          )}
          {data?.services.map(svc => (
            <div key={svc.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLOR[svc.status] }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "var(--ink-1)", fontWeight: 500 }}>
                  {SERVICE_LABEL[svc.name] ?? svc.name}
                </div>
                {svc.detail && (
                  <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 2 }}>{svc.detail}</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: STATUS_COLOR[svc.status], fontWeight: 600 }}>
                  {STATUS_LABEL[svc.status]}
                </div>
                {typeof svc.responseTimeMs === "number" && (
                  <div style={{ fontSize: 11, color: "var(--ink-5)", marginTop: 2 }}>{svc.responseTimeMs}ms</div>
                )}
              </div>
            </div>
          ))}
        </section>

        <div style={{ marginTop: 32, fontSize: 12, color: "var(--ink-5)", textAlign: "center" }}>
          <a href="/" style={{ color: "var(--ink-4)", textDecoration: "none", marginRight: 16 }}>← 홈으로</a>
          <a href="/changelog" style={{ color: "var(--ink-4)", textDecoration: "none" }}>변경 이력</a>
        </div>
      </div>
    </main>
  );
}
