// /api/build-prompt — Tauri 데스크탑 앱 전용 system prompt 빌더
//
// 글로벌 룰 16 (BYOK 정통) — 작가 .exe = Rust subprocess `claude` CLI 호출 path:
// 1. Tauri WebView (= story.sunnytoon.com) = 작가가 작성 시작
// 2. lib/stream-agent.ts:streamFetch = isTauri 분기 → 이 endpoint 호출
// 3. 이 endpoint = enrichBody 결과 → buildUserPrompt + getSystemPrompt = full prompt 빌드
// 4. 응답 = { systemPrompt, userMessage, model } JSON (= Claude API 호출 X = Vercel 비용 0)
// 5. TS = 응답 받음 → invoke("stream_agent", { args: { systemPrompt, userMessage, model }, channel })
// 6. Rust = `claude` CLI subprocess 호출 (= 작가 본인 Pro 구독)
//
// 이 endpoint = AI 호출 X = system prompt 빌드만. Vercel serverless에서 안전.

import { NextRequest } from "next/server";
import { GENRES, type Genre } from "@/lib/genres";
import { getSystemPrompt } from "@/lib/storymaker/system-prompt";
import {
  buildAiPitchPrompt,
  buildCollaboratePrompt,
  buildReviewPrompt,
  buildAdaptPrompt,
  buildRevisePrompt,
  buildLoglinePrompt,
  buildTitlePrompt,
  buildThemePrompt,
  buildSynopsisPrompt,
  buildTreatmentPrompt,
  buildCharactersPrompt,
  buildWorldviewPrompt,
  buildEpisodesPrompt,
  buildProposalPrompt,
  buildScriptPrompt,
  buildFullPackagePrompt,
  buildOsmuPrompt,
  buildTargetedReviewPrompt,
  buildSimpleReviewPrompt,
  buildGrantMetaPrompt,
  type TargetPersona,
  type Workflow,
} from "@/lib/storymaker/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WriterLearningEntry {
  date: string;
  category: string;
  text: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  mode: string;
  idea?: string;
  genreLetter?: string;
  targetGenreLetter?: string;
  text?: string;
  stage?: string;
  userInput?: Record<string, string>;
  prior?: Record<string, string>;
  priorFiles?: Record<string, string>;
  artifactKeys?: string[];
  targets?: TargetPersona[];
  direction?: string;
  targetSection?: string;
  versionNumber?: number;
  sourceIp?: string;
  profile?: Record<string, unknown> | null;
  lessons?: string;
  fast?: boolean;
  model?: string;  // ★ V2.13.4 — "haiku"|"sonnet"|"opus" (있으면 우선)
  mediumFields?: Record<string, string | string[] | number>;
  writerLearning?: WriterLearningEntry[];
  workId?: string;
  conversationMessages?: ConversationMessage[];
  writerProfile?: Record<string, unknown> | null;
  // ★ V2.13.2 정정 — 작가가 카드별 채팅창에서 박은 호출 = isChatMode = true (= 항상 대화 모드 prefix 박음)
  // 사고: 옥 hasHistory 체크만 = 작가가 첫 메시지 박을 때 = false = stage builder 형식 강제 = 5개 후보
  // 정정: ItemMiniChat = isChatMode: true 명시 = 첫 호출부터 = AI는 stage builder 형식 무시 + 작가 메시지 우선 응답
  isChatMode?: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  loved: "★ 좋아하는 표현",
  rejected: "✗ 피하는 표현",
  direction: "→ 자주 쓰는 디렉션",
  metaphor: "◇ 비유·메타포",
  free: "·자유 메모",
};

function formatWriterLearning(learning?: WriterLearningEntry[]): string {
  if (!learning || learning.length === 0) return "";
  const recent = learning.slice(-50);
  const grouped: Record<string, string[]> = {};
  for (const e of recent) {
    const label = CATEGORY_LABEL[e.category] || e.category;
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(e.text);
  }
  const sections = Object.entries(grouped).map(([label, items]) =>
    `### ${label}\n${items.map(t => `- ${t}`).join("\n")}`
  ).join("\n\n");
  return `\n\n## ★★★ 작가 누적 학습 (이 작가 전용 — 절대 준수)
이 작가는 다음을 명시적으로 요청했습니다. 모든 출력에 자동 반영:

${sections}

위 항목은 작가의 누적 노하우입니다. 좋아하는 건 적극 활용, 피하는 건 절대 X, 디렉션은 그대로, 비유는 우선 적용.\n`;
}

