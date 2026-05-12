// /api/updater-download/{target} — Tauri 자동 업데이터 전용 다운로드 endpoint (GET)
//
// V2.12 자동 업데이터 path:
// 1. /api/updater/{target}/{arch}/{current_version} = signature + url 응답
// 2. Tauri auto-updater = url에서 .exe 다운로드 + signature 검증 (pubkey 박혀있음)
// 3. 검증 통과 = 자동 설치 = 작가 = 1 클릭
//
// 옛 /api/download/route.ts = POST + 인증 필요 (= 사용자 다운로드용).
// 이 endpoint = 자동 업데이터 전용 = GET + 인증 X = signature 검증으로 위변조 방지.

import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DL_DIR = path.join(process.cwd(), "_private_downloads");

const TARGETS: Record<string, { file: string; contentType: string }> = {
  windows: {
    file: "sunny-story-maker-windows.exe",
    contentType: "application/vnd.microsoft.portable-executable",
  },
  // macOS·Linux = .dmg / .AppImage 빌드 후 추가
};

interface Params {
  target: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const { target } = await params;

  const cfg = TARGETS[target];
  if (!cfg) {
    return new Response(
      JSON.stringify({ error: `Unsupported target: ${target}` }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const data = await readFile(path.join(DL_DIR, cfg.file));
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": cfg.contentType,
        "content-disposition": `attachment; filename="${cfg.file}"`,
        "content-length": String(data.length),
        // 자동 업데이터 = 매번 새 버전 받음 = cache 짧게
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Installer not available", target }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  }
}
