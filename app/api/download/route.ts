import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OS별 zip 파일 (사장님이 _private_downloads/ 에 두 개 둠).
// fallback = 단일 zip (둘 다 들어있는 통합본).
const ZIP_DIR = path.join(process.cwd(), "_private_downloads");
const ZIP_FILES = {
  mac: "sunny-story-maker-mac.zip",
  windows: "sunny-story-maker-windows.zip",
  fallback: "sunny-story-maker-local.zip",
} as const;

type OS = "mac" | "windows";

interface DownloadRequest {
  invite?: string;
  // 옛 password 필드도 호환 (구 클라이언트 — 다음 라운드에 제거)
  password?: string;
  os?: OS;
}

async function tryReadZip(os: OS): Promise<{ data: Buffer; filename: string } | null> {
  const candidates = [ZIP_FILES[os], ZIP_FILES.fallback];
  for (const name of candidates) {
    try {
      const data = await readFile(path.join(ZIP_DIR, name));
      // 다운로드 시 = OS별 이름으로 (fallback이라도)
      const downloadName = `sunny-story-maker-${os}.zip`;
      return { data: data as Buffer, filename: downloadName };
    } catch {
      // 다음 후보
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: DownloadRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 요청입니다." }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  // 초대 코드 검증 — INVITE_CODE 우선, 옛 DOWNLOAD_PASSWORD도 호환
  // 사장님 명시 2026-05-04: 회원가입 = SUNNY2026! / 다운로드 = SUNNY2026@ (둘 다 대문자)
  const expectedInvite = process.env.INVITE_CODE || "SUNNY2026!";
  const expectedPassword = process.env.DOWNLOAD_PASSWORD || "SUNNY2026@";
  const provided = (body.invite || body.password || "").trim();
  if (!provided) {
    return new Response(JSON.stringify({ error: "초대 코드를 입력해주세요." }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }
  // 옛 호환 — sunny2026@ 소문자도 허용
  const legacyPassword = "sunny2026@";
  if (provided !== expectedInvite && provided !== expectedPassword && provided !== legacyPassword) {
    return new Response(JSON.stringify({
      error: "초대 코드가 올바르지 않습니다. 베타 한정 — 사장님께 문의해주세요.",
    }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  // OS 결정 — 명시 X 시 mac default
  const os: OS = body.os === "windows" ? "windows" : "mac";

  const file = await tryReadZip(os);
  if (!file) {
    return new Response(JSON.stringify({
      error: `다운로드 파일이 준비되지 않았습니다. _private_downloads/${ZIP_FILES[os]} 또는 ${ZIP_FILES.fallback}를 서버에 두어 주세요.`,
    }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${file.filename}"`,
      "content-length": String(file.data.length),
      "cache-control": "no-store",
    },
  });
}
