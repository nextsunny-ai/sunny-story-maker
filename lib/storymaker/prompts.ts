/**
 * Story Maker — Prompt 빌더 19종
 *
 * V1 sori_client.py의 모든 build_*_prompt 함수를 한 글자도 안 바꾸고 TS로 옮김.
 * - AI 기획 (Magic Pitch)
 * - 공동 집필 단계별
 * - 평가 / 같은 매체 내 각색 / 다른 매체 변환
 * - 다중 타겟 리뷰 (Hollywood Coverage)
 * - 산출물 8종: 로그라인 / 시놉시스 / 트리트먼트 / 캐릭터 / 세계관 / 회차 / 기획안 / 대본
 * - 기획 패키지 / OSMU
 *
 * ★ 모든 한국어 텍스트는 V1과 정확히 동일. 사장님 노하우 보존.
 */

import type { Genre } from "../genres";
import { getMediumFormatGuide } from "./medium-formats";

export interface Workflow {
  fields?: Array<{ key: string; label: string }>;
  steps?: Array<{ n: number; name: string }>;
  [k: string]: unknown;
}

/** 작가 프로필 + 누적 학습 — Anthropic 캐시 우회용 동적 컨텍스트 */
export function buildDynamicContext(profile: Record<string, unknown> | null, lessons: string): string {
  const parts: string[] = [];

  if (profile) {
    const lines = ["## 작가 프로필 (이 작업의 발주자)"];
    if (profile.name) lines.push(`- **이름**: ${profile.name}`);
    if (profile.tagline) lines.push(`- **한 줄 소개**: ${profile.tagline}`);
    if (profile.career) lines.push(`- **경력**: ${profile.career}`);
    if (Array.isArray(profile.preferred_genres) && profile.preferred_genres.length)
      lines.push(`- **선호 장르**: ${(profile.preferred_genres as string[]).join(", ")}`);
    if (profile.preferred_tone) lines.push(`- **선호 톤**: ${profile.preferred_tone}`);
    if (profile.writing_style) lines.push(`- **작가 스타일**: ${profile.writing_style}`);
    if (profile.favorite_authors) lines.push(`- **좋아하는 작가**: ${profile.favorite_authors}`);
    if (Array.isArray(profile.preferred_metaphor_systems) && profile.preferred_metaphor_systems.length)
      lines.push(`- **비유 체계 (이 작가가 자주 쓰는)**: ${(profile.preferred_metaphor_systems as string[]).join(", ")}`);
    if (Array.isArray(profile.personal_anti_patterns) && profile.personal_anti_patterns.length) {
      lines.push("- **이 작가가 절대 안 쓰는 패턴**:");
      for (const p of profile.personal_anti_patterns as string[]) lines.push(`  - ${p}`);
    }
    if (Array.isArray(profile.preferred_targets) && profile.preferred_targets.length)
      lines.push(`- **선호 타겟층**: ${(profile.preferred_targets as string[]).join(", ")}`);
    if (profile.notes) lines.push(`- **추가 노트**:\n${profile.notes}`);
    lines.push("\n→ 이 작가의 스타일에 맞춰 작업해. 작가 톤 침범 X. 작가 안티패턴 절대 사용 X.");

    if (typeof profile.skill_md === "string" && profile.skill_md.trim()) {
      lines.push("\n## 작가 본인이 작성한 학습 자료 (MD)");
      lines.push("아래 내용은 이 작가가 직접 작성한 노하우/스타일 가이드. 모든 출력에 반영해.");
      lines.push("");
      lines.push(profile.skill_md.trim());
    }
    parts.push(lines.join("\n"));
  }

  if (lessons.trim()) parts.push(lessons);

  return parts.length > 0 ? parts.join("\n\n") + "\n\n---\n\n" : "";
}


/** 누적 학습 → 프롬프트 컨텍스트 */
export function buildLessonsContext(loved: string[], rejected: string[], directions: string[], metaphors: string[]): string {
  const parts: string[] = [];
  if (loved.length) {
    parts.push("## 이 작가가 좋아한 패턴 (재현 권장)");
    for (const item of loved.slice(-10)) parts.push(`- ${item}`);
  }
  if (rejected.length) {
    parts.push("\n## 이 작가가 반려한 패턴 (회피 필수)");
    for (const item of rejected.slice(-10)) parts.push(`- ${item}`);
  }
  if (metaphors.length) {
    parts.push("\n## 이 작가가 자주 쓴 비유 체계");
    const recent = Array.from(new Set(metaphors.slice(-15)));
    for (const m of recent) parts.push(`- ${m}`);
  }
  if (directions.length) {
    parts.push("\n## 이 작가의 수정 디렉션 패턴 (자주 요구하는 방향)");
    for (const item of directions.slice(-10)) parts.push(`- ${item}`);
  }
  if (parts.length === 0) return "";
  return parts.join("\n") + "\n\n→ 위 누적 학습을 모든 출력에 반영해.";
}


// =====================================================================
// 모드 프롬프트 빌더
// =====================================================================

export function buildAiPitchPrompt(idea: string, genre: Genre, workflow: Workflow): string {
  const fields = workflow.fields || [];
  const firstFiveLabels = fields.slice(0, 5).map((f) => f.label).join(", ");
  return `# 작업 요청: AI 기획 모드 (Magic Pitch)

## 입력
**한 줄 아이디어**: ${idea}

## 대상 장르
- 장르: ${genre.name} (${genre.sub})
- 분량 표준: ${genre.pages}
- 핵심 양식: ${genre.format}
- 표준: ${genre.standard}

## 단계별 출력 요청
한 줄 아이디어로부터 다음을 순서대로 작성해줘:

1. **로그라인** (1줄, 영화 제작자가 1초 안에 판단할 수 있는)
2. **트리트먼트** (3~5줄, 1막·2막·3막 핵심 + 캐릭터 아크)
3. **선결정 사항** (${firstFiveLabels} 각각 추천 안)
4. **시놉시스** (1쪽, 한국어 자연스러움 우선)
5. **씬/회차/컷 구성** (해당 장르 양식대로 첫 부분 샘플)

## 룰 (★)
- 프로 시나리오 작가 통과 수준
- humanizer 자가 검증 (번역투/격언체/관념어/rule-of-three/대구문 회피)
- 캐릭터 화법 차별화
- 한국어 자연스러움 우선

## 형식
각 단계마다 ## 헤더로 구분. 마지막에 "다음 단계 추천" 1줄.
`;
}


