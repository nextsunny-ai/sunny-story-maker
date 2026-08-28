/**
 * pickRecommendedTitle — 제목 단계 결과에서 추천 제목 하나를 뽑는다.
 *
 * 제목 단계는 후보 5개 + 「추천」 한 개를 낸다.
 * 작가가 따로 고르지 않아도 추천작을 작품 제목으로 이어받아
 * 원고지 제목과 내보낸 파일명이 "새 작품"으로 남지 않게 한다.
 */
const BRACKET_TITLE = /[「『]([^」』]{1,40})[」』]/;

export function pickRecommendedTitle(titleStageText: string): string {
  if (!titleStageText) return "";

  // 「추천」 이후 구간을 먼저 본다 (후보 목록보다 뒤에 온다)
  const recIndex = titleStageText.search(/추천/);
  if (recIndex >= 0) {
    const afterRec = titleStageText.slice(recIndex);
    const picked = BRACKET_TITLE.exec(afterRec);
    if (picked) return picked[1].trim();
  }

  // 추천 표기가 없으면 첫 후보를 쓴다
  const first = BRACKET_TITLE.exec(titleStageText);
  return first ? first[1].trim() : "";
}

/**
 * pickFirstLogline — 로그라인 단계 결과에서 한 문장을 뽑는다.
 * "안 1. …" 형태의 후보 목록이 통째로 들어가면 작가에게 (미정)으로만 보인다.
 */
export function pickFirstLogline(loglineStageText: string): string {
  if (!loglineStageText) return "";
  const lines = loglineStageText
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => !/^#{1,6}\s/.test(l));

  for (const line of lines) {
    const candidate = line
      .replace(/^\**\s*안\s*\d+\s*[.)]?\s*/, "")
      .replace(/^\d+\s*[.)]\s*/, "")
      .replace(/\*\*/g, "")
      .trim();
    if (candidate.length >= 15 && candidate.length <= 200) return candidate;
  }
  return "";
}
