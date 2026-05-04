/**
 * 작품 ID = "한 클로드 conversation 모델" 키.
 *
 * 사장님 의도: 작가 1명이 한 작품을 작업하는 동안 = 같은 conversation.
 * develop·write·chat·adapt·review·package = 다 같은 workId 사용 = 같은 messages 누적.
 *
 * id 형식 = 단순. 같은 (genreLetter, idea)면 = 항상 같은 id.
 */

export function getWorkId(genreLetter: string, idea: string): string {
  const slug = (idea || "")
    .slice(0, 40)
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\.+$/g, "")
    .toLowerCase()
    .trim();
  return `${(genreLetter || "A").toUpperCase()}-${slug || "untitled"}`;
}

/**
 * conversation 누적 — 옛 turn + 새 user/assistant turn.
 * 50 turn 넘으면 = 옛 30 turn = 단순 truncate.
 *   (★ 정교한 compaction(옛 turn AI 요약 → compactedSummary 박기) = 다음 라운드)
 */
export function appendTurns(
  current: { messages: Array<{ role: "user" | "assistant"; content: string }>; compactedSummary?: string },
  newTurns: Array<{ role: "user" | "assistant"; content: string }>,
): { messages: Array<{ role: "user" | "assistant"; content: string }>; compactedSummary?: string } {
  const merged = [...current.messages, ...newTurns];
  const MAX_TURNS = 50;
  const KEEP_RECENT = 20;
  if (merged.length <= MAX_TURNS) {
    return { messages: merged, compactedSummary: current.compactedSummary };
  }
  // 옛 turn = 단순 truncate. compactedSummary가 있으면 = 그대로 유지 (다음 라운드 정교화).
  const truncated = merged.slice(-KEEP_RECENT);
  return {
    messages: truncated,
    compactedSummary: current.compactedSummary || `(옛 ${merged.length - KEEP_RECENT} turn = 단순 truncate. 정교 요약 = 다음 라운드)`,
  };
}