function formatWorkMemoryFromFiles(files?: Record<string, string>): string {
  if (!files) return "";
  const filenames = Object.keys(files).filter(f => f.endsWith(".md")).sort();
  if (filenames.length === 0) return "";

  const sections: string[] = [];
  sections.push("## ★★★ 이 작품의 누적 메모리 (매 호출마다 자동 read — 작품 = 항상 인지)");
  sections.push("이 작가가 옛 호출에서 작업한 모든 컨텍스트. AI는 이걸 먼저 다 읽고 = 이전 작업 흐름 그대로 이어 작업.");

  for (const filename of filenames) {
    const content = files[filename];
    if (content && content.trim()) {
      sections.push(`### 📂 ${filename}\n\n${content.trim()}`);
    }
  }
  return sections.join("\n\n");
}

const findGenre = (letter?: string): Genre => {
  return GENRES.find(g => g.letter === letter) || GENRES[0];
};

const workflowFor = (genre: Genre): Workflow => ({
  steps: genre.steps.map(s => ({ n: s.n, name: s.name })),
});

function buildBasePrompt(b: RequestBody): string {
  const genre = findGenre(b.genreLetter);
  const targetGenre = findGenre(b.targetGenreLetter);

  switch (b.mode) {
    case "pitch":
    case "ai-pitch":
      return buildAiPitchPrompt(b.idea ?? "", genre, workflowFor(genre));
    case "collaborate":
      return buildCollaboratePrompt(b.stage ?? "", b.userInput ?? {}, genre, b.prior);
    case "review":
      return buildReviewPrompt(b.text ?? "", genre);
    case "simple-review":
      return buildSimpleReviewPrompt(b.text ?? "", genre);
    case "targeted-review":
      return buildTargetedReviewPrompt(b.text ?? "", b.targets ?? [], genre);
    case "adapt":
      return buildAdaptPrompt(b.text ?? "", genre, targetGenre);
    case "revise":
      return buildRevisePrompt(b.text ?? "", b.direction ?? "", genre, b.targetSection, b.versionNumber);
    case "title":
      return buildTitlePrompt(b.idea ?? "", genre, b.userInput);
    case "theme":
      return buildThemePrompt(b.idea ?? "", genre, b.userInput);
    case "logline":
      return buildLoglinePrompt(b.idea ?? "", genre, b.userInput, b.mediumFields);
    case "synopsis":
      return buildSynopsisPrompt(b.idea ?? "", genre, b.userInput, b.prior, b.mediumFields);
    case "treatment":
      return buildTreatmentPrompt(b.idea ?? "", genre, b.userInput, b.prior, b.mediumFields);
    case "characters":
      return buildCharactersPrompt(b.idea ?? "", genre, b.userInput, b.prior, b.mediumFields);
    case "worldview":
      return buildWorldviewPrompt(b.idea ?? "", genre, b.userInput, b.prior, b.mediumFields);
    case "episodes":
      return buildEpisodesPrompt(b.idea ?? "", genre, b.userInput, b.prior, b.mediumFields);
    case "proposal":
      return buildProposalPrompt(b.idea ?? "", genre, b.userInput, b.prior, b.mediumFields);
    case "script":
      return buildScriptPrompt(b.idea ?? "", genre, b.userInput, b.prior, b.targetSection, b.mediumFields);
    case "package":
    case "full-package":
      return buildFullPackagePrompt(b.idea ?? "", genre, b.userInput ?? {}, b.artifactKeys ?? []);
    case "osmu":
      return buildOsmuPrompt(b.idea ?? "", b.sourceIp);
    case "extract-grant-meta":
      return buildGrantMetaPrompt(b.text ?? "");
    case "chat":
      // ★ V2.13 = 본문 작성 모드에서 = 작가가 채팅 = 자유 대화 응답 (본문 추가 X)
      return buildChatPrompt(b);
    default:
      throw new Error(`Unknown mode: ${b.mode}`);
  }
}