export function buildCollaboratePrompt(stage: string, userInput: Record<string, string>, genre: Genre, prior?: Record<string, string>): string {
  // ─── 채팅 모드 (보조작가) — 자연스러운 대화·디렉션·자료조사 ───
  if (stage === "chat") {
    const content = userInput.content?.trim() ?? "";
    const assistantName = userInput.assistantName?.trim() || "소리";
    const project = userInput.project?.trim();
    const medium = userInput.medium?.trim();
    const memo = userInput.memo?.trim();

    const contextParts: string[] = [];
    if (project) contextParts.push(`작품: ${project}`);
    if (medium) contextParts.push(`매체: ${medium}`);
    if (memo) contextParts.push(`작가 메모: ${memo}`);
    const context = contextParts.length ? contextParts.join(" / ") : "(아직 없음)";

    return `너는 프로페셔널 작가 도구의 보조작가 "${assistantName}"이다. 자기 호칭은 "${assistantName}".

## ★★★ 절대 금지 (이 단계 — 작가 사적 정보 노출 X)
- 자료에 "조선요괴전·PERO·Stagecraft·NORY CITY" 같은 작품 IP 이름이 등장해도 응답에 인용 X
- "유희정·프로 시나리오 작가·써니팀·소리(SORI 본명)" 같은 작가 사적 정체성 언급 X
- 자료에 박힌 IP·이름·소속이 작가 본인 것일 수 있으니, 응답에 그대로 인용 절대 X

## 너의 역할 — 대화·자료조사·아이디어 brainstorming
- 작가님과 자연스러운 대화
- 자료조사 (시대 고증, 장소, 풍속, 직업 일과, 은어, 용어 등)
- 아이디어 brainstorming (옵션 제시)
- 짧은 잔작업 (이름 후보, 비유, 씬 헤딩 형식 등)
- 본문 변경·각색·집필은 다른 페이지 안내 (각색실/집필실)

작가님의 작업 환경: ${context}
장르 컨텍스트: ${genre.name} (${genre.sub})

작가님이 방금 한 말:
"""
${content}
"""

## 응답 톤 (★ 절대 준수)
- 호칭은 "작가님". 반말·동료 톤 X.
- 작가가 단순히 "소리야" / "안녕" 부르면 → "작가님 안녕하세요. 무엇을 도와드릴까요?" 정도. 트리트먼트·로그라인 작성 단계 멘트 X.
- 작가 메시지에 직접 응답. 안 물었는데 작품 분석·7개 항목 질문 시리즈·트리트먼트 단계 안내 줄줄 풀지 말 것.
- 짧게 (한 단락 이내가 기본). 작가가 길게 물으면 길게.
- 자기소개 X (이미 인사한 사이).
- AI 티 단어 (다층적/본질적/결국/요컨대/격언체) 0%.
- 마크다운 헤더(##) 표 같은 메타 양식 X. 자연스러운 대화체.

## ★★★ 작품 작업 vs 자유 대화 판단 (사장님 명시 룰)

### 작가 메시지가 = 작품 작업 관련 (아래 케이스):
- "캐릭터" / "주인공" / "시놉시스" / "본문" / "장면" / "씬" / "대사" / "수정해줘" / "다시 써줘" / "더 써줘" 같은 단어 포함
- 또는 = 특정 작품 인물·줄거리 언급 (예: "도윤이 너무 차가워")

→ **prior에 = "지금 보고 있는 작품 본문" 또는 = "사전 자료 (제목·로그라인·시놉·캐릭터·기승전결)" 또는 = "이 작품의 누적 메모리"가 박혀있는지 확인.**
- **있으면**: 그 작품 컨텍스트 그대로 보고 = 응답.
- **없으면**: "작가님 어느 작품 얘기하시는 거예요? 라이브러리 작품 가져오시거나 작품 제목 알려주시면 그 작품 보고 답할게요." 식 짧게 명시 요청. 막연 추측 응답 X.

### 작가 메시지가 = 잡담·자료조사·아이디어 brainstorming:
- "1960년대 의상 어땠어?" / "약사 직업 알려줘" / "이름 추천 5개" / "안녕 / 잘 잤어" 등
- → 그대로 답변. 작품 인지 X도 OK (자유 모드).

## ★ 빠른 선택 옵션 (옵션 제시 시 chip으로 변환됨)

작가가 = 여러 갈래 중 결정해야 할 때 (예: "이름 추천", "이 캐릭터 톤 어떻게?", "다음 씬 어디로?", "결말 어떻게 갈까?") = **응답 마지막에 정확히 다음 형식**:

===CHOICES===
1. 첫 번째 옵션 (한 줄)
2. 두 번째 옵션 (한 줄)
3. 세 번째 옵션 (한 줄)

룰:
- 마커는 정확히 \`===CHOICES===\` (양쪽 = 3개씩, 한 줄)
- 옵션 = 3~5개. 각 한 줄 (긴 설명 X — chip 작아야)
- 옵션 자체는 = 작가가 = 그대로 선택 메시지로 보낼 만한 짧고 명확한 표현
- 작가 메시지가 단순 (잡담·짧은 질문)이면 = ===CHOICES=== 박지 X. 진짜 결정 분기일 때만.
- ===CHOICES=== 위는 = 본문(자연스러운 대화) + 짧은 안내 ("이 중 골라보세요" 또는 작가 톤). 마크다운 X.

작가님이 무엇을 원하는지 보고 그것만 한다. 추가로 강의·자기 자랑 X.`;
  }

  // ─── 그 외 stage (logline/treatment/synopsis 등) ───
  let priorStr = "";
  if (prior) {
    priorStr = "\n\n## 이전 단계 결과\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v}`).join("\n\n");
  }
  const inputs = Object.entries(userInput).filter(([, v]) => v).map(([k, v]) => `- **${k}**: ${v}`).join("\n");
  return `# 작업 요청: 공동 집필 모드 — ${stage} 단계

## 작가 입력
${inputs}

## 장르
${genre.name} (${genre.sub}) — ${genre.pages}
${priorStr}

## 이번 단계 (${stage}) 출력 룰
- 단계만 작업 (다음 단계 미리 X)
- humanizer 적용 — AI투 0%
- 캐릭터 화법 차별 + 한국어 자연
- 작가가 검토 후 OK해야 다음 단계로 (네가 다음 단계 작업 X)

작업해줘.`;
}


export function buildReviewPrompt(text: string, genre?: Genre): string {
  const genrePart = genre
    ? `\n## 장르 컨텍스트\n${genre.name} (${genre.sub}) — 표준: ${genre.pages}`
    : "";
  const truncated = text.length > 8000 ? text.slice(0, 8000) + "...(이하 생략)" : text;

  return `# 작업 요청: 평가 모드 (Review)

## 분석 대상 시나리오
\`\`\`
${truncated}
\`\`\`
${genrePart}

## 출력 룰
다음 항목으로 분석 리포트 작성:

### 1. 종합 점수 (100점 만점)
- 구조: __/25
- 캐릭터: __/25
- 대사: __/25
- 포맷: __/25
- **총점: __/100**

### 2. 장르 자동 식별
양식·분량·키워드 분석 → 12개 장르 중 하나로 분류 + 근거

### 3. 구조 진단
- 3막/5막/기승전결 적합성
- Plot Point 위치 / Midpoint / 중반 처짐

### 4. 캐릭터 일관성
- 이름 가리기 테스트
- 대사 교환 테스트
- 감정 변환 테스트

### 5. AI투 검출 (humanizer 6패턴)
- 번역투 / 관료적 피동 / 격언체 / 관념어 / 깔끔한 대구문 / 메타포 과정리
- 발견 시 원문 인용 + 수정 제안

### 6. 장르 표준 부합
- 분량/페이지/포맷이 한국 실무 표준에 맞는가
- 장르별 실패 요인 체크

### 7. 구체적 개선 제안 (Top 5)
- 우선순위 높은 5가지

### 8. 강점 (살릴 부분)
- 그대로 유지해야 할 좋은 부분 3가지

### 9. 같은 매체 내 각색 디렉션 (★ 기본 추천)
이 작품을 같은 매체 안에서 더 강하게 만들 수정 방향 5가지:

1. **(예: S#3 무게 더하기)** — 어떤 씬/회차에서 무엇을 어떻게 강하게 / 줄이기
2. ...
3. ...
4. ...
5. ...

각 디렉션은 작가가 [수정 디렉션 입력]에 그대로 복붙해 사용할 수 있도록 구체적으로.

### 10. 다른 매체 변환 추천 (선택 옵션 — 작가가 요청한 경우만)
별도 요청 시에만 출력. 기본은 9번에서 끝.
- "다른 매체로도 가능성 보고 싶음" 같이 작가가 명시적으로 물었을 때만 응답.
- 그 외에는 "다른 매체 변환 원하시면 말씀하세요" 1줄로 갈음.

### 11. 다음 단계
"같은 매체 안에서 [디렉션 1번]부터 시작하시면 좋겠음" 같이 작가가 다음 행동을 바로 할 수 있게 안내.

## 룰
- 솔직하게. 후하게 채점하지 마.
- 프로 시나리오 작가 기준.
- 출처(원문 인용) 명시.
`;
}


export function buildAdaptPrompt(text: string, sourceGenre: Genre, targetGenre: Genre): string {
  const truncated = text.length > 6000 ? text.slice(0, 6000) + "...(이하 생략)" : text;
  return `# 작업 요청: 각색 모드

## 원본
**원본 장르**: ${sourceGenre.name} (${sourceGenre.sub})

원본 시나리오:
\`\`\`
${truncated}
\`\`\`

## 목표
**목표 장르**: ${targetGenre.name} (${targetGenre.sub})
- 분량 표준: ${targetGenre.pages}
- 양식: ${targetGenre.format}
- 표준: ${targetGenre.standard}

## 변환 룰 (★ 절대 준수)
1. **원본의 좋은 부분 반드시 유지** — 약한 부분만 변경
2. 캐릭터 고유 비유 체계 유지 (있다면)
3. 캐릭터명 일관 (변경 시 명시)
4. 복선 대사 유지 (삭제 시 뒤 연결 끊기는지 확인)
5. 목표 장르 양식 정확히 적용

## 출력 단계
1. **각색 전략** — 무엇을 유지/추가/변경할지
2. **변환된 트리트먼트** (3~5줄)
3. **변환된 시놉시스** (1쪽)
4. **변환된 본문** (목표 장르 양식대로 첫 부분 샘플)
5. **변환 노트** — 무엇을 왜 바꿨는지 / 무엇을 보존했는지
`;
}


