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
  version: "1.1.1",
  pub_date: "2026-05-27T00:00:00Z",
  notes:
    "v1.1.1 긴급 정정 — 데스크탑 앱 채팅 사고 (= Tauri 환경 인식 X = API 키 검증 alert 박힘) 정정. sendChat = Tauri 환경 = API 키 검증 skip = Claude CLI subprocess 정상 호출.",
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
