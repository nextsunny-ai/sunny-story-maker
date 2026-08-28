/**
 * stripControlMarkers — AI 응답에 섞인 내부 제어 마커를 걷어낸다.
 *
 * 시스템 프롬프트는 채팅 UI 동작을 위해 [[다음:단계명]] · [[의견:3]] 같은 마커를 쓴다.
 * 채팅 화면(WriteWorkbook)은 이 마커를 파싱해서 버튼으로 바꾸지만,
 * 사전 자료 카드·내보내기 문서에는 파서가 없어 마커가 글자 그대로 노출된다.
 * (실측 2026-08-26: 주제·기승전결 카드 끝에 "[[다음:트리트먼트]]" 가 그대로 보임)
 */
const CONTROL_MARKER_RE = /\[\[(?:다음|의견|질문|평가|수정|추가|삭제)(?::[\s\S]*?)?\]\]/g;

export function stripControlMarkers(text: string): string {
  if (!text) return text;
  return text.replace(CONTROL_MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * stripDocMarkup — 원고 본문에서 문서 편집 표시를 걷어낸다.
 *
 * 시나리오·소설 본문은 문서가 아니라 원고다. 제목 표시(#)·구분선(---)·굵게(**)가
 * 섞이면 그대로 방송국·제작사에 제출할 수 없다.
 * 시스템 프롬프트로 금지해도 모델이 가끔 붙이므로 코드에서 확실히 지운다.
 * ★ 씬 헤딩(S#1.)과 대사는 건드리지 않는다.
 */
export function stripDocMarkup(text: string): string {
  if (!text) return text;
  return text
    // 줄 첫머리 제목 표시 (S#1. 같은 씬 헤딩은 # 앞에 S가 붙어 영향 없음)
    .replace(/^#{1,6}[ \t]+/gm, "")
    // 가로 구분선만 있는 줄
    .replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, "")
    // 굵게·기울임 표시 (내용은 남긴다)
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, "$1")
    // 인용 표시
    .replace(/^[ \t]*>[ \t]?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * extractManuscript — 각색 결과에서 **원고 본문만** 뽑는다.
 *
 * 각색 응답은 작가가 읽을 설명(변경 요약·유지한 부분·다음 제안)과 원고가 함께 온다.
 * 화면에서는 설명도 보여줘야 하지만, **원고지로 넘길 때는 원고만** 가야 한다.
 * (실측 2026-08-26: "# 수정본 v2", "## Diff Notes", "유지한 부분"이 원고에 그대로 섞여
 *  그대로 워드로 내보내면 제출할 수 없는 상태였다)
 */
export function extractManuscript(text: string): string {
  if (!text) return text;

  // "수정된 본문" / "변환된 본문" 제목 아래부터가 원고
  const start = /^#{0,6}\s*(?:\d+[.)]\s*)?\*{0,2}(?:수정된|변환된|각색된)\s*본문\*{0,2}[^\n]*$/m.exec(text);
  let body = start && start.index !== undefined
    ? text.slice(start.index + start[0].length)
    : text;

  // 원고 뒤에 붙는 해설 구역은 잘라낸다
  const endRe = /^#{0,6}\s*(?:\d+[.)]\s*)?\*{0,2}(?:유지한\s*부분|변환\s*노트|각색\s*노트|다음\s*수정\s*제안|변경\s*요약|Diff\s*Notes|추가\s*작업\s*제안)\*{0,2}[^\n]*$/m;
  const end = endRe.exec(body);
  if (end && end.index !== undefined) body = body.slice(0, end.index);

  return stripDocMarkup(stripControlMarkers(body));
}

/**
 * fixCommonTypos — 모델이 반복해서 내는 한국어 오타를 바로잡는다.
 *
 * 프롬프트로 "틀리지 마라"고 적어도 계속 나오는 것들이 있다
 * (실측 2026-08-27: 「누세요」가 숏드라마·웹소설에서 세 번 반복. 프롬프트 보강 후에도 재발).
 * 작가 원고를 함부로 고치면 안 되므로 **한국어에 없는 형태만** 대상으로 한다.
 */
export function fixCommonTypos(text: string): string {
  if (!text) return text;
  return text
    // "누세요" — 앞이 문장 시작·공백·따옴표일 때만 (재우세요·태우세요 같은 어미는 건드리지 않는다)
    .replace(/(^|[\s"'“”‘’(\[])누세요/g, "$1누구세요")
    .replace(/(^|[\s"'“”‘’(\[])누셨/g, "$1누구셨")
    // 식어가다 — "식아가"로만 잡으면 "식아간대·식아갔다"를 놓친다
    //   ("간"과 "가"는 완성형에서 다른 글자다. 실측 2026-08-27에 이걸로 한 번 헛짚었다)
    //   앞 글자가 한글이면 다른 낱말의 일부다 — 건드리지 않는다 ("장식아치")
    .replace(/(^|[^가-힣])식아(?=[가-힣])/g, "$1식어")
    // 되다
    .replace(/됬/g, "됐")
    // 전화·알람이 "울음"을 멈추는 일은 없다
    .replace(/(전화|벨|알람|휴대폰|핸드폰)([^\n]{0,6})울음이/g, "$1$2울림이")
    // 흔한 띄어쓰기 오류
    .replace(/않하/g, "안 하")
    // 존댓말 어휘를 서술문에 잘못 쓰는 경우 — 서술자가 인물을 높이지 않는다
    //   (실측 2026-08-27: 「두 사람은 한 말씀도 하지 않고」 — 「한 마디도」가 맞다)
    .replace(/한\s*말씀도/g, "한 마디도")
    .replace(/말씀도\s*하지\s*않고/g, "마디도 하지 않고")
    // 없는 낱말 — 사람이 쓰지 않는 조어 (실측 2026-08-27, TV 드라마 본문)
    .replace(/우산물/g, "빗물")
    .replace(/(냄새|소리|빛|향)가\s*나간다/g, "$1가 난다")
    .replace(/그림자를\s*드린다/g, "그림자를 드리운다");
}