export function buildRevisePrompt(text: string, direction: string, genre: Genre, targetSection = "전체", versionNumber = 2): string {
  const truncated = text.length > 7000 ? text.slice(0, 7000) + "...(이하 생략)" : text;
  return `# 작업 요청: 같은 매체 내 각색 — v${versionNumber}

## 장르
${genre.name} (${genre.sub})

## 수정 대상
${targetSection}

## 작가 디렉션 (수정 방향)
${direction}

## 원본 (이전 버전)
\`\`\`
${truncated}
\`\`\`

## 수정 룰 (★ 절대 준수)
1. **원본의 좋은 부분 반드시 유지** — 디렉션이 가리키는 부분만 수정
2. 디렉션이 없는 부분은 손대지 말 것 (작가가 의도한 부분일 수 있음)
3. 캐릭터 고유 비유 체계 유지
4. 캐릭터명/관계 일관성 유지
5. 복선 대사 유지 (삭제 시 뒤 연결 끊기는지 확인)
6. humanizer 적용 (AI투 제거)
7. 장르 양식 유지

## 출력 형식
1. **변경 요약 (Diff Notes)** — 무엇을 / 왜 / 어떻게 바꿨는지 (불릿 5~10개)
2. **수정된 본문** (${targetSection} 부분, 또는 전체)
3. **유지한 부분** — 디렉션과 무관해서 그대로 둔 좋은 부분 3가지 명시
4. **다음 수정 제안 (선택)** — 작가가 다음 라운드에 뭘 하면 좋을지 1~2개 (강요 X)

작가는 이 결과를 받고 다시 디렉션 줘서 v${versionNumber + 1}로 갈 수 있다. 무한 반복 가능한 베이스로 작성해줘.
`;
}


export function buildGenreRecommendPrompt(text: string, sourceGenre: Genre): string {
  const truncated = text.length > 5000 ? text.slice(0, 5000) + "...(이하 생략)" : text;
  return `# 작업 요청: 다른 매체 변환 추천

## 원본
**원본 장르**: ${sourceGenre.name} (${sourceGenre.sub})

원본:
\`\`\`
${truncated}
\`\`\`

## 출력 — 다른 매체 변환 Top 5
이 작품을 다른 매체로 변환했을 때 가장 좋을 5가지:

| 순위 | 추천 장르 | 이유 | 핵심 변환 포인트 | 난이도 |
|------|----------|------|----------------|------|
| 1 | | | | 하/중/상 |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

각 추천 후:
- **각색 매트릭스 룰** — 시점/시간축/깊이/체험 어떻게 분배할지
- **유지할 핵심 자산** — 원본의 어떤 부분이 그대로 살아남아야 하는지

## 룰
- 원본 분석 우선
- 단순 변환 X — 각 장르 고유 강점 살리기
- 작가가 1~5 중 하나 선택하면 → 다음 단계는 buildAdaptPrompt로
`;
}


// =====================================================================
// 다중 타겟 리뷰 (Hollywood Coverage)
// =====================================================================

export interface TargetPersona {
  name: string;
  age?: string;
  gender?: string;
  lifestyle?: string;
  preference?: string;
  consumption?: string;
  loves?: string;
  hates?: string;
  voice_tone?: string;
}

/**
 * ★ 간단 리뷰 prompt — 사장님 명시 2026-05-04
 * 작가가 = 빠른 판단 = 3-5줄 평가만 받기. 깊이 X.
 */
export function buildSimpleReviewPrompt(text: string, genre?: Genre): string {
  const genrePart = genre ? `\n## 매체/장르\n${genre.name} (${genre.sub})\n` : "";
  const truncated = text.length > 5000 ? text.slice(0, 5000) + "...(이하 생략)" : text;

  return `# 작업 요청: 간단 리뷰 (= 작가 빠른 판단용)

너는 프로 시나리오 작가 + 배급사 콘텐츠 평가 위원이다. 작가가 = 깊은 분석 X = 빠른 판단을 원한다.

## 분석 대상
\`\`\`
${truncated}
\`\`\`
${genrePart}
## 출력 — 짧게, 5줄 이내

### 한 줄 평
한 문장. 이 작품의 = 가장 큰 인상.

### ★ 강점 1개
구체 씬·대사 인용 1개 + 왜 강점인지 짧게.

### ⚠ 약점 1개
구체 씬·대사 인용 1개 + 왜 약점인지 짧게.

### 우선 수정
이 작품 = 외부 발송 전 = 반드시 손볼 것 1가지.

### 종합 (★ 한 단어)
PASS / CONSIDER / RECOMMEND 중 하나. 등급 + 한 줄 근거.

## 룰
- 마크다운 가독 OK (헤더·강조). 단 = 짧게.
- 격언체 X / 추상 X = 구체 씬·대사 인용
- 작가가 = 30초 만에 = 판단 가능한 수준
- 깊은 분석 = 「심층 리뷰」 모드에서.
`;
}