/**
 * ★ V2.13 — /write 페이지 채팅 = 자유 대화 응답 (본문 자동 추가 X).
 * 작가가 = 의견·평가·수정·질문 메시지 = AI가 = 그에 맞는 응답 = 새 단락 자동 추가 X.
 */
function buildChatPrompt(b: RequestBody): string {
  const genre = findGenre(b.genreLetter);
  const priorPart = b.prior
    ? "\n\n## 작가가 이번 요청에 박은 컨텍스트\n" +
      Object.entries(b.prior)
        .map(([k, v]) => `### ${k}\n${(v || "").slice(0, 2500)}`)
        .join("\n\n")
    : "";

  return `# 작업: 작가와 대화 (본문 작성 모드)

## 매체
**${genre.name} (${genre.sub})** — 작가가 현재 작품 본문 작성 중. 채팅창에서 작가가 메시지를 보냄.

## 작가 의도 (★ 절대 준수)
1. 작가가 **수정 요청** (예: "첫 씬이 짧다", "X번 단락 다시", "톤 바꿔") = 그 단락 어떻게 수정할지 = **대화로 의견·제안 박음**. 본문 자동 다시 박지 X = 작가가 "그대로 적용해줘" 명시할 때만 박음.
2. 작가가 **질문·평가·의견** (예: "어때?", "괜찮아?", "이 톤 맞아?") = **의견 응답**. 본문 추가 X.
3. 작가가 **설명 요청** (예: "왜 이렇게 썼어?", "이유는?") = **이유 설명**. 본문 추가 X.

## 응답 형식
- 평어체 또는 작가 호칭. 짧게 (2~5문장 권장). 작가가 자세히 요청 시만 길게.
- 작가의 직전 메시지 = 그대로 읽고 = 그에 맞게 응답.
- 인사·자기소개·"다음 단계 안내" 자동 박지 X.
- 마크다운 표기 (** ## ---) 자제 = 평문 대화처럼.
- 본문 작성 형식 (S#1. 장소-시간, [컷1] 등) = 박지 X (= 단순 대화).

## ★ "다음 단락 박아줘" 명시
작가가 "이대로 박아줘", "다음 단락 작성", "이어서" 등 명시하면 = 그때는 **다음 단락 작성 모드**로 전환:
- 위 매체 표준 양식 (S#1. 등) 적용
- 본문만 박음 (메타 X)
${priorPart}

## 출력
작가 직전 메시지에 맞는 대화 응답. 본문 자동 추가 X.`;
}

/**
 * ★ V2.13.3 — 카드별 채팅(ItemMiniChat) 전용 프롬프트.
 *
 * 옛 사고 (대표님 지적 2026-05-18): isChatMode 채팅인데도 buildUserPrompt가
 * 대화 prefix("5개 후보 금지") 뒤에 stage-builder base("제목 후보 5개를 내라")를
 * 그대로 붙여 = 모순된 지시 = 모델(haiku)이 뒤쪽 base를 따라 또 5개 박음.
 * 작가가 제목을 직접 지정해도 무시 + 새 후보 5개 = "소통 안 하고 혼자 함".
 *
 * 정정: 카드 채팅 = stage-builder base를 아예 쓰지 X = 이 대화 전용 프롬프트로 대체.
 *       매체·아이디어·현재 카드 본문 컨텍스트는 유지하되 "후보 5개" 형식은 배제.
 */
