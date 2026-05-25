// /api/agent-updater-download/{target} — SUNNY Agent Pro 자동 업데이터 다운로드 endpoint (GET)
// ★ v1.1.1 = GitHub Releases redirect (= _agent_downloads/ 옛 파일 박힘 사고 영구 정정 = 항상 최신 빌드)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ★ 매 릴리스 시 = 본 LATEST_TAG 갱신 의무 (= 같은 LATEST.version 박혀있는 /api/agent-updater route.ts와 일치)
const LATEST_TAG = "release-v1.1.1";

const TARGETS: Record<string, string> = {
  windows: `SUNNY.Agent.Pro_1.1.1_x64-setup.exe`,
  "darwin-aarch64": `SUNNY.Agent.Pro_1.1.1_aarch64.dmg`,
  "darwin-x86_64": `SUNNY.Agent.Pro_1.1.1_x64.dmg`,
};

interface Params {
  target: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const { target } = await params;
  const filename = TARGETS[target];
  if (!filename) {
    return new Response(
      JSON.stringify({ error: `Unsupported target: ${target}` }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  }
  const url = `https://github.com/nextsunny-ai/agent-sunnytoon/releases/download/${LATEST_TAG}/${filename}`;
  return Response.redirect(url, 302);
}
