#!/usr/bin/env tsx
/**
 * scripts/learn-skills.ts — 자동 학습 스킬 갱신 (V2.11.1, 2026-05-11)
 *
 * 사장님 명시 (옛): 일주일에 한 번 또는 두 번 = GitHub search → 작가 스킬 가져와서 추가.
 *
 * 사용법:
 *   npm run learn-skills
 *
 * 흐름:
 * 1. ~/.claude/.credentials.json OAuth 토큰 추출 (Pro 구독 = 비용 0)
 * 2. GitHub search API = 작법·시나리오 새 자료 검색 (인증 없이 = 60 req/hour 충분)
 * 3. Anthropic Messages API (OAuth) = 검색 결과 분석 + 한국 작법 노하우 추출
 * 4. lib/skills/learned.md 끝에 = 오늘 날짜 + 새 노하우 추가
 * 5. git add + commit + push (= Vercel 자동 빌드 트리거 = 작가 다음 사용 시 새 노하우)
 *
 * 비용: $0 (OAuth Pro 구독 사용. GitHub search = 무료).
 *
 * 옵션:
 *   --dry-run  = git push 없이 = learned.md 갱신만 (테스트용)
 *   --debug    = 검색 결과 + LLM prompt 출력
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-opus-4-1-20250805";
const GITHUB_SEARCH = "https://api.github.com/search/repositories";

const SEARCH_QUERIES = [
  "screenwriting prompts ai",
  "screenplay structure beat sheet",
  "drama writing template korean",
  "save the cat 15 beats",
  "character arc want need",
  "humanizer dialogue patterns",
  "korean kdrama writing",
  "story structure three act",
];

const DRY_RUN = process.argv.includes("--dry-run");
const DEBUG = process.argv.includes("--debug");

interface SearchResult {
  name: string;
  description: string;
  url: string;
  stars: number;
}

function getOAuthToken(): string {
  const credPath = path.join(os.homedir(), ".claude", ".credentials.json");
  if (!fs.existsSync(credPath)) {
    throw new Error(
      "~/.claude/.credentials.json 파일을 찾을 수 없습니다. `claude /login` 먼저 실행해주세요."
    );
  }
  const cred = JSON.parse(fs.readFileSync(credPath, "utf-8"));
  const oauth = cred.claudeAiOauth;
  if (!oauth?.accessToken) {
    throw new Error("OAuth accessToken을 찾을 수 없습니다. `claude /login`으로 재로그인해주세요.");
  }
  if (oauth.expiresAt && oauth.expiresAt < Date.now()) {
    throw new Error("OAuth 토큰이 만료되었습니다. `claude /login`으로 재로그인해주세요.");
  }
  return oauth.accessToken;
}

async function searchGitHub(query: string): Promise<SearchResult[]> {
  const url = `${GITHUB_SEARCH}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) {
      console.warn(`   ⚠️  GitHub "${query}" 검색 실패 (${res.status})`);
      return [];
    }
    const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
    return (data.items || []).map((item) => ({
      name: String(item.full_name || ""),
      description: String(item.description || ""),
      url: String(item.html_url || ""),
      stars: Number(item.stargazers_count || 0),
    }));
  } catch (e) {
    console.warn(`   ⚠️  "${query}" fetch 오류:`, e instanceof Error ? e.message : String(e));
    return [];
  }
}

async function callAnthropic(
  token: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "oauth-2025-04-20",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API 호출 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Anthropic 응답이 비어있습니다.");
  return text;
}

async function main(): Promise<void> {
  console.log("🎓 Story Maker — 자동 학습 스킬 갱신 시작");
  console.log(`   시각: ${new Date().toLocaleString("ko-KR")}`);
  console.log(`   모드: ${DRY_RUN ? "DRY-RUN (git push X)" : "PRODUCTION (git push 자동)"}\n`);

  // 1. OAuth 토큰
  const token = getOAuthToken();
  console.log("✅ Claude Pro/Max OAuth 토큰 확보 (= 추가 비용 0)\n");

  // 2. GitHub search
  console.log("🔍 GitHub search 시작...");
  const allResults: { query: string; results: SearchResult[] }[] = [];
  for (const query of SEARCH_QUERIES) {
    const results = await searchGitHub(query);
    allResults.push({ query, results });
    console.log(`   "${query}" → ${results.length}개`);
    await new Promise((r) => setTimeout(r, 1500)); // GitHub rate limit 대기
  }
  const totalResults = allResults.reduce((sum, r) => sum + r.results.length, 0);
  console.log(`\n   총 ${totalResults}개 repository 검색됨\n`);

  if (totalResults === 0) {
    console.error("❌ 검색 결과 0개. GitHub rate limit 또는 네트워크 문제.");
    process.exit(1);
  }

  // 3. Anthropic API = 결과 분석
  console.log("🤖 Claude Opus (OAuth) 호출 — 한국 작법 노하우 추출 중...\n");

  const searchSummary = allResults
    .map(({ query, results }) => {
      const top = results
        .slice(0, 3)
        .map((r) => `  - ${r.name} (★${r.stars}): ${r.description.slice(0, 200)}`)
        .join("\n");
      return `### "${query}"\n${top}`;
    })
    .join("\n\n");

  if (DEBUG) {
    console.log("=== DEBUG: GitHub 검색 결과 ===");
    console.log(searchSummary);
    console.log("=== END DEBUG ===\n");
  }

  const systemPrompt = `당신은 한국 시나리오·드라마·웹툰·웹소설 작가들을 위한 전문 작법 큐레이터입니다.
GitHub 검색 결과에서 한국 작가에게 실제로 도움 되는 작법 노하우만 추출해서 한국어 단답형 노트로 정리하세요.

원칙:
- 한국 시나리오·드라마·웹툰·웹소설·예능 등 한국 콘텐츠 산업 표준에 맞는 노하우만
- 영어 prompt template 그대로 X (= 한국어 작법으로 의역·재해석)
- 추상적 X = 구체적·실전적
- 5~10개 노트 = 각 1~2줄 = 짧고 정확
- 출처가 신뢰할 만한 것만 (★ 100+ stars 또는 명확한 작법 자료)
- 형식: "- [YYYY-MM-DD] {핵심 노하우} — {왜·언제 적용}"

출력 양식 예시:
- [2026-05-11] 캐릭터 도입 시 첫 등장은 행동으로 — 대사 X = "Show, don't tell" 한국식 = 첫인상 강력
- [2026-05-11] 3막 구조 한국식 = 기승전결 = '전(轉)'에서 예측 배반 = K-콘텐츠 차별점

규칙:
- 마크다운 헤더 X (## ### 사용 X)
- "- " 항목 패턴만 사용
- 추가 설명·인사·메타 멘트 X
- 응답 = 항목 리스트만 출력`;

  const today = new Date().toISOString().split("T")[0];
  const userMessage = `이번 주 (${today}) GitHub 검색 결과입니다.

${searchSummary}

위 결과에서 한국 작가에게 도움 되는 작법 노하우를 5~10개 추출해서 위 형식으로 출력하세요.`;

  if (DEBUG) {
    console.log("=== DEBUG: System prompt ===");
    console.log(systemPrompt);
    console.log("=== DEBUG: User message ===");
    console.log(userMessage);
    console.log("=== END DEBUG ===\n");
  }

  const anthropicResult = await callAnthropic(token, systemPrompt, userMessage);
  console.log("✅ 분석 완료\n");
  console.log("--- 추출된 노하우 ---");
  console.log(anthropicResult);
  console.log("--- END ---\n");

  // 4. learned.md 갱신
  const learnedPath = path.join(process.cwd(), "lib", "skills", "learned.md");
  if (!fs.existsSync(learnedPath)) {
    throw new Error(`${learnedPath} 파일이 없습니다.`);
  }

  const newSection = `\n\n## ${today} 자동 학습 (GitHub search + Anthropic OAuth)\n${anthropicResult.trim()}\n`;
  fs.appendFileSync(learnedPath, newSection, "utf-8");
  console.log(`✅ ${learnedPath} 갱신 완료\n`);

  // 5. git commit + push (DRY_RUN 아닌 경우)
  if (DRY_RUN) {
    console.log("ℹ️  DRY-RUN 모드 = git push 생략. 검토 후 수동 commit·push 부탁드립니다.\n");
    return;
  }

  console.log("📦 git commit + push 시작...");
  try {
    execSync("git add lib/skills/learned.md", { stdio: "inherit" });
    execSync(
      `git commit -m "feat: ${today} 자동 학습 갱신 (GitHub search + OAuth)"`,
      { stdio: "inherit" }
    );
    execSync("git push origin v2-wip", { stdio: "inherit" });
    console.log("\n✅ git push 완료. Vercel 자동 빌드 트리거됨.");
    console.log("   작가들 다음 사용 시 = 새 노하우 자동 적용.\n");
  } catch (e) {
    console.error(
      "\n❌ git push 실패. 수동으로 commit·push 부탁드립니다:",
      e instanceof Error ? e.message : String(e)
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ 학습 갱신 실패:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