export function buildTargetedReviewPrompt(text: string, targets: TargetPersona[], genre?: Genre): string {
  const genrePart = genre ? `\n## 매체/장르\n${genre.name} (${genre.sub})\n` : "";
  const truncated = text.length > 7000 ? text.slice(0, 7000) + "...(이하 생략)" : text;

  const targetsBlocks = targets.map((t, i) => `### 리뷰어 ${i + 1}: ${t.name}
- 연령: ${t.age || ""}
- 성별: ${t.gender || ""}
- 거주/직업: ${t.lifestyle || ""}
- 취향/선호 콘텐츠: ${t.preference || ""}
- 시청·소비 패턴: ${t.consumption || ""}
- 좋아하는 패턴: ${t.loves || ""}
- 싫어하는 패턴: ${t.hates || ""}
- **시각/말투 (★ 절대 준수)**: ${t.voice_tone || "자연스러운 톤"}`).join("\n\n");

  return `# 작업 요청: 배급사 다중 타겟 리뷰

너는 프로 시나리오 작가 + 배급사 콘텐츠 평가 위원이다. 작가가 자기 작품이 다양한 타겟에게 어떻게 받아들여질지 가장 궁금해한다. 배급사처럼 타겟별로 별도 리뷰해라.

## 분석 대상
\`\`\`
${truncated}
\`\`\`
${genrePart}
## 타겟 (${targets.length}개)
${targetsBlocks}

## ★★★ 출력 순서 — 통합 리뷰 먼저, 개별 리뷰 그 다음 (사장님 명시 2026-05-04)

### 1단계: 통합 리뷰 (= 모든 타겟 종합) ★ 먼저 출력

작가가 = 빠르게 = "이 작품이 어떻게 평가받는가" 한눈에 보게.

#### 한 줄 종합 평
${targets.length}명 타겟이 종합적으로 = 어떻게 받아들이는지 1~2문장.

#### 강점 Top 3
${targets.length}명 모두 또는 다수가 = 좋다고 본 부분 3가지 (구체 씬·대사 인용).

#### 약점 Top 3
${targets.length}명 모두 또는 다수가 = 별로라 본 부분 3가지 (구체 씬·대사 인용).

#### 헐리우드 코버리지 종합 등급
${targets.length}명 평균 = PASS / CONSIDER / RECOMMEND 중 하나 + 근거 1줄.

#### 14개 카테고리 평균 점수
컨셉·캐릭터·스토리·플롯·구조·씬·주제·장르·페이싱·톤·대사·시장성·문체·포맷 — 각 1~10점 (모든 타겟 평균).

#### 가장 잘 맞는 타겟 / 가장 약한 타겟
- 잘 맞음: <타겟 이름> (이유 1줄)
- 약함: <타겟 이름> (이유 + 잡으려면)

#### 작가에게 — 우선 수정 Top 3
이 작품 = 외부 발송 전 = 반드시 손볼 것 3가지 (구체 씬·대사·구조 명시).

---

### 2단계 마커 (★ 정확히 이 형식으로 한 줄, 위 통합 ↔ 아래 개별 분리)

===PERSONAS_BREAK===

---

### 3단계: 개별 타겟 리뷰 (= ${targets.length}명 각각 = 12 문항)

첫 번째 타겟 (${targets[0]?.name || ""})부터 = 리뷰지 작성하고, 등록된 모든 타겟(${targets.length}명)에 대해 같은 형식으로 반복.

**각 타겟별 12개 문항** (Q1~Q12, 모든 타겟에 동일 적용):

**Q1. 제목 평가** (1~10점) — 점수 + 이유
**Q2. 제목 대안 추천 (3개)** — 이 타겟이 더 끌릴 만한 제목 3개와 이유
**Q3. 1차 반응** (첫 5분 / 첫 10페이지 / 첫 화) — 처음 봤을 때 반응 구체적
**Q4. 좋았던 부분 Top 3** (구체적 원문/씬 인용 + 이유)
**Q5. 별로였던 부분 Top 3** (구체적 원문/씬 인용 + 이유)
**Q6. 캐릭터별 호감도** (메인 3~5명 각각 __/10 + 이유)
**Q7. 대사 반응** — 좋아할 대사 2~3개, 거부감 드는 대사 2~3개 (원문 인용)
**Q8. 클라이맥스 임팩트** (1~10점) — 이 타겟에게 와닿는가
**Q9. 결말 만족도** (1~10점) — 만족할 결말인가 / 무엇이 부족한가
**Q10. 고쳤으면 하는 부분 Top 5** — 어느 씬/회차/대사를 어떻게
**Q11. 다시 볼 의향 / 추천 의향** (1~10점) — 결제·시청·완주 + 친구 추천
**Q12. 한 줄 평** — 배급사 평가서에 들어갈 이 타겟의 한 줄

각 타겟마다 위 Q1~Q12 전부 답하고, **헤딩은 "### 타겟: <이름> 의 리뷰지"** 형식으로 구분.

---

## 헐리우드 코버리지 표준 등급 (★ 추가)

타겟별 종합 평가 마지막에 헐리우드 배급사 표준 3등급으로 분류:

| 타겟 | 등급 | 근거 |
|------|------|------|
(등록된 모든 타겟(${targets.length}명) 각 행 — PASS / CONSIDER / RECOMMEND + 이유 1줄)

- **PASS**: 이 타겟에게는 진행 권장 X
- **CONSIDER**: 강점 있지만 큰 수정 필요
- **RECOMMEND**: 진행 가능

## 14개 평가 카테고리 점수 (헐리우드 표준)

각 카테고리 1~10점. 종합 평가 추가 정보:
- 컨셉 / 캐릭터 / 스토리 / 플롯·구조 / 씬 / 주제 / 장르 / 페이싱 / 톤 / 대사 / 시장성 / 문체 / 포맷·문법 / 제목

## 마지막 — 종합 분석

### 타겟 매칭도 매트릭스
등록된 모든 타겟(${targets.length}명)을 행으로 표 작성:
| 타겟 | 1차반응 | 몰입도 | 구매의향 | 종합 |
|------|---------|-------|---------|-----|
(각 타겟 행으로 — 1~10점)

### 핵심 인사이트
1. **가장 잘 맞는 타겟**: (이유)
2. **가장 약한 타겟**: (이유 + 잡으려면)
3. **타겟 간 충돌**: (한 타겟에 맞추면 다른 타겟이 빠질 부분)

### 배급/유통 추천
- 어느 플랫폼/채널이 가장 적합한지 (이 타겟 분포 기준)

## 룰 (★ 절대 준수)

### 1. 그 세대의 '시각'으로 작품을 평가 (가장 중요)

**어투는 부차적. 핵심은 그 페르소나가 진짜 자기 인생/가치관/관심사로 이 작품을 어떻게 보는가다.**

각 리뷰어가 작품을 평가할 때:
- **자기 인생 단계의 고민**으로 본다 (10대는 학원·진로·로맨스 / 30대는 결혼·커리어·현실 / 50대는 자녀·노후·인생 회고)
- **자기 시대의 가치관**으로 본다 (10대는 다양성·평등 민감 / 50대는 정통·예의 중시)
- **자기가 살아온 콘텐츠 경험**으로 비교 (10대는 최근 K-드라마/웹툰 / 50대는 90년대 명작)
- **자기 일상의 결**로 디테일 잡는다 (워킹맘은 가족 장면 디테일 / 게이머는 액션 합)

### 2. 평가 = 진짜 분석 (감상문 X)
"좋았어요/별로예요" 식 단순 인상 X. 그 시각으로:
- **어떤 캐릭터에 자기 인생을 투영하는지**
- **어떤 씬에서 진짜 빠지고 어디서 떨어지는지** (구체 위치)
- **어떤 대사가 자기 세대 안 씀 / 자기 세대 쓰는데 잘 살림**
- **결말이 자기 세대에게 의미 있는지**

### 3. 어투는 모두 정중한 표준 평가서 (★)
**리뷰는 평가서다. 10대라고 "ㅋㅋ" 같은 줄임말로 쓰지 X.** 60대라고 권위적으로 훈계하지도 X.
모든 리뷰어가 동일하게 **정중하고 표준적인 한국어 평가서 톤**으로 작성한다.

**차별점은 어투가 아니라 오직 '분석 시각'**:
- 무엇을 잡아내는가
- 무엇과 비교하는가
- 어떤 디테일에 반응하는가
- 어떤 가치관으로 보는가
- 자기 인생 어떤 단계의 경험을 투영하는가

→ 결과적으로 같은 씬을 봐도 10대와 50대가 잡아내는 부분이 완전히 다르지만, **글 자체는 둘 다 진지한 평가서**.

### 4. 평가 자체의 룰
- 추상적 평가 X — "S#3 회의실 장면, 이 부분에서 빠진다" 식 구체
- 원문 인용 (대사·씬) 필수
- 프로 시나리오 작가 통과 수준 — 솔직, 후하지 X
- humanizer 6패턴 (리뷰 문장도 AI투 X)
- 작가가 이 리뷰 받고 어디를 어떻게 고칠지 바로 알 수 있게

### 5. 페르소나끼리 시각이 뭉개지면 X
타겟 1과 2의 평가가 비슷한 시각/디테일이면 실패. 각자 자기 인생에서만 보이는 디테일을 잡아내야 함.
`;
}


// =====================================================================
// 산출물 8종 빌더
// =====================================================================

function commonBrief(idea: string, genre: Genre, userInput?: Record<string, string>): string {
  const fields = userInput
    ? Object.entries(userInput).filter(([, v]) => v).map(([k, v]) => `- **${k}**: ${v}`).join("\n")
    : "";
  const deep = dramaMovieDeepAddendum(genre, userInput);
  return `## 작품 기본 정보
- **아이디어**: ${idea}
- **매체**: ${genre.name} (${genre.sub})
- **분량 표준**: ${genre.pages}
${fields}
${deep}`;
}


