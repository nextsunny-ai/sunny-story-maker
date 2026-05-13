import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 다운로드 API — V2.11.2 (2026-05-11)
 *
 * 모델:
 * - **Windows Tauri .exe (메인)** = NSIS installer 4.5MB = 더블클릭 = 자동 설치
 * - Mac ZIP (옵션) = 옛 V2.11 자동 설치 스크립트 path
 * - Windows ZIP (옵션) = 옛 V2.11 자동 설치 스크립트 path
 *
 * 인증:
 * - 우선 = Supabase 로그인 (= 가입한 작가 = 자동 통과)
 * - fallback = 옛 INVITE_CODE (sunny2026!·sunny2026@ 등 = 옛 작가 호환)
 */

const DL_DIR = path.join(process.cwd(), "_private_downloads");

const FILES = {
  "windows-exe": {
    file: "sunny-story-maker-windows.exe",
    download: "SUNNY Story Maker Setup.exe",
    contentType: "application/vnd.microsoft.portable-executable",
  },
  windows: {
    file: "sunny-story-maker-windows.zip",
    download: "sunny-story-maker-windows.zip",
    contentType: "application/zip",
  },
  mac: {
    // ★ V2.13.0 — 진짜 macOS .dmg (Apple Silicon aarch64) = GitHub Actions 빌드
    file: "sunny-story-maker-mac.dmg",
    download: "SUNNY Story Maker.dmg",
    contentType: "application/x-apple-diskimage",
  },
  fallback: {
    file: "sunny-story-maker-local.zip",
    download: "sunny-story-maker-local.zip",
    contentType: "application/zip",
  },
} as const;

type OS = "windows-exe" | "windows" | "mac";

interface DownloadRequest {
  invite?: string;
  password?: string;
  os?: OS;
}

async function tryReadFile(os: OS): Promise<{ data: Buffer; filename: string; contentType: string } | null> {
  const primary = FILES[os];
  const fallback = FILES.fallback;
  for (const opt of [primary, fallback]) {
    try {
      const data = await readFile(path.join(DL_DIR, opt.file));
      return {
        data: data as Buffer,
        filename: primary.download,
        contentType: primary.contentType,
      };
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
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // ★ 1차 = Supabase 로그인 검증 (= 가입한 작가 = 자동 통과, 별도 코드 X)
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const isAuthenticated = !!userData.user;

  if (!isAuthenticated) {
    // 2차 fallback = 옛 INVITE_CODE 호환 (= 옛 작가들)
    const envInvite = process.env.INVITE_CODE;
    const envPassword = process.env.DOWNLOAD_PASSWORD;
    const provided = (body.invite || body.password || "").trim();
    if (!provided) {
      return new Response(
        JSON.stringify({
          error: "로그인하시거나 초대 코드를 입력해주세요.",
          code: "AUTH_REQUIRED",
        }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }
    const allowedCodes = [
      "sunny2026!",
      "sunny2026@",
      "SUNNY2026!",
      "SUNNY2026@",
      ...(envInvite ? [envInvite] : []),
      ...(envPassword ? [envPassword] : []),
    ];
    if (!allowedCodes.includes(provided)) {
      return new Response(
        JSON.stringify({
          error: "초대 코드가 올바르지 않습니다. 로그인 또는 개발사로 문의해주세요.",
          code: "INVALID_INVITE",
        }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }
  }

  // OS 결정 — 기본 = Windows .exe (= 메인)
  const os: OS =
    body.os === "windows" ? "windows" :
    body.os === "mac" ? "mac" :
    "windows-exe";

  const file = await tryReadFile(os);
  if (!file) {
    return new Response(
      JSON.stringify({
        error: `다운로드 파일이 준비되지 않았습니다. 개발사에 문의해주세요.`,
        os,
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      "content-length": String(file.data.length),
      "cache-control": "no-store",
    },
  });
}
