// /api/agent-updater/{target}/{arch}/{current_version}
// SUNNY Agent Pro 데스크탑 앱 자동 업데이터 (= 별도 = agent.sunnytoon.com에 API 없음, story.sunnytoon.com Vercel 활용)
//
// Tauri 응답 형식 = 스토리메이커 /api/updater와 동일.

import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 현재 라이브 버전 (= 매 릴리스 시 갱신)
const LATEST = {
  version: "1.0.0",
  pub_date: "2026-05-13T09:00:00Z",
  notes:
    "V1.0.0 — 에이전트 프로 데스크탑 .exe 출시. 12명 SUNNY 에이전트 + claude CLI subprocess (= 작가 본인 Pro/Max 구독으로 비용 0).",
};

interface Params {
  target: string;
  arch: string;
  current_version: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function readSignature(installerFilename: string): string {
  const sigPath = path.join(process.cwd(), "_agent_downloads", `${installerFilename}.sig`);
  if (!existsSync(sigPath)) return "";
  try {
    return readFileSync(sigPath, "utf-8").trim();
  } catch {
    return "";
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const { target, arch, current_version } = await params;

  if (compareVersions(current_version, LATEST.version) >= 0) {
    return new Response(null, { status: 204 });
  }

  const platformKey =
    target === "windows" ? `windows-${arch}` :
    target === "darwin" ? `darwin-${arch}` :
    target === "linux" ? `linux-${arch}` :
    `${target}-${arch}`;

  let downloadUrl: string | null = null;
  let installerFilename: string | null = null;
  if (target === "windows") {
    installerFilename = "sunny-agent-pro-windows.exe";
    downloadUrl = "https://story.sunnytoon.com/api/agent-updater-download/windows";
  }

  if (!downloadUrl || !installerFilename) {
    return new Response(null, { status: 204 });
  }

  const signature = readSignature(installerFilename);

  return NextResponse.json({
    version: LATEST.version,
    pub_date: LATEST.pub_date,
    notes: LATEST.notes,
    platforms: {
      [platformKey]: {
        url: downloadUrl,
        signature,
      },
    },
  });
}
