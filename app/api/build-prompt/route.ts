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
  mediumFields?: Record<string, string | string[] | number>;
  writerLearning?: WriterLearningEntry[];
  workId?: string;
  conversationMessages?: ConversationMessage[];
  writerProfile?: Record<string, unknown> | null;
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
    default:
      throw new Error(`Unknown mode: ${b.mode}`);
  }
}

function buildUserPrompt(b: RequestBody): string {
  const base = buildBasePrompt(b);
  const learning = formatWriterLearning(b.writerLearning);
  const memory = formatWorkMemoryFromFiles(b.priorFiles);
  const parts = [memory, learning, base].filter(Boolean);
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
    const model = body.fast
      ? "claude-haiku-4-5-20251001"
      : "claude-opus-4-7";

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
