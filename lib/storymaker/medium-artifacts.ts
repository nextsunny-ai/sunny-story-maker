// V3.1 C6 — 매체별 표준 산출물 추천 (= Plan Package 페이지에서 자동 권장).
//
// 옛 = Package에서 모든 매체 = 동일 artifactKey 목록 (treatment·synopsis 등).
// 새 = 매체별 추천 = 시나리오는 synopsis+treatment+scene / 웹툰은 character+scene / 게임은 branch tree 등.
//
// 작가가 "전체 패키지" 누르면 = 매체별 추천 자동 선택 (= 작가 일일이 고를 필요 X).

export interface MediumArtifact {
  key: string;
  name: string;
  spec: string;
}

const ALL_ARTIFACTS: Record<string, MediumArtifact> = {
  treatment: { key: "treatment", name: "트리트먼트", spec: "A4 3~5쪽 줄거리. 3막 4분할" },
  synopsis: { key: "synopsis", name: "시놉시스", spec: "A4 1쪽 (~1,200자)" },
  character: { key: "character", name: "캐릭터 시트", spec: "주조연 3~6명. 동기·결핍·아크" },
  structure: { key: "structure", name: "구성안", spec: "회차별·막별 비트" },
  scene: { key: "scene", name: "씬 리스트", spec: "씬 번호·장소/시간·한 줄 요약" },
  pitch: { key: "pitch", name: "피치덱 개요", spec: "10~15장 슬라이드 컨셉" },
  intent: { key: "intent", name: "기획 의도서", spec: "왜 이 작품 + 사회적 의의" },
  production: { key: "production", name: "제작 계획", spec: "일정·인력·예산·로케이션" },
  world: { key: "world", name: "세계관", spec: "배경·규칙·역사·문화" },
  cueSheet: { key: "cueSheet", name: "큐시트 시안", spec: "시간/영상/오디오/자막 표" },
  branchTree: { key: "branchTree", name: "분기 트리", spec: "선택지·플래그·엔딩 분기도" },
  zoneMap: { key: "zoneMap", name: "Zone 동선도", spec: "전시 공간 9~12 Zone + 동선" },
  numbering: { key: "numbering", name: "뮤지컬 넘버", spec: "M#1~M#16 넘버 제목·가사·감정" },
  thumbnails: { key: "thumbnails", name: "썸네일 컨셉", spec: "유튜브·웹툰 표지 시안" },
};

// 매체별 추천 산출물 (= 한국 실무 우선순위)
const RECOMMENDED: Record<string, string[]> = {
  // SCREENPLAY
  A: ["synopsis", "treatment", "character", "structure", "scene", "intent"],     // TV 드라마
  B: ["synopsis", "treatment", "character", "scene", "pitch", "production"],     // 영화
  C: ["synopsis", "character", "structure", "scene", "thumbnails"],              // 숏드라마
  D: ["synopsis", "treatment", "character", "world", "scene"],                   // 극장 애니
  E: ["synopsis", "treatment", "character", "world", "structure"],               // 애니 시리즈

  // STAGE
  I: ["synopsis", "treatment", "character", "numbering", "structure"],           // 뮤지컬
  N: ["synopsis", "treatment", "character", "structure", "scene"],               // 연극

  // PANEL
  F: ["synopsis", "character", "scene", "thumbnails", "world"],                  // 웹툰

  // CUESHEET
  G: ["synopsis", "intent", "cueSheet", "structure", "production"],              // 다큐
  J: ["synopsis", "cueSheet", "thumbnails", "intent"],                           // 유튜브
  M: ["synopsis", "cueSheet", "character", "structure"],                         // 예능

  // PROSE
  H: ["synopsis", "character", "world", "structure"],                            // 웹소설
  O: ["synopsis", "character", "structure", "treatment"],                        // 소설
  P: ["synopsis", "intent", "structure"],                                        // 에세이

  // STRUCTURED
  K: ["intent", "zoneMap", "world", "production"],                               // 전시
  L: ["synopsis", "character", "world", "branchTree", "structure"],              // 게임
};

/**
 * 매체별 추천 산출물 목록.
 * letter = "A"~"P". 없는 letter = 기본값 (synopsis·treatment·character·structure).
 */
export function getRecommendedArtifacts(letter: string): MediumArtifact[] {
  const keys = RECOMMENDED[letter] || ["synopsis", "treatment", "character", "structure"];
  return keys.map(k => ALL_ARTIFACTS[k]).filter(Boolean);
}

/**
 * 모든 산출물 목록 (= 작가가 직접 추가하고 싶을 때).
 */
export function getAllArtifacts(): MediumArtifact[] {
  return Object.values(ALL_ARTIFACTS);
}