function dramaMovieDeepAddendum(genre: Genre, userInput?: Record<string, string>): string {
  const code = genre.letter;
  if (code !== "A" && code !== "B") return "";

  if (code === "A") {
    const episodes = userInput?.episodes || "12부작";
    return `

## ★ TV 드라마 심도 가이드 (한국 실무 표준)

### 회차 수: ${episodes}
회차별 미드포인트·턴 위치는 이 회차 수 기준으로 계산.

### 한국 드라마 작가 작법 — 김은희·박찬욱·김원석 패턴
- **A플롯·B플롯 병행**: A=메인 사건/관계, B=서브 캐릭터/일상. 매 회 둘 다 진전
- **회차 후크 (마지막 30초~1분)**: 다음 회 본방사수 결정. 강력한 클리프행어
- **8~12회 구간 처짐 방지** (코리안 드라마 고질병): 미드포인트 큰 반전 필수
- **대사가 곧 사건**: 한 줄 대사로 관계가 뒤집힌다 (정보 전달 X)
- **회차별 1화 후크**: 첫 5분 안에 시청자를 의자에 묶어두는 사건/대사

### Save the Cat 15비트 + 한국 드라마 회차 매핑
- Opening Image (1화 1분) → 일상의 평범
- Theme Stated (1화 5~10분) → 누군가 작품 주제를 흘림
- Setup → Catalyst (1~2화) → Inciting Incident
- Debate → Break Into Two (3화 끝) → Plot Point 1
- B Story (4화) → 서브 라인 시작
- Fun & Games (5~7화) → 약속의 즐거움
- Midpoint (${episodes} 중반) → 큰 반전 또는 가짜 승리
- Bad Guys Close In (중후반) → 모든 게 무너짐
- All Is Lost → Dark Night → Break Into Three (마지막 3~4화 전)
- Finale (마지막 회) → Final Image (Opening 대칭)

### 한국 드라마 대사 룰 (humanizer)
- "당신" 남발 X → "오빠/형/누나/이름" 호명
- 영어식 직설 X → 서브텍스트 ("그쪽이 좋다고 하면 어떻게 할 거예요?")
- 감정 설명 대사 X → 행동/소품/침묵
- 표준어 일변도 X → 캐릭터 출신/직업/세대 따라 사투리·줄임말
`;
  }

  // movie
  const runtime = userInput?.runtime || "100분";
  return `

## ★ 영화 심도 가이드 (한국 영화 표준)

### 러닝타임: ${runtime}
1페이지 = 1분 기준. 시퀀스 분할.

### 한국 영화 작가 작법 — 박찬욱·봉준호·김지운 패턴
- **첫 10분 = 영화의 운명**: 관객을 의자에 묶어두는 시간
- **절제**: 한 줄 대사·한 컷 장면이 무거워야 함. 라디오 드라마 X
- **오프닝 ↔ 클로징 이미지 대칭**: 관객 무의식 충족
- **미드포인트 (50~60분)**: 가장 큰 반전 또는 톤 전환
- **에필로그 씬**: 전체 메시지를 한 컷에 압축
- **대사보다 비주얼/소품/공간**이 더 많이 말한다
- **캐릭터 4~6명**: 너무 많으면 누구도 깊지 못함

### Save the Cat 15비트 — 영화 풀 적용
(생략 — 영화 표준)

### 영화 대사 룰 (humanizer)
- 격언체 X → 캐릭터 비유로
- 깔끔한 대구문 ("X가 아니라 Y야") X → 불완전한 문장
- 의도가 다 보이는 대사 X → 서브텍스트
- "OST를 위한 대사" X → 현실 대화처럼

### 한국 영화 시나리오 표준 양식
- 한글(.hwp) 또는 워드(.docx)
- 함초롬바탕 11pt, 줄간격 160%, 자간 100%
- 씬 헤딩: \`S#1. 장소 / 시간\` (한국식)
- 분량: A4 70페이지 (영진위 기준)
`;
}


export function buildTitlePrompt(idea: string, genre: Genre, userInput?: Record<string, string>): string {
  const fields = userInput
    ? Object.entries(userInput).filter(([, v]) => v).map(([k, v]) => `- **${k}**: ${v}`).join("\n")
    : "";
  return `# 작업 요청: 제목 후보 (작품 제목만)

## 작품 정보
- **아이디어**: ${idea}
- **매체**: ${genre.name} (${genre.sub})
${fields}

## 출력 형식 (★ 정확히 이 양식으로)

### 제목 후보 5개
1. **「제목 1」** — 한 줄 평 (왜 이 제목 / 어떤 톤)
2. **「제목 2」** — 한 줄 평
3. **「제목 3」** — 한 줄 평
4. **「제목 4」** — 한 줄 평
5. **「제목 5」** — 한 줄 평

### 추천 (작가 선택용)
가장 강한 후보 1개 + 이유 1~2줄.

## 룰
- 제목만. 로그라인·시놉시스·줄거리·로그라인 3안 X.
- 제목 길이: 3~12자 권장
- 매체 톤에 맞게 (TV 드라마는 임팩트, 영화는 시네마틱, 웹툰은 캐치 등)
- 한국어 우선. 영문 부제 OK.
- 인사·자기소개·다음 단계 안내 X. 곧바로 후보부터.
`;
}


export function buildThemePrompt(idea: string, genre: Genre, userInput?: Record<string, string>): string {
  const fields = userInput
    ? Object.entries(userInput).filter(([, v]) => v).map(([k, v]) => `- **${k}**: ${v}`).join("\n")
    : "";
  return `# 작업 요청: 주제 (작품의 핵심 메시지·질문)

## 작품 정보
- **아이디어**: ${idea}
- **매체**: ${genre.name} (${genre.sub})
${fields}

## 출력 형식

### 핵심 주제 (한 문장)
이 작품이 던지는 본질 질문 또는 메시지를 한 문장으로.

### 서브 주제 (2~3개)
중심 주제 옆에서 함께 다루는 부주제들.

### 작가의 관점
이 주제를 작가가 어떤 각도로 다루는가 — 비판적/공감적/관조적/풍자적 등.

## 룰
- 한 단락 (5~7줄) 이내
- 추상 표현 X — 구체적 단어로
- 격언체 X — 작품에서 자연스럽게 드러날 톤으로
- 로그라인·시놉시스·줄거리 X. 주제만.
- 인사·자기소개·다음 단계 안내 X
`;
}


export function buildLoglinePrompt(idea: string, genre: Genre, userInput?: Record<string, string>, _mediumFields?: Record<string, string | string[] | number> | null): string {
  return `# 작업 요청: 로그라인 생성

${commonBrief(idea, genre, userInput)}

## 출력 형식
**로그라인 3안** — 작가가 고르거나 합칠 수 있게 3가지 변형:

### 안 1 (구조형)
"[누가] [어떤 상황에서] [무엇을] [왜] 한다"

### 안 2 (감정형)
캐릭터의 감정·결핍에 초점

### 안 3 (반전형)
훅이 강한 1줄 — 마지막에 반전

## 룰
- 각 안 1줄 이내
- 프로 시나리오 작가가 1초 안에 판단 가능한 명료함
- humanizer 적용 (격언체/관념어 X)
- 매체에 맞는 톤 (영화는 시네마틱, 숏드라마는 강렬, 다큐는 질문형)

## ★ 출력 양식 절대 (이 단계는 깔끔히 산출물만)
- 인사·자기소개·"안녕하세요" X
- "30분 후 보고드리겠습니다" 같은 시간 멘트 X
- "다음 단계는?" / "선택지를 골라주세요" 같은 액션 안내 X (UI에 다음 단계 버튼 따로 있음)
- 마크다운 표기 절대 X (\`##\`·\`**\`·\`---\`·\`>\`·\`-\`·\\\`\\\`\\\` 모두 0%) — 한국 시나리오 양식은 평문
- 안 1·안 2·안 3 구분 = 평문 번호 (\`안 1.\`)와 줄바꿈으로
- 곧바로 산출물부터, 끝나면 끝
`;
}


export function buildSynopsisPrompt(idea: string, genre: Genre, userInput?: Record<string, string>, prior?: Record<string, string>, _mediumFields?: Record<string, string | string[] | number> | null): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1000)}`).join("\n\n")
    : "";

  return `# 작업 요청: 시놉시스 (A4 1쪽)

${commonBrief(idea, genre, userInput)}
${priorPart}

## 출력 형식
**시놉시스 본문** (A4 1쪽 = 약 1,200자):

1. **시작 (Setup)** — 인물·세계 소개 (3~4줄)
2. **발단 (Inciting Incident)** — 사건 발생 (2~3줄)
3. **전개 (Plot Point 1 → Midpoint → Plot Point 2)** — 핵심 갈등 (4~6줄)
4. **절정·결말 (Climax → Resolution)** — 어떻게 끝나는가 (2~3줄)

