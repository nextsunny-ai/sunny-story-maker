import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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

// ─── Claude Code CLI subprocess (LOCAL = 본인 구독, API 비용 0) ───
function streamViaClaudeCode(systemPrompt: string, userMessage: string, model: string): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const cliModel = model.includes("haiku") ? "haiku" : model.includes("sonnet") ? "sonnet" : "opus";

      // System prompt를 임시 파일에 쓰기 (Windows command line 길이 제한 회피 — ENAMETOOLONG)
      const sysPromptFile = path.join(tmpdir(), `sm_sys_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
      try {
        writeFileSync(sysPromptFile, systemPrompt, "utf-8");
      } catch (e) {
        send("error", { message: `시스템 프롬프트 임시 파일 생성 실패: ${e instanceof Error ? e.message : String(e)}` });
        controller.close();
        return;
      }

      // NOTE: --bare 옵션은 OAuth/keychain 무시 = API 키 필수 → LOCAL에선 빼야 본인 구독 사용 가능
      // --verbose는 stream-json 출력에 필수 (Claude Code v2.1+)
      const args = [
        "--print",
        "--verbose",
        "--system-prompt-file", sysPromptFile,
        "--output-format", "stream-json",
        "--include-partial-messages",
        "--model", cliModel,
      ];

      const child = spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true, shell: true });
      child.stdin.write(userMessage);
      child.stdin.end();

      let buffer = "";
      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.type === "stream_event" && obj.event?.type === "content_block_delta") {
              const delta = obj.event.delta;
              if (delta?.type === "text_delta" && delta.text) send("delta", { text: delta.text });
            } else if (obj.type === "assistant" && obj.message?.content) {
              for (const block of obj.message.content) {
                if (block.type === "text" && block.text) send("delta", { text: block.text });
              }
            } else if (obj.type === "result") {
              send("usage", {
                input_tokens: obj.usage?.input_tokens || 0,
                output_tokens: obj.usage?.output_tokens || 0,
                via: "claude-code-cli",
              });
            }
          } catch { /* ignore parse */ }
        }
      });

      let stderr = "";
      child.stderr.on("data", (c: Buffer) => { stderr += c.toString("utf-8"); });

      child.on("close", (code) => {
        try { unlinkSync(sysPromptFile); } catch { /* ignore */ }
        if (code !== 0) {
          send("error", { message: `Claude Code CLI exit ${code}${stderr ? ": " + stderr.slice(0, 300) : ""}` });
        }
        send("done", {});
        controller.close();
      });

      child.on("error", (err) => {
        try { unlinkSync(sysPromptFile); } catch { /* ignore */ }
        send("error", { message: `Claude Code CLI 실행 실패: ${err.message}` });
        controller.close();
      });
    },
  });
}

export async function POST(req: NextRequest) {
  const useClaudeCode = process.env.USE_CLAUDE_CODE === "true";
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!useClaudeCode && !apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. (또는 USE_CLAUDE_CODE=true)" }),
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

  // LOCAL: Claude Code CLI subprocess (본인 구독, 무료)
  if (useClaudeCode) {
    return new Response(streamViaClaudeCode(getSystemPrompt(), finalUserMessage, model), {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  }

  const client = new Anthropic({ apiKey: apiKey! });

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
