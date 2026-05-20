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
  buildDynamicContext,
  buildGrantMetaPrompt,
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

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
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
  priorFiles?: Record<string, string>; // ★ 2026-05-05: 작품 누적 메모리 (= Supabase에서 stream POST 시작부에 fetch)
  artifactKeys?: string[];         // package 모드 산출물 선택
  targets?: TargetPersona[];       // targeted review 페르소나
  direction?: string;              // revise 방향
  targetSection?: string;          // script/revise 섹션
  versionNumber?: number;          // revise 버전
  sourceIp?: string;               // osmu 원천 IP
  profile?: Record<string, unknown> | null;
  lessons?: string;
  fast?: boolean;                  // 옛 호환 — true → Haiku
  model?: string;                  // ★ V2.13.4 — "haiku"|"sonnet"|"opus" (있으면 우선)
  mediumFields?: Record<string, string | string[] | number>; // 매체별 의뢰서 입력 (V1 workflows.ts fields)
  writerLearning?: WriterLearningEntry[];  // ★ admin "내 학습 노하우" 누적 — 매 호출에 prompt에 박힘
  workId?: string;  // ★ 작품 메모리 키 — 있으면 _works/[workId]/*.md 자동 read 후 prior 박음
  // ★ 작품 1개 = conversation 1개 = AI가 작품 전체 기억하면서 이어 작업
  //   매 호출 = 옛 user/assistant turn들 누적 박힘 + 새 user msg 추가
  //   prompt cache 1h TTL = 옛 turn들도 cached = 입력 토큰 1/10
  conversationMessages?: ConversationMessage[];
  isChatMode?: boolean;  // ★ V3.1 #11 — 카드 채팅 (build-prompt 일관성). true면 buildCardChatPrompt 사용
}

interface WriterLearningEntry {
  date: string;
  category: string;
  text: string;
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

// ★ V3.1 #11 — build-prompt 일관성. 카드 채팅 전용 프롬프트 (5개 후보 강제 X).
function buildCardChatPrompt(b: RequestBody): string {
  const genre = findGenre(b.genreLetter);
  const cardLabel = b.mode;
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
2. 작가가 **본인 안을 직접 제시·지정** = 그 안을 받아들이고 = 짧은 평가·확정만. **새 후보를 다시 내지 X.**
3. 작가가 **디렉션** (예: "더 짧게", "톤 바꿔") = 디렉션 반영해 = 1~3개만 제안. 5개 자동 X.
4. 작가가 **명시적으로 "후보 더 줘"** 요청 = 그때만 여러 개 제안.
5. "후보 5개"를 자동으로 박는 stage 형식 = 절대 쓰지 X = 대화 우선.

## 응답 형식
- 짧게 (2~5문장 권장). 평어체 또는 작가 호칭.
- 인사·자기소개·"다음 단계 안내" 자동 박지 X = 작가 메시지에 곧바로 답.

## ★★★ 확정 마커 (작가가 결정하면 = 반드시 출력)
작가가 「${cardLabel}」을 확정·결정하는 의사를 보이면 (예: "이걸로 가자", "1번", "그래 그거", "확정"):
1. 먼저 대화 응답을 자연스럽게 쓰고,
2. 응답 맨 마지막 줄에 정확히 \`[[확정:확정된 내용만]]\` 한 줄을 추가한다.
- 내용만 넣는다 — 「」·번호·설명·잡담 다 빼고 순수 결과만.${ideaPart}${priorPart}

## 출력
작가 직전 메시지에 맞는 대화 응답. (작가가 확정했으면 = 맨 마지막 줄에 [[확정:...]])`;
}

// ★ V3.1 #11 — 옛 turn을 userMessage에 박음 (V2.13.4 사고 정정의 웹 path 일관성)
function formatConversationHistory(msgs?: ConversationMessage[]): string {
  if (!msgs || msgs.length === 0) return "";
  const recent = msgs.slice(-20);
  const lines = recent.map((m) => {
    const who = m.role === "user" ? "작가" : "보조작가";
    return `${who}: ${(m.content || "").slice(0, 3000)}`;
  });
  return `## ★★★ 지금까지 나눈 대화 (반드시 이어서 응답)

${lines.join("\n\n")}

위 대화 흐름을 그대로 인지하고, 작가의 마지막 메시지에 이어서 답한다.
작가가 "1번"·"2번"·"그거"·"방금 말한 거"라고 하면 = 위 대화에서 보조작가가 제시한 바로 그 항목을 가리킨다. 절대 새로 지어내지 X.`;
}

function buildUserPrompt(b: RequestBody): string {
  const learning = formatWriterLearning(b.writerLearning);
  const memory = formatWorkMemoryFromFiles(b.priorFiles);
  const conversationHistory = formatConversationHistory(b.conversationMessages);

  // ★ V3.1 #11 — 카드 채팅(isChatMode)이면 stage-builder base 대신 대화 전용 프롬프트.
  //   build-prompt route와 동일 흐름 = 웹 path도 카드 채팅 5개 후보 강제 X.
  const isCardChat = b.isChatMode === true && b.mode !== "chat";
  const base = isCardChat ? buildCardChatPrompt(b) : buildBasePrompt(b);

  const parts = [memory, learning, conversationHistory, base].filter(Boolean);
  return parts.join("\n\n---\n\n");
}

/**
 * 작품 메모리 (.md 파일들) — 매 AI 호출 자동 prior.
 *
 * ★ 2026-05-05 마이그레이션: _works/ 파일 read → priorFiles (= stream POST handler에서 Supabase fetch 후 body에 박음).
 * 동기 함수 유지 = 호출 체인 변경 X. Supabase fetch는 stream route POST 시작부에서 1회.
 */
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

// haiku 모델 ID — opus·sonnet이 구독 한도(429)로 막힐 때 자동 fallback 대상.
// ★ V2.14.1 — lib/storymaker/model-prefs.ts의 MODEL_IDS.haiku와 같은 값 (직접 import은 함수 클로저 깊이라 const 유지).
const HAIKU_MODEL_ID = "claude-haiku-4-5-20251001";

function streamViaOAuth(systemPrompt: string, messages: ConversationMessage[], model: string, token: string): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // ★ messages 마지막 turn에 cache_control 박음 — 작품 전체 conversation = 다음 호출에서 cached
      //   (Anthropic prompt cache: 마지막 cache_control 지점까지 prefix가 cached)
      const apiMessages = messages.map((m, i) => {
        if (i === messages.length - 1 && m.role === "user") {
          // 마지막 user msg에는 박지 X — 매번 새로 들어오니 = cache miss. 직전 assistant까지 cached.
          return { role: m.role, content: m.content };
        }
        // 마지막 직전 turn = cache_control (= 그 이전까지 다 cached prefix)
        if (i === messages.length - 2) {
          return {
            role: m.role,
            content: [{ type: "text", text: m.content, cache_control: { type: "ephemeral", ttl: "1h" } }],
          };
        }
        return { role: m.role, content: m.content };
      });