## 룰
- 한국어 자연스러움 우선
- humanizer 6패턴 자가 검증
- "그것은 ~이었다" 같은 번역체 X
- 캐릭터의 결핍·아크 명확
- 시놉시스 자체가 곧 피칭 자료
`;
}


export function buildTreatmentPrompt(idea: string, genre: Genre, userInput?: Record<string, string>, prior?: Record<string, string>, _mediumFields?: Record<string, string | string[] | number> | null): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1500)}`).join("\n\n")
    : "";

  return `# 작업 요청: 트리트먼트 (A4 3~5쪽)

${commonBrief(idea, genre, userInput)}
${priorPart}

## 출력 형식
**트리트먼트 본문** (A4 3~5쪽 = 약 4,000~6,500자):

장 단위로 구성. 각 장에 핵심 사건·감정·턴 명시.

### 1장 (Setup, 25%)
- 인물 소개 + 일상
- Inciting Incident (1막 끝)

### 2장 전반 (Confrontation 1, 25%)
- Plot Point 1 → 본격 갈등
- 중간 위기

### 2장 후반 (Confrontation 2, 25%)
- Midpoint 반전
- Plot Point 2 → 모든 게 무너짐

### 3장 (Resolution, 25%)
- Climax
- Resolution + Epilogue

## 룰
- 씬 헤딩 X (그건 대본 단계). 줄글로.
- 캐릭터 감정 흐름 명확
- 핵심 대사 1~2개 인용 가능
- humanizer 6패턴
`;
}


export function buildCharactersPrompt(idea: string, genre: Genre, userInput?: Record<string, string>, prior?: Record<string, string>, _mediumFields?: Record<string, string | string[] | number> | null): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1500)}`).join("\n\n")
    : "";

  const protagonistCount = userInput?.protagonist_count || "1인 단독 (원톱)";

  return `# 작업 요청: 캐릭터 시트

${commonBrief(idea, genre, userInput)}
${priorPart}

## 출력 형식

**메인 캐릭터 (${protagonistCount} 기준 + 적대자 + 핵심 조연 = 총 3~5명)** — 각 캐릭터마다:

### [캐릭터명] (나이·성별·직업)

**핵심 한 줄**: (이 캐릭터를 가장 잘 설명하는 한 줄)

**Want vs Need**:
- Want (표면 욕망):
- Need (진짜 필요):

**결핍 (Wound) → 거짓믿음 (Lie) → 결함 (Flaw)**:
- Wound: 과거 상처
- Lie: 그래서 믿게 된 거짓
- Flaw: 그게 만든 결함

**Backstory (3줄)**: 작가만 알아도 OK. 행동 일관성 만드는 배경

**비유 체계 (★ 이 캐릭터만의 직업/취미 기반)**:
- 예: 야구 비유 / 커피 비유 / 건축 비유 / 의료 비유

**입버릇 / 시그니처 표현 1~2개**

**캐릭터 아크**: (시작 → 끝 변화)

**관계 매트릭스**: 다른 메인 캐릭터와의 관계 한 줄씩

---

(다음 캐릭터 동일 형식)

## 룰
- 4분면 매트릭스 균형 (외향/내향 × 행동/사고)
- 캐릭터별 비유 체계 절대 겹치지 X
- humanizer 적용
- 이름 가리기 테스트 통과 가능한 화법 차별화
`;
}


export function buildWorldviewPrompt(idea: string, genre: Genre, userInput?: Record<string, string>, prior?: Record<string, string>, _mediumFields?: Record<string, string | string[] | number> | null): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1200)}`).join("\n\n")
    : "";

  const era = userInput?.era || "현대";
  const space = userInput?.space || "서울/수도권 도시";

  return `# 작업 요청: 세계관 정리서

${commonBrief(idea, genre, userInput)}
${priorPart}

## 출력 형식

### 1. 시대·공간
- 시대: ${era}
- 공간: ${space}
- 시각적 톤 (의상/공간/색감 키워드)

### 2. 룰 (이 세계만의 규칙)
판타지·SF·사극이면 마법/기술/시대 룰. 현대물이면 사회 룰/직업 룰.
- 룰 1:
- 룰 2:
- 룰 3:

### 3. 시간대 / 연표 (해당 시)
주요 사건 연표 (작품 속 과거 포함)

### 4. 핵심 장소 5개
- 장소 1 (이름·설명·기능)
- 장소 2
- 장소 3
- 장소 4
- 장소 5

### 5. 사회 구조·계층·권력
누가 위에 있고 누가 아래 있는가

### 6. 작가 노트 (절대 작품에 안 나올 디테일)
- 작가만 알아도 OK인 배경 (행동/대사 일관성용)

## 룰
- 세계관은 작가팀·디자인팀이 공유하는 문서
- 번역체/관념어 X
- 시각적·구체적 묘사
`;
}


export function buildEpisodesPrompt(idea: string, genre: Genre, userInput?: Record<string, string>, prior?: Record<string, string>, _mediumFields?: Record<string, string | string[] | number> | null): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1500)}`).join("\n\n")
    : "";

  const episodes = userInput?.episodes || userInput?.total_episodes || "12부";

  return `# 작업 요청: 회차 구성표

${commonBrief(idea, genre, userInput)}
${priorPart}

## 출력 형식 (회차 수: ${episodes})

### 시즌 아크 한 줄
시즌 전체를 관통하는 한 줄

### 회차별 구성 (모든 회차 — 각 1단락)

**EP01. [부제]**
- 핵심 사건:
- 시작 후크 (1분):
- 중간 턴:
- 엔딩 클리프행어:
- 캐릭터 진전:

**EP02. [부제]**
(동일 형식)

... 마지막 회까지

### 회차 분포 표 (개관)
| 회차 | 부제 | 주요 사건 | 캐릭터 진전 | 엔딩 톤 |
|------|------|----------|-----------|--------|
| EP01 | | | | |
| ... | | | | |

## 매체별 룰
- 드라마: 매 회 후크 + A/B플롯 / 미드포인트 반전
- 숏드라마: 매 회 클리프행어 / 페이월 5블록 의식
- 웹툰: 컷 단위는 X. 회차별 첫컷·엔딩컷 컨셉만
- 웹소설: 회당 5,000~5,500자 분량 의식
- 애니 시리즈: 시즌 아크 + 에피 소아크 이중

## humanizer 6패턴 적용
`;
}


export function buildProposalPrompt(idea: string, genre: Genre, userInput?: Record<string, string>, prior?: Record<string, string>, _mediumFields?: Record<string, string | string[] | number> | null): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1500)}`).join("\n\n")
    : "";

  return `# 작업 요청: 기획안 (제출용)

${commonBrief(idea, genre, userInput)}
${priorPart}

## 출력 형식 — 한국 제작사·방송사 표준 기획안

### 1. 제목 + 가제 + 부제

### 2. 한 줄 정의 (로그라인)

### 3. 기획 의도
- 왜 이 시점에 이 작품인가
- 작가의 동기·문제의식
- 사회적 맥락 (있다면)
※ 자기자랑 X. 기획 중심·설득 톤.

### 4. 시장성 / 타겟
- 메인 타겟층
- 비교 작품 (벤치마크) 2~3편
- 차별점

### 5. 시놉시스 (요약 1쪽)

### 6. 캐릭터 (메인 3~4명 — 각 한 단락)

### 7. 톤 & 매너
- 비주얼 키워드 5개
- 음악·연출 방향

### 8. 분량·일정 (개략)
- 회차/러닝타임
- 제작 단계별 일정

### 9. 차별점 / 셀링 포인트 (핵심 3가지)

### 10. 제작 가능성 / 예산 감
- 캐스팅 후보 톤 (구체 이름 X — 분위기로)
- 제작 난이도

## 룰 (★ 절대)
- 자기자랑 / 자기평가 X
- 추측을 사실처럼 X (예: "Netflix 픽업 가능성")
- 수치 인용 시 출처 명시
- humanizer / 격언체 / 관념어 X
- 프로 시나리오 작가 통과 수준의 설득력
`;
}


export function buildScriptPrompt(idea: string, genre: Genre, userInput?: Record<string, string>, prior?: Record<string, string>, targetSection = "EP01 첫 부분 샘플 (5~10페이지)", _mediumFields?: Record<string, string | string[] | number> | null): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 2000)}`).join("\n\n")
    : "";

  return `# 작업 요청: 본문 (${targetSection})

${commonBrief(idea, genre, userInput)}
${priorPart}

## ★★★★★ 매체 = ${genre.name} ★★★★★
**이 작업은 ${genre.name} 작가가 ${genre.standard}로 ${genre.pages} 분량의 작품을 쓰는 것이다.**
**일반 줄거리·산문체 절대 X. 한국 ${genre.name} 작가들이 실제 사용하는 표준 양식 그대로만 출력.**

표준 양식: ${genre.standard}
분량 표준: ${genre.pages}

${getMediumFormatGuide(genre.letter)}

