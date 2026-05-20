// V3.1 E5 — 스토리메이커 버전 정보 단일 소스 (Single Source of Truth).
// 옛엔 /api/updater route + /download page + footer에 따로 박혀 있음 = 갱신 시 누락 사고 자주.
// 한 곳에서 관리 = 매 릴리스 = 여기만 갱신.

export const STORYMAKER_VERSION = {
  /** 최신 버전 (= Tauri auto-updater + 다운로드 페이지 표시) */
  version: "3.0.0",
  /** 릴리스 날짜 (ISO 8601) */
  releaseDate: "2026-05-20T15:00:00Z",
  /** 릴리스 노트 (한국어, 작가용) */
  notes: "V3.0: 본문 모델 재설계 — 16매체별 양식 틀 + 대사 인라인 수정 + 채팅 정밀 patch. (1) 매체별 입력 UI — 시나리오(씬헤딩·지문·대사)·웹툰(컷 카드)·예능 큐시트(시간축 표)·소설(회차/장)·전시(Zone 카드)·게임(대사 데이터 표). (2) ★ 대사 인라인 수정 — 캐릭터·대사 각각 클릭 즉시 편집 (ContentEditable). (3) 채팅 [[수정/추가/삭제:N:내용]] 마커 + [📥 patch] 1클릭. (4) 시나리오 자동 파싱 (한국+영어 표준). (5) 옛 작품 무손실 마이그레이션. (6) 매체 변경 시 텍스트 보존. + V2.14 모든 기능 유지.",
  /** 파일 크기 (= 다운로드 페이지 표시) */
  sizes: {
    "windows-exe": "4.5MB",
    "windows-msi": "5.2MB",
    "windows-zip": "8.0MB",
    "mac-dmg": "7.7MB",
    "mac-tar-gz": "7.5MB",
  } as Record<string, string>,
  /** 시스템 요구사양 */
  requirements: {
    windows: "Windows 10 / 11 (64bit)",
    macos: "macOS 12 Monterey 이상 (Apple Silicon)",
    memory: "4GB RAM 권장",
    disk: "200MB",
    network: "인터넷 필요 (Claude API)",
  },
} as const;

/** 다운로드 파일 정보 — version 박힌 wrapper */
export function getDownloadInfo(id: "windows-exe" | "windows" | "mac") {
  const v = STORYMAKER_VERSION.version;
  switch (id) {
    case "windows-exe":
      return {
        version: v,
        size: STORYMAKER_VERSION.sizes["windows-exe"],
        filename: "sunny-story-maker-windows.exe",
      };
    case "windows":
      return {
        version: v,
        size: STORYMAKER_VERSION.sizes["windows-zip"],
        filename: "sunny-story-maker-windows.zip",
      };
    case "mac":
      return {
        version: v,
        size: STORYMAKER_VERSION.sizes["mac-dmg"],
        filename: "sunny-story-maker-mac.dmg",
      };
  }
}