      // ★ 한 모델로 호출 시도. opus·sonnet이 429(구독 한도)면 = haiku로 1회 자동 재시도해
      //   작가가 한도가 차도 안 막히고 계속 작업하게 한다 (품질만 약간 낮아짐).
      const attempt = async (useModel: string): Promise<void> => {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "anthropic-version": "2023-06-01",
            // ★ extended-cache-ttl-2025-04-11 = 1h TTL beta + oauth + prompt-caching
            "anthropic-beta": "oauth-2025-04-20,extended-cache-ttl-2025-04-11",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: useModel,
            max_tokens: 8000,
            // ★ system prompt = 1h TTL cache (= 작가가 1시간 안 다음 호출 = 70KB 스킬 cache hit = 토큰 1/10)
            system: [
              {
                type: "text",
                text: systemPrompt,
                cache_control: { type: "ephemeral", ttl: "1h" },
              },
            ],
            messages: apiMessages,
            stream: true,
          }),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          // 429 = Claude 구독 한도 — 5시간/7일 단위. 한도 50%+ 차면 opus·sonnet 막히고 haiku만 fallback.
          if (res.status === 429) {
            // ★ haiku 자동 fallback — opus·sonnet 한도가 차도 작가가 안 막히게.
            if (!useModel.includes("haiku")) {
              send("notice", { message: "Claude 구독 한도(5시간·7일 단위)에 도달해 Haiku 모델로 자동 전환했습니다. 계속 작업할 수 있습니다 (품질이 약간 달라질 수 있습니다)." });
              return attempt(HAIKU_MODEL_ID);
            }
            send("error", { message: "Claude 구독 사용 한도에 도달했습니다. Haiku 모델도 한도가 찼습니다 — 잠시 후(5시간 또는 7일 단위) 자동으로 리셋됩니다." });
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
      };

      try {
        await attempt(model);
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
  // ★ BYOK 정통 모델 (글로벌 룰 16, 2026-05-11·2026-05-20 재확인):
  // - 작가 = 본인 PC Claude Code OAuth 토큰 (~/.claude/.credentials.json) → streamViaOAuth
  //   또는 = `claude` CLI subprocess → streamViaClaudeCode
  // - Pro/Max 구독($20~$100/월)으로 감당 = 사장님·작가 추가 비용 0
  // - 옛 body.userApiKey (작가 본인 API 키) path = 2026-05-18 제거됨
  // - 대표님 ANTHROPIC_API_KEY (Vercel 환경변수) = 박지 X (영구 룰)
  //   → 웹에서 호출 시도 = DESKTOP_REQUIRED 안내 (= 다운로드 페이지로)
  const useClaudeCode = process.env.USE_CLAUDE_CODE === "true";

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "잘못된 요청 형식입니다." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // Story Maker는 데스크탑(claude CLI 구독)에서만 claude를 호출. 웹은 데스크탑 안내.
  // 옛 웹 BYOK(작가 본인 API 키) 방식 = 제거됨 (대표님 결정 2026-05-18, 글로벌 룰 16).
  if (!useClaudeCode) {
    return new Response(
      JSON.stringify({
        error: "Story Maker는 데스크탑 버전에서 사용합니다. Claude Pro 구독($20/월)만 있으면 추가 비용 없이 무제한으로 쓸 수 있습니다. story.sunnytoon.com/download 에서 데스크탑 버전을 받으세요.",
        code: "DESKTOP_REQUIRED",
      }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }

  // ★ V2.14.1 — license banned 체크 (옛엔 banned 작가도 호출 가능 = 라이선스 시스템이 장식)
  try {
    const { createClient: createSupabaseServer } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServer();
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      const { data: licenseRow } = await supabase
        .from("licenses")
        .select("plan, status")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (licenseRow?.plan === "banned" || licenseRow?.status === "suspended") {
        return new Response(
          JSON.stringify({
            error: "계정이 정지되었습니다. 지원팀(support@sunnytoon.com)에 문의해주세요.",
            code: "BANNED",
          }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }
    }
  } catch {
    // license 조회 실패 = 무시 (= 라이선스 없는 옛 작가 호환 + Supabase 다운 시 작품 작업 보호)
  }

  // ★ 2026-05-05: 작품 누적 메모리 = Supabase에서 fetch (= 옛 _works/ 폴더 read 대체).
  // RLS = auth.uid() 본인 작품만 = 안전.
  if (body.workId && !body.priorFiles) {
    try {
      const { createClient: createSupabaseServer } = await import("@/lib/supabase/server");
      const supabase = await createSupabaseServer();
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: workRow } = await supabase
          .from("works")
          .select("files")
          .eq("user_id", authData.user.id)
          .eq("work_id", body.workId.slice(0, 200))
          .maybeSingle();
        if (workRow?.files) {
          body.priorFiles = workRow.files as Record<string, string>;
        }
      }
    } catch {
      // 메모리 fetch 실패 = 무시 (= 첫 호출 또는 = 비로그인 = priorFiles 없음으로 진행)
    }
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

  // ★ 작품 1개 = conversation 1개 = 옛 turn들 누적
  //   conversationMessages 박혀 있으면 = 옛 turn + 새 user msg
  //   없으면 = 첫 호출 = single user msg (= 옛 흐름)
  const apiMessages: ConversationMessage[] = [
    ...(body.conversationMessages ?? []),
    { role: "user", content: finalUserMessage },
  ];

  // ★ V2.14.7 — 모델 ID는 server-safe lib/storymaker/model-ids.ts에서 (persist·useState 의존 X).
  const { resolveModelId } = await import("@/lib/storymaker/model-ids");
  let model = resolveModelId(body.model, body.fast === true);

  // LOCAL: 사장님 Pro/Max 구독 사용
  // 우선순위 1) OAuth 직접 호출 (한글 100% — Windows claude.exe 인코딩 우회)
  // 우선순위 2) claude.exe CLI subprocess (Mac/Linux 또는 OAuth 만료 시 fallback)
  if (useClaudeCode) {
    const oauthToken = getClaudeOAuthToken();
    if (oauthToken) {
      return new Response(streamViaOAuth(getSystemPrompt(), apiMessages, model, oauthToken), {
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          "x-accel-buffering": "no",
        },
      });
    }
    // CLI fallback = single user msg만 지원 (claude.exe 한계). 옛 turn = system prompt 머리에 박는 식 = 다음 라운드.
    return new Response(streamViaClaudeCode(getSystemPrompt(), finalUserMessage, model), {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  }
}
