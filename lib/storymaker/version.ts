// V3.1 E5 — 스토리메이커 버전 정보 단일 소스 (Single Source of Truth).
// 옛엔 /api/updater route + /download page + footer에 따로 박혀 있음 = 갱신 시 누락 사고 자주.
// 한 곳에서 관리 = 매 릴리스 = 여기만 갱신.

export const STORYMAKER_VERSION = {
  /** 최신 버전 (= Tauri auto-updater + 다운로드 페이지 표시) */
  version: "3.1.0",
  /** 릴리스 날짜 (ISO 8601) */
  releaseDate: "2026-05-20T23:00:00Z",
  /** 릴리스 노트 (한국어, 작가용) */
  notes: "V3.1: 작가 발송 전 풀세트 업그레이드 + 검증. (1) AI 본문 quality — 매체별 한국 실무 표준 prompt fine-tune (C 숏드라마·D 극장 애니·E 애니 시리즈 보강 + 6개 매체 변환 룰). (2) 한국 시나리오 표준 .docx — 씬 헤딩·지문·캐릭터·대사·부연·CUT TO. 자동 들여쓰기 (방송국·제작사 제출 가능). (3) 작품 통계 — 글자수·페이지·매체별 환산·완성도 진행도. (4) 본문 찾기/바꾸기 — Ctrl+F·Ctrl+H 모달, 정규식·대소문자 옵션. (5) 인물·설정 사이드 노트 — 작품마다 캐릭터·장소·아이템·세계관 카드. (6) 수동 저장 toast. (7) Tauri .smkr file association — 더블클릭으로 앱 자동 실행. (8) PANEL 모바일 터치 드래그. (9) 게임 분기 SVG 그래프 시각화. (10) K(전시) 파서 보강 — 마커·키워드 확장. (11) 매체 select 그룹 분류 + 표준 분량 표시. + V3.0 모든 기능 유지.",
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
