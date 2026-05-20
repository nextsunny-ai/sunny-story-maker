// V3.1 F3 — 텔레그램 알림 통합 헬퍼.
// 모든 운영 이벤트 (피드백·에러·신규 가입·결제·시스템 이상) = 사장님 1개 채널.
//
// 환경변수 (Vercel):
//   TELEGRAM_BOT_TOKEN          — Bot Father 받은 토큰
//   TELEGRAM_OPS_CHAT_ID        — 사장님 단일 채널 (= 모든 이벤트)
//   TELEGRAM_FEEDBACK_CHAT_ID   — (옵션) 피드백만 별도. 없으면 OPS_CHAT_ID 사용
//   TELEGRAM_ERROR_CHAT_ID      — (옵션) 에러만 별도. 없으면 OPS_CHAT_ID 사용
//
// 사용:
//   import { notify } from "@/lib/telegram";
//   await notify("signup", "🎉 신규 작가 가입", { email, plan });

export type NotifyKind =
  | "ops"        // 일반 운영
  | "feedback"   // 작가 피드백
  | "error"      // 클라이언트·서버 에러
  | "signup"     // 신규 가입
  | "payment"    // 결제 이벤트
  | "system";    // 시스템 이상

const EMOJI: Record<NotifyKind, string> = {
  ops: "ℹ️",
  feedback: "🛎️",
  error: "🚨",
  signup: "🎉",
  payment: "💳",
  system: "⚠️",
};

interface NotifyResult {
  ok: boolean;
  skipped?: "no-token" | "no-chat-id";
  status?: number;
}

function getChatId(kind: NotifyKind): string | undefined {
  const ops = process.env.TELEGRAM_OPS_CHAT_ID;
  if (kind === "feedback") return process.env.TELEGRAM_FEEDBACK_CHAT_ID || ops;
  if (kind === "error") return process.env.TELEGRAM_ERROR_CHAT_ID || ops;
  return ops;
}

/**
 * 텔레그램 알림 전송. fire-and-forget — 실패해도 사용자 응답에 영향 X.
 *
 * @param kind 이벤트 종류
 * @param title 한 줄 제목
 * @param fields 사용자에게 보여줄 키-값
 * @returns 결과 (옵션 — 보통 await 안 함)
 */
export async function notify(
  kind: NotifyKind,
  title: string,
  fields?: Record<string, string | number | undefined | null>,
): Promise<NotifyResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, skipped: "no-token" };
  const chatId = getChatId(kind);
  if (!chatId) return { ok: false, skipped: "no-chat-id" };

  const lines: string[] = [`${EMOJI[kind]} ${title}`];
  if (fields) {
    lines.push("");
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null || v === "") continue;
      const valStr = String(v);
      // 1000자 초과 = 잘림
      lines.push(`*${k}*: ${valStr.length > 1000 ? valStr.slice(0, 1000) + "…" : valStr}`);
    }
  }

  const text = lines.join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

/**
 * fire-and-forget 헬퍼 (= 호출 측에서 await 안 함, 실패 무시).
 * 사용 권장 = 사용자 응답 path에 박을 때.
 */
export function notifyAsync(
  kind: NotifyKind,
  title: string,
  fields?: Record<string, string | number | undefined | null>,
): void {
  notify(kind, title, fields).catch(() => { /* silent */ });
}
