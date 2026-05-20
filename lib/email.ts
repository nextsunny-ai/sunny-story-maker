// V3.1 — 이메일 발송 헬퍼 (Resend REST API 직접).
// 대표님 명시 (2026-05-20): "프로그램 개선사항이랑 컴플레인은 이메일로만 받아. sunny@sunnyent.co.kr"
//
// 환경변수 (Vercel):
//   RESEND_API_KEY            — Resend 가입 시 발급 (필수)
//   RESEND_FROM_EMAIL         — 발신 주소. 디폴트 = "Story Maker <onboarding@resend.dev>"
//                                 (sunnytoon.com 도메인 인증 시 = "Story Maker <noreply@sunnytoon.com>")
//   FEEDBACK_TO_EMAIL         — 수신 주소. 디폴트 = "sunny@sunnyent.co.kr"
//
// 룰:
//   - RESEND_API_KEY 없으면 = silent skip (= 환경변수 안 박혀있으면 0건 발송)
//   - 폭주 위험 X: 피드백·컴플레인 = 작가가 적극 보낼 때만 = 빈도 매우 낮음
//   - 에러 자동 알림 = 박지 X (= 글로벌 룰 2)

interface SendResult {
  ok: boolean;
  skipped?: "no-api-key";
  status?: number;
  error?: string;
  id?: string;
}

interface FeedbackEmailInput {
  writerEmail: string | null;
  writerId: string;
  category: string;
  message: string;
  pageUrl?: string | null;
  appVersion?: string | null;
}

const CATEGORY_KO: Record<string, string> = {
  bug: "🐛 버그·오류",
  feature: "💡 개선 제안",
  praise: "🎉 칭찬·의견",
  question: "❓ 질문",
  other: "📝 기타",
};

/**
 * 작가 피드백·컴플레인을 사장님 이메일로 전송.
 * fire-and-forget — 응답 대기 X. 실패해도 작가 응답에 영향 X.
 *
 * @returns 결과 (보통 await 안 함)
 */
export async function sendFeedbackEmail(input: FeedbackEmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: "no-api-key" };

  const from = process.env.RESEND_FROM_EMAIL || "Story Maker <onboarding@resend.dev>";
  const to = process.env.FEEDBACK_TO_EMAIL || "sunny@sunnyent.co.kr";

  const categoryLabel = CATEGORY_KO[input.category] || input.category;
  const writerLabel = input.writerEmail || `(이메일 비공개 · ID ${input.writerId.slice(0, 8)})`;

  // 답신 가능 = reply-to에 작가 이메일 박음 (이메일 비공개 시 = 디폴트)
  const replyTo = input.writerEmail || undefined;

  const subject = `[Story Maker] ${categoryLabel} — ${input.message.slice(0, 40)}${input.message.length > 40 ? "…" : ""}`;

  const html = `
<div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #2a2f3a;">
  <div style="border-bottom: 2px solid #ff6b53; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="font-size: 11px; color: #999; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;">SUNNY Story Maker</div>
    <h1 style="font-size: 20px; margin: 0; color: #1a1a1a;">${categoryLabel}</h1>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
    <tr>
      <td style="padding: 6px 0; color: #888; width: 100px;">작가</td>
      <td style="padding: 6px 0; color: #2a2f3a;">${escapeHtml(writerLabel)}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #888;">페이지</td>
      <td style="padding: 6px 0; color: #2a2f3a; font-family: monospace; font-size: 12px;">${escapeHtml(input.pageUrl || "(없음)")}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #888;">버전</td>
      <td style="padding: 6px 0; color: #2a2f3a;">${escapeHtml(input.appVersion || "?")}</td>
    </tr>
  </table>

  <div style="background: #faf9f6; border-left: 3px solid #ff6b53; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px;">
    <div style="font-size: 11px; color: #ff6b53; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 10px;">메시지</div>
    <div style="font-size: 14px; line-height: 1.7; color: #1a1a1a; white-space: pre-wrap;">${escapeHtml(input.message)}</div>
  </div>

  <div style="font-size: 12px; color: #999; padding-top: 16px; border-top: 1px solid #eee;">
    답신 = 이 이메일에 답장하시면 작가에게 바로 전달됩니다 (reply-to 박힘).<br />
    운영 대시보드 = <a href="https://story.sunnytoon.com/admin/dashboard" style="color: #ff6b53;">story.sunnytoon.com/admin/dashboard</a>
  </div>
</div>
  `.trim();

  const text = [
    `[Story Maker] ${categoryLabel}`,
    "",
    `작가: ${writerLabel}`,
    `페이지: ${input.pageUrl || "(없음)"}`,
    `버전: ${input.appVersion || "?"}`,
    "",
    "메시지:",
    input.message,
    "",
    "—",
    "답신 = 이 이메일에 답장 = 작가에게 바로 전달.",
    "운영 대시보드: https://story.sunnytoon.com/admin/dashboard",
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        tags: [
          { name: "category", value: input.category },
          { name: "source", value: "feedback" },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: errText.slice(0, 300) };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, status: res.status, id: (data as { id?: string }).id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * fire-and-forget 헬퍼.
 */
export function sendFeedbackEmailAsync(input: FeedbackEmailInput): void {
  sendFeedbackEmail(input).catch(() => { /* silent */ });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
