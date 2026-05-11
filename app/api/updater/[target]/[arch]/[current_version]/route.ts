import { NextResponse } from "next/server";

/**
 * Tauri 2.0 Updater Endpoint — V2.11.2 (2026-05-11)
 *
 * Tauri auto-updater가 = 앱 시작 시 호출 = 새 버전 정보 받음.
 * URL: `/api/updater/{target}/{arch}/{current_version}`
 *
 * 응답:
 * - 204 No Content = 새 버전 없음 (= 현재가 최신)
 * - 200 + JSON = 새 버전 있음 → Tauri = 다이얼로그 표시 + 다운로드·설치
 *
 * Tauri 2.0 표준 응답 형식:
 * ```json
 * {
 *   "version": "2.11.3",
 *   "notes": "변경사항 요약",
 *   "pub_date": "2026-05-12T00:00:00Z",
 *   "platforms": {
 *     "windows-x86_64": {
 *       "url": "https://story.sunnytoon.com/_private_downloads/sunny-story-maker-windows.exe",
 *       "signature": "..."   // ★ V2.12 = tauri signer generate로 키 생성 후 박음
 *     }
 *   }
 * }
 * ```
 *
 * V2.11.2 현재: updater 비활성 (= signature·pubkey 미박힘).
 *               이 endpoint = 미래 사용 + 빌드 검증용 + `/changelog`로 수동 업데이트 안내.
 *
 * V2.12 활성 path:
 * 1. `tauri signer generate -w ~/.tauri/sunny-story-maker.key`
 * 2. pubkey = `tauri.conf.json` 박음 + `plugins.updater.active = true`
 * 3. 빌드 환경변수 `TAURI_SIGNING_PRIVATE_KEY`·`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 박음
 * 4. 빌드 시 = `.sig` 파일 자동 생성 → `_private_downloads/`에 함께 박음
 * 5. 이 endpoint = `signature` 필드에 = .sig 내용 박음
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 현재 라이브 버전 (= 매 릴리스 시 갱신)
const LATEST = {
  version: "2.11.2",
  pub_date: "2026-05-11T09:00:00Z",
  notes:
    "V2.11.2 — Tauri system prompt 보존 + learned.md 디폴트 ON + 자동 학습 갱신 시스템 + 다운로드 페이지 정정",
};

interface Params {
  target: string;        // "windows" | "darwin" | "linux"
  arch: string;          // "x86_64" | "aarch64" | "i686"
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const { target, arch, current_version } = await params;

  // 현재가 최신 = 204 No Content (= Tauri는 update X)
  if (compareVersions(current_version, LATEST.version) >= 0) {
    return new Response(null, { status: 204 });
  }

  // platform key (Tauri 표준)
  const platformKey =
    target === "windows" ? `windows-${arch}` :
    target === "darwin" ? `darwin-${arch}` :
    target === "linux" ? `linux-${arch}` :
    `${target}-${arch}`;

  // 다운로드 URL = static asset 호스팅 (= V2.12 = GitHub Releases 권장)
  const downloadUrl =
    target === "windows"
      ? "https://story.sunnytoon.com/_private_downloads/sunny-story-maker-windows.exe"
      : null;

  if (!downloadUrl) {
    // 지원 안 하는 플랫폼 = 204 (= update X)
    return new Response(null, { status: 204 });
  }

  return NextResponse.json({
    version: LATEST.version,
    pub_date: LATEST.pub_date,
    notes: LATEST.notes,
    platforms: {
      [platformKey]: {
        url: downloadUrl,
        // ★ V2.11.2 = signature 미박힘 (= updater 비활성). V2.12 = tauri signer로 .sig 생성 후 박음.
        signature: "",
      },
    },
  });
}