function buildCardChatPrompt(b: RequestBody): string {
  const genre = findGenre(b.genreLetter);
  const cardLabel = CATEGORY_LABEL[b.mode] ?? b.mode;
  const priorPart = b.prior
    ? "\n\n## 작가가 이번 요청에 박은 컨텍스트\n" +
      Object.entries(b.prior)
        .map(([k, v]) => `### ${k}\n${(v || "").slice(0, 2500)}`)
        .join("\n\n")
    : "";
  const ideaPart = b.idea ? `\n\n## 작품 아이디어\n${b.idea.slice(0, 1500)}` : "";

  return `# 작업: 작가와 「${cardLabel}」 같이 다듬기 (대화)

## 매체
**${genre.name} (${genre.sub})** — 작가가 「${cardLabel}」 카드를 다듬는 중. 채팅으로 디렉션을 보냄.

## 작가 의도 (★ 절대 준수)
1. 작가의 직전 메시지를 그대로 읽고 = 그에 맞춰 응답한다.
2. 작가가 **본인 안을 직접 제시·지정** (예: "제목은 OOO로 할게", "이걸로 가자") = 그 안을 받아들이고 = 짧은 평가·확정만. **새 후보를 다시 내지 X.**
3. 작가가 **디렉션** (예: "더 짧게", "톤 바꿔") = 디렉션 반영해 = 1~3개만 제안. 5개 자동 X.
4. 작가가 **명시적으로 "후보 더 줘"** 요청 = 그때만 여러 개 제안.
5. "후보 5개"를 자동으로 박는 stage 형식 = 절대 쓰지 X = 대화 우선.

## 응답 형식
- 짧게 (2~5문장 권장). 평어체 또는 작가 호칭.
- 인사·자기소개·"다음 단계 안내" 자동 박지 X = 작가 메시지에 곧바로 답.

## ★★★ 확정 마커 (작가가 결정하면 = 반드시 출력)
작가가 「${cardLabel}」을 확정·결정하는 의사를 보이면 (예: "이걸로 가자", "OOO로 할게", "1번", "그래 그거", "확정"):
1. 먼저 대화 응답을 자연스럽게 쓰고,
2. **응답 맨 마지막 줄에 정확히 이 형식 한 줄**을 추가한다:
   [[확정:확정된 「${cardLabel}」 내용만]]
- 내용만 넣는다 — 「」·번호·설명·잡담 다 빼고 순수 결과만. (예: \`[[확정:미래의 아이]]\`)
- 작가가 아직 확정 안 함 (디렉션·질문·고민 중) = 이 줄 출력 X.
- 이 줄은 작가 화면엔 안 보이고 = 카드 확정란에 자동 반영되는 신호다.${ideaPart}${priorPart}

## 출력
작가 직전 메시지에 맞는 대화 응답. (작가가 확정했으면 = 맨 마지막 줄에 [[확정:...]])`;
}

/**
 * ★ V2.12.5 정정 — 대화 모드 prefix
 *
 * 옛 사고: stage builder (buildTitlePrompt 등) = 무조건 "5개 후보 5개" 형식 강제 →
 * 작가가 본인 제목 제시·의견 묻기 = 무시 + 또 5개 후보 박음 = "대화가 아님" (사장님 분노).
 *
 * 정정: conversationMessages.length > 0 = 옛 turn 박혔으면 = "대화 모드" prefix를 user prompt 맨 앞에 박음.
 * = AI가 stage builder 형식 강제 무시 + 작가 메시지에 대화로 응답.
 */
function buildConversationModePrefix(b: RequestBody): string {
  const hasHistory = (b.conversationMessages?.length ?? 0) > 0;
  const isChat = b.isChatMode === true;
  // ★ V2.13.2 정정 — isChatMode 명시 또는 = 옛 turn 박혀있으면 = 대화 모드
  // 옥 = hasHistory만 = 작가가 첫 메시지 박을 때 = false = stage builder 형식 강제 = 5개 후보 사고
  if (!hasHistory && !isChat) return "";
  return `# ★★★ 대화 모드 (= 작가와 대화 중) ★★★

작가가 이미 = 이 단계 (${b.mode})에서 = 옛에 답을 받음. 지금은 **대화 중**.

## 작가 메시지 해석 룰 (★ 절대 준수)
1. **작가가 본인 제안 제시** (예: "다시 만난 너 어때?", "이 제목 어때?") = 그 제안에 대한 **평가** 박음 (= 좋은 점·약한 점·개선 제안). 5개 후보 자동 박지 X.
2. **작가가 의견 묻기** (예: "어떻게 생각해?", "괜찮아?") = 의견 박음. 후보 박지 X.
3. **작가가 명시적으로 "새 후보 더 박아줘" 요청** = 그때만 = 새 후보 박음.
4. **작가가 디렉션 박음** (예: "더 짧게", "톤 바꿔") = 디렉션 반영해서 = 1~3개 정도 박음 (5개 자동 X).
5. **작가의 직전 메시지 = 항상 읽고 = 그에 맞게 응답**. stage builder 형식 (= "## 출력 형식 ### 후보 5개" 등) = **무시**해도 OK = 대화 우선.

## 형식
- 자유 대화 형식 = 평어체 또는 작가 호칭 사용
- 짧게 (= 2~5문장 권장). 작가가 자세히 요청 시만 길게.
- 인사·자기소개·"다음 단계 안내" 자동 박지 X = 작가 의도에 맞게.

---

`;
}

