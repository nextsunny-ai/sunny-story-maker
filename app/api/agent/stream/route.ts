import Anthropic from "@anthropic-ai/sdk";
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
  buildDynamicContext,
  type TargetPersona,
  type Workflow,
} from "@/lib/storymaker/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const workflowFor = (genre: Genre): Workflow => ({
  steps: genre.steps.map(s => ({ n: s.n, name: s.name })),
});

const findGenre = (letter?: string): Genre => {
  return GENRES.find(g => g.letter === letter) || GENRES[0];
};

interface RequestBody {
  mode: string;                    // pitch, write, review, chat, adapt, revise, ...
  idea?: string;                   // 한 줄 아이디어
  genreLetter?: string;            // A~M
  targetGenreLetter?: string;      // adapt/osmu 용
  text?: string;                   // 리뷰/각색 대상 본문
  stage?: string;                  // collaborate/script 단계 표시
  userInput?: Record<string, string>;
  prior?: Record<string, string>;  // 직전 산출물
  artifactKeys?: string[];         // package 모드 산출물 선택
  targets?: TargetPersona[];       // targeted review 페르소나
  direction?: string;              // revise 방향
  targetSection?: string;          // script/revise 섹션
  versionNumber?: number;          // revise 버전
  sourceIp?: string;               // osmu 원천 IP
  profile?: Record<string, unknown> | null;
  lessons?: string;
  fast?: boolean;                  // true → Haiku, false → Opus
}

function buildUserPrompt(b: RequestBody): string {
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

    case "targeted-review":
      return buildTargetedReviewPrompt(b.text ?? "", b.targets ?? [], genre);

    case "adapt":
      return buildAdaptPrompt(b.text ?? "", genre, targetGenre);

    case "revise":
      return buildRevisePrompt(b.text ?? "", b.direction ?? "", genre, b.targetSection, b.versionNumber);

    case "logline":
      return buildLoglinePrompt(b.idea ?? "", genre, b.userInput);

    case "synopsis":
      return buildSynopsisPrompt(b.idea ?? "", genre, b.userInput, b.prior);

    case "treatment":
      return buildTreatmentPrompt(b.idea ?? "", genre, b.userInput, b.prior);

    case "characters":
      return buildCharactersPrompt(b.idea ?? "", genre, b.userInput, b.prior);

    case "worldview":
      return buildWorldviewPrompt(b.idea ?? "", genre, b.userInput, b.prior);

    case "episodes":
      return buildEpisodesPrompt(b.idea ?? "", genre, b.userInput, b.prior);

    case "proposal":
      return buildProposalPrompt(b.idea ?? "", genre, b.userInput, b.prior);

    case "script":
      return buildScriptPrompt(b.idea ?? "", genre, b.userInput, b.prior, b.targetSection);

    case "package":
    case "full-package":
      return buildFullPackagePrompt(b.idea ?? "", genre, b.userInput ?? {}, b.artifactKeys ?? []);

    case "osmu":
      return buildOsmuPrompt(b.idea ?? "", b.sourceIp);

    default:
      throw new Error(`Unknown mode: ${b.mode}`);
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인해주세요." }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "잘못된 요청 형식입니다." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  let userPrompt: string;
  try {
    userPrompt = buildUserPrompt(body);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "프롬프트 생성 실패" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // 작가 프로필 + 학습 = user 메시지에 prepend (system은 cache 적중 위해 정적 유지)
  const dynamicContext = buildDynamicContext(body.profile ?? null, body.lessons ?? "");
  const finalUserMessage = dynamicContext + userPrompt;

  const model = body.fast
    ? (process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20251001")
    : (process.env.ANTHROPIC_MODEL || "claude-opus-4-7");

  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const response = await client.messages.stream({
          model,
          max_tokens: 8192,
          system: [
            {
              type: "text",
              text: getSystemPrompt(),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: finalUserMessage }],
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send("delta", { text: event.delta.text });
          } else if (event.type === "message_stop") {
            send("done", {});
          }
        }

        const finalMessage = await response.finalMessage();
        send("usage", {
          input_tokens: finalMessage.usage.input_tokens,
          output_tokens: finalMessage.usage.output_tokens,
          cache_read_input_tokens: finalMessage.usage.cache_read_input_tokens ?? 0,
          cache_creation_input_tokens: finalMessage.usage.cache_creation_input_tokens ?? 0,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Anthropic API 호출 실패";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
