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
  version: "1.1.0",
  pub_date: "2026-05-26T12:00:00Z",
  notes:
    "v1.1.0 — 6 영역 9/10 정정. 보안 (CSP·ADMIN RPC·JWT RS256 path·XSS scheme)·UX (Hero 한국어·OAuth 녹색·페르소나 예시 chip·첫 셋업 7단계)·UI (이모지 → Lucide·아바타 정정·AP 단색)·백엔드 (CHECK·테이블·인덱스·owner 함수)·SKILL (sys_prompt v2 풀세트 + 카드 copy 정정)·유료화 path (Plan 게이트 flag·LemonSqueezy stub). terms·privacy 신규.",
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
