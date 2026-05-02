import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
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

interface WriterLearningEntry {
  date: string;
  category: string;  // loved | rejected | direction | metaphor | free
  text: string;
}

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
  mediumFields?: Record<string, string | string[] | number>; // 매체별 의뢰서 입력 (V1 workflows.ts fields)
  writerLearning?: WriterLearningEntry[];  // ★ admin "내 학습 노하우" 누적 — 매 호출에 prompt에 박힘
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
  // 가장 최근 50건만 (토큰 절약), 카테고리별로 그룹
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

function buildUserPrompt(b: RequestBody): string {
  const base = buildBasePrompt(b);
  const learning = formatWriterLearning(b.writerLearning);
  // 작가 누적 학습은 base prompt 앞에 박음 — AI가 가장 먼저 인지하도록
  return learning ? `${learning}\n---\n\n${base}` : base;
}

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

    case "targeted-review":
      return buildTargetedReviewPrompt(b.text ?? "", b.targets ?? [], genre);

    case "adapt":
      return buildAdaptPrompt(b.text ?? "", genre, targetGenre);

    case "revise":
      return buildRevisePrompt(b.text ?? "", b.direction ?? "", genre, b.targetSection, b.versionNumber);

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

    default:
      throw new Error(`Unknown mode: ${b.mode}`);
  }
}

