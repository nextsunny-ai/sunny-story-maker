// V3.1 — mailto: 양식 빌더 (작가 본인 이메일에서 발송).
// 대표님 명시 (2026-05-20): "자기 이메일로 보내면 안되거? 본인들 이메일"
//
// path:
//   1. 작가가 💬 위젯에서 카테고리·메시지 작성
//   2. [메일로 보내기] 클릭 = mailto: 링크 자동 열림 (또는 Gmail compose)
//   3. 작가 본인 메일 앱 (Gmail·아웃룩·Mac Mail 등)에서 양식 자동 채워짐
//   4. 작가 [보내기] 클릭 = 본인 이메일에서 발송 = sunny@sunnyent.co.kr 수신
//   5. 대표님이 답장 = 일반 메일 thread = 작가에게 바로
//
// 장점:
//   - 대표님 비용 0 (Resend·도메인 인증 X)
//   - 작가 본인 이메일에서 발송 = 신뢰·답장 자연
//   - DB는 그대로 저장 (= /admin/dashboard에서 백업)

export const FEEDBACK_TO_EMAIL = "sunny@sunnyent.co.kr";

const CATEGORY_KO: Record<string, string> = {
  bug: "🐛 버그·오류",
  feature: "💡 개선 제안",
  praise: "🎉 칭찬·의견",
  question: "❓ 질문",
  other: "📝 기타",
};

export interface FeedbackMailInput {
  category: string;
  message: string;
  writerEmail?: string | null;
  pageUrl?: string | null;
  appVersion?: string | null;
}

/**
 * 작가 피드백·컴플레인 → mailto: 링크 빌드.
 * 작가가 클릭하면 = 본인 메일 앱 열림 + 양식 자동 채워짐.
 */
export function buildFeedbackMailto(input: FeedbackMailInput): string {
  const categoryLabel = CATEGORY_KO[input.category] || input.category;
  const subject = `[Story Maker] ${categoryLabel} — ${input.message.slice(0, 40)}${input.message.length > 40 ? "…" : ""}`;

  const bodyLines = [
    input.message,
    "",
    "—",
    `카테고리: ${categoryLabel}`,
    `페이지: ${input.pageUrl || "(없음)"}`,
    `버전: ${input.appVersion || "?"}`,
    "",
    "(이 줄 위에 답신할 내용 박아주세요. 이 메일 그대로 보내시면 됩니다.)",
  ];
  const body = bodyLines.join("\n");

  // mailto:는 RFC 6068 — encodeURIComponent로 % 인코딩
  return `mailto:${FEEDBACK_TO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Gmail 웹 작가용 — compose 직링크.
 * Gmail 로그인 안 돼있으면 = 로그인 페이지로 redirect됨.
 */
export function buildGmailComposeUrl(input: FeedbackMailInput): string {
  const categoryLabel = CATEGORY_KO[input.category] || input.category;
  const subject = `[Story Maker] ${categoryLabel} — ${input.message.slice(0, 40)}${input.message.length > 40 ? "…" : ""}`;
  const body = [
    input.message,
    "",
    "—",
    `카테고리: ${categoryLabel}`,
    `페이지: ${input.pageUrl || "(없음)"}`,
    `버전: ${input.appVersion || "?"}`,
  ].join("\n");

  // Gmail web compose URL
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(FEEDBACK_TO_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * 작가 OS·브라우저 감지해 자동으로 mailto: 또는 Gmail compose 열기.
 * Gmail 사용자가 다수일 가능성 = 두 옵션 제공.
 */
export function openFeedbackMail(input: FeedbackMailInput, opts?: { preferGmail?: boolean }): void {
  if (typeof window === "undefined") return;
  const url = opts?.preferGmail ? buildGmailComposeUrl(input) : buildFeedbackMailto(input);
  // 새 창 = 작가가 작업 중인 본 페이지 안 끊김
  if (opts?.preferGmail) {
    window.open(url, "_blank", "noopener");
  } else {
    // mailto: = location.href로 = OS 기본 메일 앱
    window.location.href = url;
  }
}
