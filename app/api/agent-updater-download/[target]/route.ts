// /api/agent-updater-download/{target} — SUNNY Agent Pro 자동 업데이터 전용 다운로드 endpoint (GET)
// 인증 X = signature 검증으로 위변조 방지.

import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DL_DIR = path.join(process.cwd(), "_agent_downloads");

const TARGETS: Record<string, { file: string; contentType: string }> = {
  windows: {
    file: "sunny-agent-pro-windows.exe",
    contentType: "application/vnd.microsoft.portable-executable",
  },
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