/**
 * ★ V2.13.4 (2026-05-19) — 대화 기록을 userMessage에 실제로 박는다.
 *
 * 근본 사고: Tauri 데스크탑 path = `claude` CLI subprocess = single prompt만 받음
 * (멀티턴 args 없음). enrichBody가 conversationMessages를 채우고 build-prompt까지
 * 전달되지만, buildUserPrompt가 그걸 userMessage에 안 박아서 = claude CLI가
 * 옛 대화를 볼 방법이 전혀 없었음. buildConversationModePrefix는 "대화 모드"라는
 * 라벨만 붙이고 실제 turn은 누락 = "작가의 직전 메시지를 읽어라"는 빈 약속.
 * 증상: 작가가 "1번으로 가자" 해도 1번이 뭔지 모름 = 동문서답 (대표님 지적 2026-05-19).
 *
 * 정정: 옛 turn을 "작가:/보조작가:" 텍스트로 포맷해 userMessage에 포함.
 */
function formatConversationHistory(msgs?: ConversationMessage[]): string {
  if (!msgs || msgs.length === 0) return "";
  const recent = msgs.slice(-20); // 최근 20 turn (work-id.ts appendTurns와 동일 상한)
  const lines = recent.map(m => {
    const who = m.role === "user" ? "작가" : "보조작가";
    return `${who}: ${(m.content || "").slice(0, 3000)}`;
  });
  return `## ★★★ 지금까지 나눈 대화 (반드시 이어서 응답)

${lines.join("\n\n")}

위 대화 흐름을 그대로 인지하고, 작가의 마지막 메시지에 이어서 답한다.
작가가 "1번"·"2번"·"그거"·"방금 말한 거"·"아까 그 제목"이라고 하면 = 위 대화에서 보조작가가 제시한 바로 그 항목을 가리킨다. 절대 새로 지어내지 X.`;
}

function buildUserPrompt(b: RequestBody): string {
  const learning = formatWriterLearning(b.writerLearning);
  const memory = formatWorkMemoryFromFiles(b.priorFiles);
  const conversationPrefix = buildConversationModePrefix(b);
  // ★ V2.13.4 — 대화 turn을 실제로 박음 (= 옛 누락 사고 정정)
  const conversationHistory = formatConversationHistory(b.conversationMessages);

  // ★ V2.13.3 — 카드 채팅(isChatMode)이면 stage-builder base 대신 대화 전용 프롬프트.
  //   = prefix("5개 후보 금지")와 stage-builder("5개 후보 강제")의 모순 제거 (대표님 지적 2026-05-18).
  //   mode가 "chat"이면 이미 buildChatPrompt를 타므로 그대로 둠.
  const isCardChat = b.isChatMode === true && b.mode !== "chat";
  const base = isCardChat ? buildCardChatPrompt(b) : buildBasePrompt(b);

  const parts = [memory, learning, conversationPrefix, conversationHistory, base].filter(Boolean);
  return parts.join("\n\n---\n\n");
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "잘못된 요청 형식입니다." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const userMessage = buildUserPrompt(body);
    const systemPrompt = getSystemPrompt();
    // ★ V2.14.7 — 모델 ID는 server-safe lib/storymaker/model-ids.ts에서 (persist·useState 의존 X).
    const { resolveModelId } = await import("@/lib/storymaker/model-ids");
    const model = resolveModelId(body.model, body.fast === true);

    return new Response(
      JSON.stringify({
        systemPrompt,
        userMessage,
        model,
        conversationMessages: body.conversationMessages ?? [],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: `prompt 빌드 실패: ${msg}` }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