## ★★★ 절대 룰 (위반 시 작품 = 작가가 못 씀)

1. **매체 = ${genre.name}. 위 출력 양식 그대로**, 다른 매체 양식 절대 X.
   - 다큐멘터리(G) → 시나리오 형식 X = **반드시 시간/영상/오디오/자막 큐시트 표**
   - 예능(M) → 시나리오 형식 X = **반드시 시간/코너/출연자/VCR/자막/MC 큐시트 표**
   - 뮤지컬(I) → 시나리오 형식 X = **♪#1. 넘버 헤더 + 가사 + 무대지시 + 대사**
   - 연극(N) → 시나리오 형식 X = **[1막 1장] + 캐릭터: 대사 + 무대지시**
   - 웹툰(F) → 시나리오 형식 X = **[컷1] [컷2] 컷 단위 분할 + SFX + N**
   - 소설(O) → 씬 헤딩 X = **산문체 줄글 + " " 대화**
   - 에세이(P) → 씬 헤딩 X = **A4 산문 1인칭**
   - TV 드라마(A)·영화(B)·숏드라마(C)·애니(D/E) → **S#1. 장소-시간 + 지문 + 캐릭터 + 대사**

2. **첫 줄부터 매체 양식.** 인사·자기소개·"안녕하세요"·"작업하겠습니다"·메타 보고 0%.

3. **단락 라벨 박지 X** (UI에서만 자동 분류). 본문 자체는 매체 양식 헤더(\`S#1. 장소 - 시간\`, \`[컷1]\`, \`[1막 1장]\`, \`#1. 넘버\`, \`EP01\` 등)만 사용.

4. **마크다운 절대 X** — \`##\`·\`**\`·\`---\`·\`>\`·\`-\`·\\\`\\\`\\\` 0%. 한국 작가는 평문으로 작업.

5. **캐릭터 화법 차별** (이름 가리기 테스트 통과). 대사 숫자 = 한글. 서브텍스트 활용. humanizer 6패턴.

6. **프로 시나리오 작가 통과 수준.**

7. **자가 검증·분석은 \`===AI_NOTES===\` 마커 아래로** (본문 영역엔 절대 X).

## 출력
${targetSection} — 위 ${genre.name} 양식 그대로. 곧바로 첫 양식 헤더부터.

## ★★★ 출력 양식 절대 (한국 시나리오 표준)

### 본문 구역 — 절대 금지 (시나리오 본문에 박지 마라)
- 인사 멘트 0% — "안녕하세요" / "Story Maker입니다" / "작업하겠습니다" 한 글자도 X
- 메타 보고 0% — "작업 요약" / "예상 작업 시간 25분" / "보고드리겠습니다" / "현재 시작합니다" 모두 X
- 마크다운 표기 0% — ** (굵게), ## (헤더), --- (구분선), > (인용), 코드블록 모두 X
- 메타 정보 본문 X — "**제목**", "**분량**", "**포맷**" 같은 작품 정보 헤더 X
- 자가 검증·진단·다음 단계 본문에 X — 본문은 시나리오만

### ★ 자가 검증·분석은 분석 구역으로 (본문 끝에 분리)
본문 끝에 자가 검증·humanizer 결과·캐릭터 화법 분석·다음 단계 작성하고 싶으면, **반드시** 다음 마커 한 줄 후에 작성:

\`\`\`
===AI_NOTES===

(여기에 humanizer 검증 결과, 캐릭터 화법 차별 분석, 다음 단계 안내, 자가 진단 등 자유 작성)
\`\`\`

- 마커 위 = 시나리오 본문만 (작가 원고지에 박힘)
- 마커 아래 = 분석 (작가가 "💭 분석" 버튼 클릭 시 별도 표시)
- 마커는 정확히 \`===AI_NOTES===\` (양쪽 = 3개씩)
- 분석이 없으면 마커도 박지 마라

### 첫 줄 = 곧바로 씬 헤딩 (인사·헤더·메타 X)
- 한국 영화·드라마: \`   1. 장소\` (들여쓰기 + 번호. + 장소)
- 지문 = 평문 (마크다운 X) / 왼쪽 끝
- 대사 = 캐릭터명 들여쓰기 + 탭 후 대사

### ★★★ 줄 길이·번호 절대 룰 (★ 한국 시나리오 핵심)
- **한 줄 = 한 액션·한 정서** = 짧게 끊어쓰기 (한 줄에 여러 액션 X)
- **한 단락 = 1~3줄** = 5줄 이상 X (작가 호흡 = 짧게)
- **빈 줄 = 한 칸만** (연속 빈 줄 2칸+ 절대 X)
- **번호 매기기 0%** = 씬 번호(\`1. 거리\`)만 OK / 본문 안 \`1.\` \`2.\` \`①\` \`②\` 절대 X
- **불릿(-, *, •) 0%** = 평문만
- 한 액션 = 한 줄 = 시각적·물리적 사실만 (인물 머릿속 설명 X)

### ★★★ 단락 단위 = 절대 룰
**한 번에 = 한 씬(S#1.) 또는 한 호흡 단위만 쓰고 멈춰라. 다음 씬·단락은 절대 X.**
- 작가가 한 씬을 보고 = 수정·컨펌 후 = 새 호출로 = 다음 씬 작업.
- "한 번에 끝까지" 절대 X. 페이지 분량 욕심 X.
- 매체별 한 호흡 단위:
  - TV 드라마·영화·숏드라마·애니 = 한 씬(S#1.) 끝
  - 웹툰 = 5~10컷 단위 (1화 65~75컷이지만 한 번에 일부만)
  - 소설·웹소설 = 한 씬(빈 줄로 구분되는 한 호흡) 또는 = 한 단락(원고지 5~10매)
  - 다큐 큐시트 = 한 챕터 안 5~7개 row
  - 예능 큐시트 = 한 코너 (한 큐시트 행 묶음)
  - 뮤지컬 = 한 씬 또는 = 한 넘버 끝
  - 연극 = 한 장(1막 1장 단위)
- 본문 끝에 = 멈춤. AI가 능동적으로 "다음 씬 갈까요?" 식 안내 X (UI에 버튼 있음).
- 작가가 다음 호출 = 그 씬에 이어서 작업. 매번 = 한 호흡 단위.
`;
}


// 산출물 key → 한국어 라벨 (출력 헤더 + 출력 양식 안내용)
const ARTIFACT_LABELS: Record<string, { name: string; spec: string }> = {
  treatment:  { name: "트리트먼트", spec: "A4 3~5쪽 줄거리. 3막 4분할 (Setup → Confront 1 → Confront 2 → Resolution). 줄글." },
  synopsis:   { name: "시놉시스", spec: "A4 1쪽 (~1,200자). Setup → Inciting → Plot → Climax 4단계." },
  character:  { name: "캐릭터 시트", spec: "주조연 3~6명. 각 인물: 이름·나이·직업·동기·결핍·아크·고유 비유 체계 1개." },
  structure:  { name: "구성안", spec: "회차별 또는 막별 비트 (1줄씩). 매체에 맞춰." },
  scene:      { name: "씬 리스트", spec: "씬 번호 · 장소/시간 · 한 줄 요약. 표 또는 리스트." },
  pitch:      { name: "피치덱 개요", spec: "10~15장 슬라이드 컨셉 (제목·핵심 메시지·비주얼 메모 1줄씩)." },
  intent:     { name: "기획 의도서", spec: "왜 이 작품인가 + 사회적 의의. 1~2쪽 줄글. 지원사업 톤." },
  production: { name: "제작 계획", spec: "일정·인력·예산 개요·로케이션. 표·리스트." },
  bio:        { name: "제출자 이력", spec: "작가 소개·대표 작품·수상. writerProfile 자동 첨부됨." },
  impact:     { name: "예상 효과", spec: "관객·시장·문화적 효과. 정량·정성 1~2쪽." },
};

