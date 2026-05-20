import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Tauri 2.0 Updater Endpoint — V2.12.0 (2026-05-13) 활성화 완료
 *
 * Tauri auto-updater가 = 앱 시작 시 호출 = 새 버전 정보 받음.
 * URL: `/api/updater/{target}/{arch}/{current_version}`
 *
 * 응답:
 * - 204 No Content = 새 버전 없음 (= 현재가 최신)
 * - 200 + JSON = 새 버전 있음 → Tauri = 다이얼로그 표시 + 자동 다운로드·설치
 *
 * V2.12 활성:
 * 1. ✓ tauri signer generate = src-tauri/.keys/ 박음
 * 2. ✓ pubkey = tauri.conf.json `plugins.updater.pubkey` 박음
 * 3. ✓ 빌드 환경변수 TAURI_SIGNING_PRIVATE_KEY_PATH 박음
 * 4. ✓ 빌드 시 .sig 파일 자동 생성 → _private_downloads/{installer}.sig
 * 5. ✓ 이 endpoint = .sig 내용 자동 read → signature 필드에 박음
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 현재 라이브 버전 (= 매 릴리스 시 갱신)
const LATEST = {
  version: "2.14.6",
  pub_date: "2026-05-20T08:00:00Z",
  notes:
    "V2.14: (1) 작가 직접 쓰기 — 빈 작업실에서 AI 자동 호출 X, 작가가 빈 종이에 바로 타이핑. pending 단락 [✍️ 직접 쓰기] 버튼. (2) 빈 작업실 매체 선택 드롭다운 (16매체). (3) 헤더 [📥 원고 가져오기] 항상 토글. (4) [+ 더 쓰기] = AI 강제호출에서 빈 단락 추가로 (작가/AI 선택). (5) 각색 원문 fitSourceText — 6,000자 → 24,000자 + 시작·중반·결말 3구간 발췌. (6) 한도 차도 자동 Haiku fallback + 토스트 알림. (7) 채팅 AI 응답 [📥 본문에 적용] 1클릭 반영. (8) 데스크탑 [📂 폴더 열기]. (9) 작가 피드백 텔레그램 즉시 알림. (10) license banned 체크 + 모델 ID 공통 파일. (11) .hwp 친절 안내.",
};

/**
 * `.sig` 파일 read 결과 = base64 minisign signature.
 * Tauri 자동 업데이터가 = .exe + signature 검증해서 = 위변조 방지.
 */
function readSignature(installerFilename: string): string {
  // _private_downloads/sunny-story-maker-windows.exe.sig 위치
  const sigPath = path.join(process.cwd(), "_private_downloads", `${installerFilename}.sig`);
  if (!existsSync(sigPath)) {
    return ""; // 없으면 빈 string = updater = signature 검증 실패 = 업데이트 거부
  }
  try {
    return readFileSync(sigPath, "utf-8").trim();
  } catch {
    return "";
  }
}

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

  // 다운로드 URL + installer filename
  // ★ V2.12 = /api/updater-download/{target} GET endpoint 사용 (= public + signature 검증으로 보호)
  let downloadUrl: string | null = null;
  let installerFilename: string | null = null;
  if (target === "windows") {
    installerFilename = "sunny-story-maker-windows.exe";
    downloadUrl = "https://story.sunnytoon.com/api/updater-download/windows";
  } else if (target === "darwin") {
    // ★ V2.13.0 ~ macOS 활성 (= .app.tar.gz 형식, Tauri 자동 업데이터 표준)
    installerFilename = "sunny-story-maker-mac.app.tar.gz";
    downloadUrl = "https://story.sunnytoon.com/api/updater-download/darwin";
  }
  // Linux = 다음 단계

  if (!downloadUrl || !installerFilename) {
    // 지원 안 하는 플랫폼 = 204 (= update X)
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
        signature, // ★ V2.12 = .sig 자동 read (= tauri signer 검증용)
      },
    },
  });
}
