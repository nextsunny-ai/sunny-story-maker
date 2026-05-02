import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZIP_PATH = path.join(process.cwd(), "_private_downloads", "sunny-story-maker-local.zip");

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 요청입니다." }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  const expected = process.env.DOWNLOAD_PASSWORD || "sunny2026@";
  if (body.password !== expected) {
    return new Response(JSON.stringify({ error: "암호가 올바르지 않습니다. 사장님께 문의해주세요." }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  try {
    const data = await readFile(ZIP_PATH);
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="sunny-story-maker-local.zip"`,
        "content-length": String(data.length),
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "파일을 찾을 수 없습니다." }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
