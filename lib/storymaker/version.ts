// V3.1 E5 — 스토리메이커 버전 정보 단일 소스 (Single Source of Truth).
// 옛엔 /api/updater route + /download page + footer에 따로 박혀 있음 = 갱신 시 누락 사고 자주.
// 한 곳에서 관리 = 매 릴리스 = 여기만 갱신.

export const STORYMAKER_VERSION = {
  /** 최신 버전 (= Tauri auto-updater + 다운로드 페이지 표시) */
  version: "3.1.1",
  /** 릴리스 날짜 (ISO 8601) */
  releaseDate: "2026-08-28T00:00:00Z",
  /** 릴리스 노트 (한국어, 작가용) */
  notes: "V3.1.1: (1) 쓰던 원고가 사라지던 문제를 잡았습니다 — 새로고침·작품 전환·기획실과 원고지를 오갈 때 작업물이 옛 내용으로 되돌아가던 경로 14곳. (2) 눌러도 아무 일이 없던 버튼들 — 「다시 써」 「더 쓰기」 「중지」 「패키지 생성」. (3) 「이 대사 바꿔줘」라고 하면 대답만 하고 본문은 그대로였던 것 — 이제 고친 원고를 냅니다. (4) 매체마다 그 매체의 작법을 넣었습니다 — 씬은 늦게 들어가고 일찍 나온다, 사람은 질문에 바로 답하지 않는다 같은 것. 번역투와 AI가 쓴 티도 걸러냅니다. (5) 소설(일반문학)이 1차 오픈에 들어왔습니다. 1차 오픈 매체 = 영화·TV 드라마·숏드라마·웹툰·웹소설·소설. (6) 리뷰어 20명이 각자의 시각으로 읽습니다 — 매체를 고르면 그 매체 독자가 붙습니다. (7) 로그라인·캐릭터 시트가 한국어 양식으로 바뀌었습니다.",
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