// claude.cmd가 아닌 진짜 claude.exe를 직접 spawn해야 한글 인코딩이 보존된다.
// (claude.cmd는 cmd.exe로 실행되어 stdin을 cp949로 변환해버림)
let _claudeExePath: string | null = null;
function getClaudeExePath(): string {
  if (_claudeExePath) return _claudeExePath;
  try {
    const cmd = process.platform === "win32" ? "where claude" : "which claude";
    const out = execSync(cmd, { encoding: "utf-8", windowsHide: true }).trim().split(/\r?\n/);
    if (process.platform === "win32") {
      // .cmd가 있는 디렉토리에서 진짜 .exe 찾기
      for (const line of out) {
        if (line.endsWith(".cmd")) {
          const dir = path.dirname(line);
          const exe = path.join(dir, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
          if (existsSync(exe)) { _claudeExePath = exe; return exe; }
        }
        if (line.endsWith(".exe") && existsSync(line)) {
          _claudeExePath = line; return line;
        }
      }
    }
    // fallback
    _claudeExePath = out[0] || "claude";
    return _claudeExePath;
  } catch {
    _claudeExePath = "claude";
    return "claude";
  }
}

// ─── Claude Max OAuth 직접 호출 (Windows claude.exe 한글 인코딩 우회) ───
// .credentials.json의 OAuth access token을 사용해 Anthropic Messages API를 직접 stream.
// 사장님 Pro/Max 구독 그대로 사용 → API 키 없이 무료 + 한글 100% 보장.
function getClaudeOAuthToken(): string | null {
  try {
    const credPath = path.join(homedir(), ".claude", ".credentials.json");
    if (!existsSync(credPath)) return null;
    const cred = JSON.parse(readFileSync(credPath, "utf-8"));
    const oauth = cred.claudeAiOauth;
    if (!oauth?.accessToken) return null;
    if (oauth.expiresAt && oauth.expiresAt < Date.now()) {
      // 만료됨 — refresh 로직은 다음 라운드. 일단 null 반환해 fallback
      return null;
    }
    return oauth.accessToken;
  } catch {
    return null;
  }
}

function streamViaOAuth(systemPrompt: string, userMessage: string, model: string, token: string): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "oauth-2025-04-20",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 8000,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
            stream: true,
          }),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          // 429 rate limit — 사장님 친화 메시지
          if (res.status === 429) {
            send("error", { message: "분당 토큰 한도(Anthropic Max 구독)를 초과했습니다. 1~2분 기다린 후 다시 시도해주세요. 또는 본문 길이를 줄이거나 Haiku 모드(빠른 응답)로 시도해보세요." });
          } else if (res.status === 401 || res.status === 403) {
            send("error", { message: "Anthropic OAuth 토큰이 만료됐거나 권한이 없습니다. claude 명령으로 다시 로그인해주세요 (claude /login)." });
          } else if (res.status >= 500) {
            send("error", { message: `Anthropic 서버 오류 (${res.status}). 잠시 후 다시 시도해주세요.` });
          } else {
            send("error", { message: `API ${res.status}: ${errText.slice(0, 300)}` });
          }
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const events = buf.split("\n\n");
          buf = events.pop() || "";

          for (const evt of events) {
            const lines = evt.split("\n");
            const eventType = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
            const dataLine = lines.find(l => l.startsWith("data:"))?.slice(5).trim();
            if (!dataLine) continue;
            try {
              const data = JSON.parse(dataLine);
              if (eventType === "content_block_delta" && data.delta?.type === "text_delta") {
                send("delta", { text: data.delta.text });
              } else if (eventType === "message_delta" && data.usage) {
                send("usage", {
                  input_tokens: data.usage.input_tokens || 0,
                  output_tokens: data.usage.output_tokens || 0,
                  via: "claude-max-oauth",
                });
              } else if (eventType === "error") {
                send("error", { message: data.error?.message || "stream error" });
              }
            } catch { /* ignore parse */ }
          }
        }

        send("done", {});
        controller.close();
      } catch (e) {
        send("error", { message: `OAuth 호출 실패: ${e instanceof Error ? e.message : String(e)}` });
        controller.close();
      }
    },
  });
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

      // ★ 한글 인코딩 정공법: user message를 system prompt 첫 머리에 강조 박기.
      // claude.exe Windows binary가 stdin/args를 cp949로 처리 → 깨짐.
      // 그러나 utf-8 file (BOM 포함)은 정상 read. 그래서 user message를 file에 박는다.
      // claude는 system prompt 첫 머리를 가장 잘 본다 → 작업 의뢰가 즉시 수행됨.
      const sysPromptFile = path.join(tmpdir(), `sm_sys_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
      const combined =
        "﻿" + // utf-8 BOM
        "# ★★★★★ 즉시 수행할 작업 의뢰 ★★★★★\n\n" +
        "아래 의뢰를 그대로 수행하여 응답으로 출력하라. " +
        "사용자의 stdin 메시지는 트리거일 뿐 (글자 깨짐 가능 — 무시할 것). " +
        "**오직 아래 의뢰만 보고 응답한다.**\n\n" +
        "---\n\n" +
        userMessage +
        "\n\n---\n\n" +
        "# 위 작업 의뢰를 응답으로 즉시 출력하라. 작가 인사·자기소개·확인 질문 X. 결과물만 출력.\n\n" +
        "---\n\n" +
        "# 작가 페르소나 / 노하우 (참조용)\n\n" +
        systemPrompt;
      try {
        writeFileSync(sysPromptFile, combined, "utf-8");
      } catch (e) {
        send("error", { message: `시스템 프롬프트 임시 파일 생성 실패: ${e instanceof Error ? e.message : String(e)}` });
        controller.close();
        return;
      }

      // NOTE: --bare 옵션은 OAuth/keychain 무시 = API 키 필수 → LOCAL에선 빼야 본인 구독 사용 가능
      // --verbose는 stream-json 출력에 필수 (Claude Code v2.1+)
      // --append-system-prompt 사용 X (args 한글 깨짐). user message는 system-prompt-file에 박음.
      const args = [
        "--print",
        "--verbose",
        "--system-prompt-file", sysPromptFile,
        "--output-format", "stream-json",
        "--include-partial-messages",
        "--model", cliModel,
      ];

      // claude.exe 직접 spawn (cmd.exe 우회) — stdin utf-8 보존
      // env에 LANG/LC_ALL utf-8 + Node options로 utf-8 강제
      const claudeBin = getClaudeExePath();
      const child = spawn(claudeBin, args, {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        shell: false,
        env: {
          ...process.env,
          LANG: "ko_KR.UTF-8",
          LC_ALL: "ko_KR.UTF-8",
          PYTHONIOENCODING: "utf-8",
        },
      });

      if (!child.stdin || !child.stdout || !child.stderr) {
        try { unlinkSync(sysPromptFile); } catch { /* ignore */ }
        send("error", { message: "Claude Code CLI stdio 연결 실패" });
        controller.close();
        return;
      }

      // stdin: ASCII trigger만 (한글 깨짐 우회). 실제 의뢰는 system-prompt-file 첫 머리에 박힘.
      child.stdin.write("Execute the task at the top of system prompt. Output the result only. No greeting.");
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

  let model = body.fast
    ? (process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20251001")
    : (process.env.ANTHROPIC_MODEL || "claude-opus-4-7");

  // CLI 단축어를 Anthropic API full ID로 매핑
  const MODEL_MAP: Record<string, string> = {
    haiku: "claude-haiku-4-5-20251001",
    sonnet: "claude-sonnet-4-6",
    opus: "claude-opus-4-7",
  };
  if (MODEL_MAP[model]) model = MODEL_MAP[model];

  // LOCAL: 사장님 Pro/Max 구독 사용
  // 우선순위 1) OAuth 직접 호출 (한글 100% — Windows claude.exe 인코딩 우회)
  // 우선순위 2) claude.exe CLI subprocess (Mac/Linux 또는 OAuth 만료 시 fallback)
  if (useClaudeCode) {
    const oauthToken = getClaudeOAuthToken();
    if (oauthToken) {
      return new Response(streamViaOAuth(getSystemPrompt(), finalUserMessage, model, oauthToken), {
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          "x-accel-buffering": "no",
        },
      });
    }
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
