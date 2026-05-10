import { NextResponse } from "next/server";

/**
 * Health Check API
 *
 * Status page (`/status`)와 외부 uptime 모니터링 (UptimeRobot 등)이 호출.
 *
 * 검증:
 * - Supabase 도달 가능 여부 (HEAD 요청)
 * - 환경변수 존재 (Supabase URL/Key)
 *
 * 응답:
 * - 200 OK = 모든 서비스 정상
 * - 503 = 일부 서비스 장애
 */

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface ServiceStatus {
  name: string;
  status: "ok" | "degraded" | "down";
  detail?: string;
  responseTimeMs?: number;
}

async function checkSupabase(url: string): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    return {
      name: "supabase",
      status: res.status < 500 ? "ok" : "degraded",
      responseTimeMs: Date.now() - start,
    };
  } catch (e) {
    return {
      name: "supabase",
      status: "down",
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
  if (!supabaseUrl || !supabaseKey) {
    services.push({
      name: "config",
      status: "down",
      detail: "Supabase 환경변수 누락",
    });
  } else {
    services.push({
      name: "config",
      status: "ok",
    });
    services.push(await checkSupabase(supabaseUrl));
  }

  const allOk = services.every(s => s.status === "ok");
  const anyDown = services.some(s => s.status === "down");

  return NextResponse.json({
    status: allOk ? "ok" : anyDown ? "down" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "v2.11",
    services,
  }, {
    status: anyDown ? 503 : 200,
    headers: {
      "cache-control": "no-store, max-age=0",
    },
  });
}