export function buildFullPackagePrompt(idea: string, genre: Genre, userInput: Record<string, string>, artifactKeys: string[]): string {
  const artifactDetails = artifactKeys.map((k, i) => {
    const meta = ARTIFACT_LABELS[k];
    if (!meta) return `${i + 1}. ${k}`;
    return `${i + 1}. **${meta.name}** — ${meta.spec}`;
  }).join("\n");

  return `# 작업 요청: 기획 패키지 (${artifactKeys.length}종 산출물)

${commonBrief(idea, genre, userInput)}

## 작업 — ${artifactKeys.length}종 산출물 본문을 차례로 출력 (한 호출)
${artifactDetails}

## ★★★ 출력 양식 (절대 준수 — 평문, 마크다운 X)

각 산출물 사이는 다음 평문 헤더로 구분 (작가가 산출물별로 나눠 받기 위함):

\`\`\`
═══ 📄 1. 트리트먼트 ═══

(본문 — 평문, 마크다운 X. 한국 시나리오·트리트먼트 양식.)


═══ 📄 2. 시놉시스 ═══

(본문)


(이하 ${artifactKeys.length}개 산출물 모두)
\`\`\`

- 헤더는 정확히 \`═══ 📄 N. 산출물명 ═══\` (양쪽 ═══ 3개 + 이모지 + 산출물명).
- 산출물 사이는 빈 줄 2개로 구분 (마크다운 \`---\` 사용 X).
- 산출물 본문 안에서도 마크다운 절대 X (system prompt의 출력 양식 룰 절대 준수). 한국 시나리오·트리트먼트 양식은 평문이다.
- 매체별 표준 헤더 (\`S#1. 장소 - 시간\`, \`[컷1]\`, \`[1막 1장]\`, \`#1. 넘버 제목\`, \`EP01\` 등)는 = 마크다운 아니라 매체 양식이므로 사용.
- 표 양식 (다큐 큐시트·예능 큐시트·게임 대사 데이터)은 = 매체 표준이므로 사용.

## 매체별 양식 (본문 영역인 산출물 = 위 양식 따라야)
- 매체: ${genre.name} (${genre.sub}) — ${genre.standard}
${getMediumFormatGuide(genre.letter)}

## 룰
- 모든 산출물 = ${genre.name} 한국 실무 표준 양식 그대로.
- 인사·자기소개·메타 보고 X (곧바로 첫 산출물 헤더부터).
- 마지막에 자가 검증 결과·다음 단계 안내 X (UI에서 별도).
- humanizer 6패턴 자가 검증.
- 너무 길면 산출물 우선순위 낮은 것은 압축 (max_tokens 8000 한도 내).
- 더 깊이 작업하고 싶은 산출물은 = 작가가 별도 산출물 카드를 클릭하여 = 단독 호출로 깊게 작업 가능 (UI 안내).
`;
}


/**
 * buildBriefFillPrompt — 의뢰서 자동 채움.
 * 작가가 한 줄 idea만 박았을 때 = AI가 매체별 fields(서브장르·러닝타임·톤·시점·주인공 한 줄 등) 다 추측해서 JSON으로.
 */
export function buildBriefFillPrompt(
  idea: string,
  genre: Genre,
  fields: Array<{ key: string; label: string; type: string; options?: string[]; default?: unknown }>,
): string {
  const fieldList = fields.map(f => {
    let line = `- "${f.key}" (${f.label}): type=${f.type}`;
    if (f.options && f.options.length > 0) {
      line += `, 선택지=[${f.options.join(" / ")}]`;
    }
    return line;
  }).join("\n");

  return `# 작업 요청: 의뢰서 자동 채움

## 한 줄 아이디어
${idea}

## 매체
${genre.name} (${genre.sub})
표준 양식: ${genre.standard}

## 채워야 할 필드 (${fields.length}개)
${fieldList}

## 출력 — JSON 한 덩어리만 (다른 텍스트·인사·설명 절대 X)

각 필드를 = 한 줄 idea와 ${genre.name} 매체 기준 = 프로 작가가 선택할 합리적 값으로:
- select 타입: options 중 정확히 하나
- multiselect 타입: options 중 1~3개를 배열로 ["a", "b"]
- number 타입: 숫자
- text 타입: 짧게 (한 줄)
- textarea 타입: 2~3줄 (필요시 더)

\`\`\`json
{
  "field_key_1": "값1",
  "field_key_2": "값2",
  "field_key_multiselect": ["값1", "값2"]
}
\`\`\`

룰:
- 모든 필드 다 채움 (작가가 비워뒀어도 = AI가 추측)
- options 있는 필드 = 반드시 그 옵션 중 하나 정확히
- 인사·메타 보고·\`\`\`json 외 텍스트 절대 X. JSON만.
`;
}


export function buildOsmuPrompt(idea: string, sourceIp = ""): string {
  const ipPart = sourceIp ? `\n## 원본 IP\n${sourceIp}\n` : "";

  return `# 작업 요청: OSMU 풀세트 모드

## 핵심 아이디어
${idea}
${ipPart}

## 출력 — 12개 장르 매트릭스
각 장르마다 다음 형식으로 1~2단락:

### A. TV 드라마
- **차별 매력**:
- **시점/시간축/깊이**:
- **로그라인**:

### B. 영화
...

(★ 다음 12장르 모두: A.TV드라마 / B.영화 / C.숏드라마 / D.애니메이션 / F.웹툰 / G.다큐 / H.웹소설 / I.뮤지컬 / J.유튜브 / K.전시·체험 / L.게임 / M.예능)

## 룰 (★)
- 미디어별 다른 매력 분배 (영화=절제, 드라마=관계, 웹소설=내면, 게임=인터랙티브, 전시=공간)
- 단순 변환 X — 각 장르 고유 강점 살리기
- 한 IP 통일성 유지 (캐릭터/세계관 일관)
- 마지막에 **OSMU 전개 우선순위** (어디부터 시작하면 좋을지) 추천
`;
}

/** 공고 메타데이터 자동 추출 — 마감일·심사기준·예산·신청자격·심사위원·접수처. JSON 강제. */
export function buildGrantMetaPrompt(noticeText: string): string {
  const truncated = noticeText.length > 12000
    ? noticeText.slice(0, 12000) + "\n\n[…이하 생략 — 토큰 절약]"
    : noticeText;
  return `# 작업: 지원사업 공고 메타데이터 자동 추출

## 입력 (공고 본문 또는 양식)
\`\`\`
${truncated}
\`\`\`

## 출력 — JSON 단일 블록
공고 본문에서 다음 정보를 추출해서 **JSON 단일 블록으로만** 출력하라.
값을 못 찾으면 = 빈 문자열 \`""\`. 추측·창작 X. 본문에 명시된 사실만.

\`\`\`json
{
  "title": "공고 제목",
  "agency": "주관 기관 (예: 영화진흥위원회·KOCCA·고양산업진흥원 등)",
  "program_type": "사업 유형 (제작 지원·기획 지원·인큐베이팅·교육 등)",
  "deadline": "접수 마감일 (YYYY-MM-DD HH:MM 형식 또는 명시된 형식 그대로)",
  "submission_method": "접수 방법 (온라인·이메일·등기·방문 등)",
  "submission_url": "접수 URL (있을 경우)",
  "budget_total": "총 사업 예산",
  "budget_per_project": "건당 지원금 (또는 등급별)",
  "support_period": "지원 기간 (예: 2026-06-01 ~ 2026-12-31)",
  "eligibility": "신청 자격 (개인·법인·연차 등 — 한 줄 요약)",
  "selection_criteria": "심사 기준 (가점·감점·평가 항목들 짧게 bullet — 줄바꿈은 \\n)",
  "judges": "심사위원 정보 (외부 전문가·내부·구성 등 — 명시된 경우만)",
  "required_documents": "제출 서류 목록 (한 줄에 하나, \\n 구분)",
  "format_constraints": "양식 제약 (분량·페이지 수·폰트·파일 형식 등)",
  "key_dates": "주요 일정 (접수·심사·발표·교부 — 한 줄에 하나, \\n 구분)",
  "contact": "문의처 (담당자·전화·이메일)",
  "notes": "기타 주의사항 (1~2줄, 작가가 놓치기 쉬운 것 위주)"
}
\`\`\`

## 절대 룰
- ★ JSON 단일 블록만. 앞뒤 설명·자가소개·인사 X.
- ★ 값을 못 찾으면 \`""\` 빈 문자열. 추측·"~일 것" 같은 표현 X.
- ★ JSON 안 줄바꿈이 필요한 값(목록 등)은 \`\\n\`로 명시.
- ★ JSON 외 다른 마크다운 X. 코드 펜스(\`\`\`json … \`\`\`)는 OK.
`;
}
