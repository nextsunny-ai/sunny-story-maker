// V3.1 E3 — 베타 게이트 정책 분기.
//
// 환경변수:
//   BETA_GATE_MODE = "open" | "invite" | "approval"
//
// open (디폴트, 현재 V3.0+) = 누구나 가입. INVITE_CODE 검증 X.
// invite = 가입 시 INVITE_CODE 입력 필요.
// approval = 가입 OK + subscriptions.status = "suspended" → 사장님 승인 후 "active".
//
// 사용:
//   서버: getBetaGateMode() = "open"|"invite"|"approval"
//   가입 path: 정책에 따라 분기

export type BetaGateMode = "open" | "invite" | "approval";

export function getBetaGateMode(): BetaGateMode {
  const v = process.env.BETA_GATE_MODE;
  if (v === "invite" || v === "approval") return v;
  return "open";
}

/**
 * 작가 가입 시 = 이 함수가 = subscriptions row의 초기 status 결정.
 * - open = active (즉시 사용)
 * - invite = active (INVITE_CODE 검증 통과 가정)
 * - approval = suspended (사장님 승인 대기)
 */
export function getInitialSubscriptionStatus(): "active" | "suspended" {
  return getBetaGateMode() === "approval" ? "suspended" : "active";
}

/**
 * 작가가 사용 가능 상태인지 확인.
 * subscriptions.status = "suspended" 면 = approval 대기.
 */
export function canUseApp(subscriptionStatus: string | null | undefined): boolean {
  if (!subscriptionStatus) return getBetaGateMode() !== "approval";
  return subscriptionStatus === "active";
}

/**
 * INVITE_CODE 검증 (invite 모드에서만 호출).
 */
export function verifyInviteCode(input: string): boolean {
  if (getBetaGateMode() !== "invite") return true; // open·approval에서는 무조건 통과
  const expected = process.env.INVITE_CODE || "SUNNY2026!";
  return input.trim() === expected;
}
