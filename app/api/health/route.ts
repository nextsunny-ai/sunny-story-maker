import { NextResponse } from "next/server";
import { STORYMAKER_VERSION } from "@/lib/storymaker/version";

/**
 * Health Check API
 *
 * Status page (`/status`)와 외부 uptime 모니터링 (UptimeRobot 등)이 호출.
 *
 * V3.1 F4 강화:
 * - Supabase REST API 도달
 * - Supabase Auth endpoint 도달
 * - Anthropic API status (옵션 — 환경변수 박혀있을 때만)
 * - Vercel deployment 자체 (= 이 요청이 도달하면 OK)
 * - 환경변수 점검
 * - 버전·release date·node version·timestamp
 *
 * 응답:
 * - 200 OK = 모든 서비스 정상
 * - 503 = 일부 서비스 장애 (= status: "down")
 */

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface ServiceStatus {
  name: string;
  status: "ok" | "degraded" | "down";
  detail?: string;
  responseTimeMs?: number;
}

async function checkSupabaseRest(url: string): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    return {
      name: "supabase-rest",
      status: res.status < 500 ? "ok" : "degraded",
      responseTimeMs: Date.now() - start,
    };
  } catch (e) {
    return {
      name: "supabase-rest",
      status: "down",
      detail: e instanceof Error ? e.message : "unknown",
      responseTimeMs: Date.now() - start,
    };
  }
}

async function checkSupabaseAuth(url: string): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return {
      name: "supabase-auth",
      status: res.ok ? "ok" : "degraded",
      responseTimeMs: Date.now() - start,
    };
  } catch (e) {
    return {
      name: "supabase-auth",
      status: "down",
      detail: e instanceof Error ? e.message : "unknown",
      responseTimeMs: Date.now() - start,
    };
  }
}

async function checkAnthropic(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch("https://status.anthropic.com/api/v2/status.json", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { name: "anthropic", status: "degraded", responseTimeMs: Date.now() - start };
    }
    const data = await res.json() as { status?: { indicator?: string; description?: string } };
    const indicator = data.status?.indicator;
    return {
      name: "anthropic",
      status: indicator === "none" ? "ok" : indicator === "minor" || indicator === "maintenance" ? "degraded" : "down",
      detail: data.status?.description,
      responseTimeMs: Date.now() - start,
    };
  } catch (e) {
    return {
      name: "anthropic",
      status: "degraded",
      detail: e instanceof Error ? e.message : "unknown",
      responseTimeMs: Date.now() - start,
    };
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const services: ServiceStatus[] = [];

  // 환경변수 검증
  const hasSupabaseConfig = supabaseUrl && supabaseKey
    && !supabaseUrl.includes("placeholder")
    && !supabaseKey.includes("placeholder");
  if (!hasSupabaseConfig) {
    services.push({
      name: "config",
      status: "down",
      detail: "Supabase 환경변수 누락 또는 placeholder",
    });
  } else {
    services.push({ name: "config", status: "ok" });
    // 병렬 health check
    const [rest, auth, anthropic] = await Promise.all([
      checkSupabaseRest(supabaseUrl!),
      checkSupabaseAuth(supabaseUrl!),
      checkAnthropic(),
    ]);
    services.push(rest, auth, anthropic);
  }

  // Vercel 자체 (= 이 요청이 도달하면 OK)
  services.push({ name: "vercel-edge", status: "ok" });

  const allOk = services.every(s => s.status === "ok");
  const anyDown = services.some(s => s.status === "down");

  return NextResponse.json({
    status: allOk ? "ok" : anyDown ? "down" : "degraded",
    timestamp: new Date().toISOString(),
    version: STORYMAKER_VERSION.version,
    releaseDate: STORYMAKER_VERSION.releaseDate,
    region: process.env.VERCEL_REGION || "unknown",
    git: {
      branch: process.env.VERCEL_GIT_COMMIT_REF || "unknown",
      sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "unknown",
    },
    services,
  }, {
    status: anyDown ? 503 : 200,
    headers: {
      "cache-control": "no-store, max-age=0",
      "access-control-allow-origin": "*",
    },
  });
}
