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
- 프로 작가 통과 수준
- humanizer 자가 검증 (번역투/격언체/관념어/rule-of-three/대구문 회피)
- 캐릭터 화법 차별화
- 한국어 자연스러움 우선

## 형식
각 단계마다 ## 헤더로 구분. 마지막에 "다음 단계 추천" 1줄.
`;
}


export function buildCollaboratePrompt(stage: string, userInput: Record<string, string>, genre: Genre, prior?: Record<string, string>): string {
  // ─── 채팅 모드 (보조작가) — 동료 작가처럼 자연스러운 대화 ───
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

    return `너는 프로페셔널 작가 Story Maker의 보조작가 "${assistantName}"이다. 자기 호칭은 "${assistantName}". 작가님 컨텍스트: ${context}.

★ 너의 역할 — 대화·자료조사·아이디어 brainstorming만:
- 작가님과 자연스러운 대화
- 자료조사 (시대 고증, 장소 추천, 풍속, 직업 일과, 은어, 용어 등)
- 아이디어 brainstorming (옵션 제시)
- 짧은 잔작업 (캐릭터 이름 후보 추천, 비유 추천, 씬 헤딩 형식 등)

✗ 너의 역할 X — 파일을 읽고 작업하는 건 여기서 안 한다:
- **파일 첨부·본문 변경·각색·집필은 다른 페이지에서**.
- 이름이나 사건을 바꾸거나 본문을 다시 쓰는 건 → **각색실(/adapt)**.
- 새 작품 집필·트리트먼트·시놉시스 → **집필실(/write)**.
- 다중 타겟 리뷰 → **리뷰(/review)**.
- 작가님이 본문 변경/파일 작업 요청하면 "그건 각색실(/adapt) 또는 집필실(/write)에서 작업하시면 정확해요" 안내.

12장르 한국 표준·humanizer 6패턴이 머릿속에 있다. 작가님 시간 = 귀중. 짧고 정확하게.

작가님의 작업 환경 (이미 알고 있다): ${context}
장르 컨텍스트: ${genre.name} (${genre.sub})

작가님이 방금 한 말:
"""
${content}
"""

위에 자연스럽게 답해라.

응답 톤 (★ 절대 준수):
- 호칭은 "작가님". 반말·동료 톤 X.
- 친근하지만 존중. 예: "안녕" → "작가님 안녕하세요. 오늘은 무엇을 도와드릴까요? 작품은 잘 되가시나요?" 정도.
- 작가님 메시지에 직접 응답. 안 물었는데 작품 분석 줄줄 풀지 말 것.
- 짧게 (한 단락 이내가 기본). 작가님이 길게 물으면 길게.
- 자기소개 X (이미 인사한 사이).
- AI 티 단어 (다층적/본질적/결국/요컨대/격언체) 0%.

작가님이 자주 시키는 일 — 즉시 보조작가 노하우로 구체적으로 처리:
- **Brainstorming** (아이디어 검토): "주인공 직업 뭐가 좋을까?" "둘이 만나는 사건 뭐로 할까?" "요즘 10대 은어 뭐 있어?" → 12장르·한국 작가 노하우로 구체적 옵션 3~5개 제시. 강의 X, 옵션만.
- **잔작업** (다듬기/검토/생성): "이 대사 10대 톤으로 바꿔줘" "이 단락 검토해줘" "캐릭터 이름 5개 추천" "씬 헤딩 표준대로" → 즉시 작업해서 결과만. 인사·해설 짧게.
- **자료조사**: "이 시대 어떤 옷 입었어?" "1970년대 서울 풍경" "조선시대 양반집 구조" "방송국 PD 일과" → 보조작가 노하우 + 한국 자료로 구체적·실용적으로 정리. 사실 모르는 건 솔직하게.
- **장소 선정**: "이 씬에 어울리는 장소" "한국에서 [컨셉] 촬영 가능한 곳" → 분위기 + 실제 가능성 + 대안 옵션.
- **시대 고증**: 시대물(사극/근대/일제/1970~80) 대본일 때 → 호칭·복식·풍속·생활 자동 체크해드림.
- **막힌 부분 의논**: "여기서 안 풀려" → 같이 고민. 옵션 제시 + 작가님 결정 존중.

작가님이 구체적으로 무엇을 원하는지 보고 그것만 한다. 추가로 강의·자기 자랑 X.`;
  }

  // ─── 그 외 stage (logline/treatment/synopsis/script 등) — 단계별 공동 집필 ───
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
- 프로 작가 기준.
- 출처(원문 인용) 명시.
`;
}


/** 사장님 노하우 — 장편 시나리오 각색 체크리스트 PHASE 0~5 (모든 각색 작업의 정공법) */
const ADAPT_CHECKLIST = `## 🎬 장편 시나리오 각색 체크리스트 (PHASE 0~5 — 정공법)

### PHASE 0 — 원작 분석 (각색 착수 전)
- [ ] 원작의 코어 감정이 무엇인지 한 문장으로 정의했는가
- [ ] 원작에서 반드시 지켜야 할 것 vs 버려야 할 것을 목록화했는가
- [ ] 원작의 미디어 특성 (시각/청각/독자 상상력 의존도)을 파악했는가
- [ ] 저작권/원작자 관계, 각색 범위 합의가 완료됐는가

### PHASE 1 — 구조 설계
- [ ] 원작의 이야기를 장르 공식에 맞게 재배치했는가 (3막 or 장르별 변형)
- [ ] 극적 질문(Central Dramatic Question)이 명확한가: 주인공이 무엇을 원하고, 무엇이 막는가
- [ ] 서브플롯이 메인 플롯의 주제를 강화하는가, 아니면 희석하는가
- [ ] 원작의 내면 독백·서술 → 시각화 가능한 행동/장면으로 치환됐는가
- [ ] 러닝타임 안에 삭제/압축/합산된 인물/사건이 구조에 구멍을 내지 않는가

### PHASE 2 — 인물 재설계
- [ ] 원작 주인공의 욕망(Want) vs 필요(Need)가 각색에서도 살아있는가
- [ ] 조연 중 드라마적 기능이 겹치는 인물을 통폐합했는가
- [ ] 원작에서 서술로 전달되던 인물의 내면을 대사·행동·반응으로 외재화했는가
- [ ] 안타고니스트에게 자기 논리가 있는가 (단순 악인 X)
- [ ] 인물 관계도가 시각적으로 충돌과 긴장을 만드는가

### PHASE 3 — 씬 단위 점검
- [ ] 각 씬이 기능(정보/갈등/전환) + 감정 변화 두 가지를 동시에 수행하는가
- [ ] 씬 입장 시점이 최대한 늦고, 퇴장 시점이 최대한 빠른가 (late in, early out)
- [ ] 대사가 직접 말하기(on-the-nose) 수준에 머물지 않는가
- [ ] 시각적으로 이미지/오브젝트/공간이 주제나 캐릭터 심리를 대변하는가
- [ ] 원작의 명장면이 각색에서 억지로 살려지고 있지는 않은가

### PHASE 4 — 장르 정합성
- [ ] 장르 기대치(관객이 이 장르에서 요구하는 것)를 충족하는 씬이 있는가
- [ ] 장르의 클라이맥스 공식을 의식적으로 설계했는가
- [ ] 톤이 일관되는가: 블랙코미디인데 순간 신파로 무너지진 않는가
- [ ] 엔딩이 장르의 정서를 완결하는가, 아니면 배신하는가

### PHASE 5 — 완고 직전 최종 점검
- [ ] 1페이지 시놉 → 시나리오 구조가 일치하는가
- [ ] 모든 복선이 회수됐는가, 혹은 의도적으로 미회수인가
- [ ] 관객이 마지막 씬에서 느끼는 감정을 정확히 예측할 수 있는가
- [ ] 원작의 독자가 이 각색을 봤을 때 핵심 감정은 동일하게 느끼는가

★ 위 체크리스트를 작업 안에 명시적으로 적용하라. 각 PHASE 항목을 의식적으로 통과해야 한다.
`;

export function buildAdaptPrompt(text: string, sourceGenre: Genre, targetGenre: Genre): string {
  const truncated = text.length > 6000 ? text.slice(0, 6000) + "...(이하 생략)" : text;
  return `# 작업 요청: 각색 (다른 매체로 이식)

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

${ADAPT_CHECKLIST}

## 변환 룰 (★ 절대 준수)
1. **원본의 좋은 부분 반드시 유지** — 약한 부분만 변경
2. 캐릭터 고유 비유 체계 유지 (있다면)
3. 캐릭터명 일관 (변경 시 명시)
4. 복선 대사 유지 (삭제 시 뒤 연결 끊기는지 확인)
5. 목표 장르 양식 정확히 적용

## 출력 단계
1. **PHASE 0 분석** — 원작의 코어 감정 한 줄 + 유지/버림 목록
2. **각색 전략** — 무엇을 유지/추가/변경할지 (PHASE 1~2 적용)
3. **변환된 트리트먼트** (3~5줄, PHASE 1 구조 적용)
4. **변환된 시놉시스** (1쪽)
5. **변환된 본문** (목표 장르 양식대로 첫 부분 샘플, PHASE 3 씬 단위 점검 적용)
6. **변환 노트** — 무엇을 왜 바꿨는지 / 무엇을 보존했는지 / PHASE 5 최종 점검 결과
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

  return `# 작업 요청: 배급사 다중 타겟 리뷰 — 정식 평가서

너는 배급사 표준 콘텐츠 평가 위원이다. **정식 평가서 양식**으로 출력. 인사·자기소개·서두 메시지 절대 X. 곧바로 평가서 본문부터.

## 분석 대상
\`\`\`
${truncated}
\`\`\`
${genrePart}
## 타겟 (${targets.length}명)
${targetsBlocks}

---

## ★ 출력 양식 (반드시 이 구조로, 인사·서두 X)

### A. 종합 요약 (한 화면 핵심)

\`\`\`
## ⭐ 종합 평가
**별점: ★★★★☆ (X/5)**  ← 14개 카테고리 평균을 5점 만점으로 환산
**한 줄 평**: (작품 핵심 강점 + 핵심 약점)

## 📊 타겟별 등급 (헐리우드 코버리지)
| # | 타겟 | 등급 | 별점 | 근거 (1줄) |
|---|------|------|------|------------|
${targets.map((t, i) => `| ${i + 1} | ${t.name.length > 20 ? t.name.slice(0, 18) + "…" : t.name} | PASS/CONSIDER/RECOMMEND | ★★★☆☆ | … |`).join("\n")}

## 📈 타겟 매칭도 매트릭스 (1~10점)
| 타겟 | 1차반응 | 몰입도 | 구매의향 | 종합 |
|------|---------|--------|----------|------|
${targets.map(t => `| ${t.name.length > 20 ? t.name.slice(0, 18) + "…" : t.name} | _ | _ | _ | _ |`).join("\n")}

## 📋 14개 카테고리 평균 점수
| 컨셉 | 캐릭터 | 스토리 | 플롯·구조 | 씬 | 주제 | 장르 | 페이싱 | 톤 | 대사 | 시장성 | 문체 | 포맷·문법 | 제목 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| _/10 | _/10 | _/10 | _/10 | _/10 | _/10 | _/10 | _/10 | _/10 | _/10 | _/10 | _/10 | _/10 | _/10 |
\`\`\`

### B. 공통 의견 (모든 타겟이 합의한 부분 — 작가 즉시 반영 가능)

\`\`\`
## ✅ 공통 강점 (3명 모두 호평)
1. (강점 + 어디서 — 원문 인용 가능하면)
2. ...
3. ...

## ⚠ 공통 지적 (3명 모두 동의한 수정 필요 부분)
1. (문제 + 어디 + **어떻게** 고칠지)
2. ...
3. ...
4. ...
5. ...

## 🎯 추천 수정 우선순위 (긴급도 순)
1. **[★★★ 즉시]** ___ (왜 시급한지)
2. **[★★ 다음 라운드]** ___
3. **[★ 여유 있을 때]** ___
\`\`\`

### C. 개별 의견 (각 타겟별 12문항 리뷰지 — 알바 리서치 문항지 표준 양식)

**각 타겟마다 헤딩**: \`## 🎯 타겟 N: <이름> 의 리뷰지\`

각 타겟별 **12개 문항** (Q1~Q12, 모든 타겟에 동일 적용). 각 문항 답변 마지막에 점수 있는 항목은 별점/숫자 함께 표기.

**Q1. 제목 평가** (★★★☆☆ 6/10) — 점수 + 이유
**Q2. 제목 대안 추천 (3개)** — 이 타겟이 더 끌릴 만한 제목 3개와 이유
**Q3. 1차 반응** (첫 5분 / 첫 10페이지 / 첫 화) — 처음 봤을 때 반응 구체적
**Q4. 좋았던 부분 Top 3** (구체적 원문/씬 인용 + 이유)
**Q5. 별로였던 부분 Top 3** (구체적 원문/씬 인용 + 이유)
**Q6. 캐릭터별 호감도** (메인 3~5명 각각 ★★★☆☆ N/10 + 이유)
**Q7. 대사 반응** — 좋아할 대사 2~3개 / 거부감 드는 대사 2~3개 (원문 인용)
**Q8. 클라이맥스 임팩트** (★★★☆☆ N/10) — 이 타겟에게 와닿는가
**Q9. 결말 만족도** (★★★☆☆ N/10) — 만족할 결말인가 / 무엇이 부족한가
**Q10. 고쳤으면 하는 부분 Top 5** — 어느 씬/회차/대사를 어떻게
**Q11. 다시 볼 의향 / 추천 의향** (★★★☆☆ N/10) — 결제·시청·완주 + 친구 추천
**Q12. 한 줄 평** — 배급사 평가서에 들어갈 이 타겟의 한 줄

### D. 핵심 인사이트 + 배급 추천

\`\`\`
## 🔍 핵심 인사이트
- **가장 잘 맞는 타겟**: ___ (이유)
- **가장 약한 타겟**: ___ (이유 + 잡으려면)
- **타겟 간 충돌**: ___ (한 타겟에 맞추면 다른 타겟이 빠질 부분)

## 📡 배급/유통 추천
- 어느 플랫폼/채널이 가장 적합한지 (이 타겟 분포 기준)
\`\`\`

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
- 프로 작가 통과 수준 — 솔직, 후하지 X
- humanizer 6패턴 (리뷰 문장도 AI투 X)
- 작가가 이 리뷰 받고 어디를 어떻게 고칠지 바로 알 수 있게

### 5. 페르소나끼리 시각이 뭉개지면 X
타겟 1과 2의 평가가 비슷한 시각/디테일이면 실패. 각자 자기 인생에서만 보이는 디테일을 잡아내야 함.
`;
}


// =====================================================================
// 산출물 8종 빌더
// =====================================================================

/** 매체 fields 값 → 프롬프트용 사람이 읽는 라인 변환 */
function formatMediumFields(mediumFields?: Record<string, string | string[] | number> | null): string {
  if (!mediumFields) return "";
  const lines: string[] = [];
  for (const [k, v] of Object.entries(mediumFields)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      lines.push(`- **${k}**: ${v.join(", ")}`);
    } else if (typeof v === "number") {
      lines.push(`- **${k}**: ${v}`);
    } else if (typeof v === "string") {
      const trimmed = v.trim();
      if (!trimmed) continue;
      lines.push(`- **${k}**: ${trimmed}`);
    }
  }
  return lines.length ? lines.join("\n") : "";
}

function commonBrief(
  idea: string,
  genre: Genre,
  userInput?: Record<string, string>,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const fields = userInput
    ? Object.entries(userInput).filter(([, v]) => v).map(([k, v]) => `- **${k}**: ${v}`).join("\n")
    : "";
  const mediumLines = formatMediumFields(mediumFields);
  const mediumPart = mediumLines ? `\n## 매체 의뢰서 (작가가 채운 매체 전용 입력)\n${mediumLines}\n` : "";
  const deep = dramaMovieDeepAddendum(genre, userInput, mediumFields);
  return `## 작품 기본 정보
- **아이디어**: ${idea}
- **매체**: ${genre.name} (${genre.sub})
- **분량 표준**: ${genre.pages}
${fields}
${mediumPart}${deep}`;
}


function dramaMovieDeepAddendum(
  genre: Genre,
  userInput?: Record<string, string>,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const code = genre.letter;
  if (code !== "A" && code !== "B") return "";

  // mediumFields가 직접 들어왔을 때 우선
  const mfStr = (k: string): string | undefined => {
    const v = mediumFields?.[k];
    return typeof v === "string" ? v : (typeof v === "number" ? String(v) : undefined);
  };

  if (code === "A") {
    const episodes = mfStr("episodes") || userInput?.episodes || "12부작";
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
  const runtime = mfStr("runtime") || userInput?.runtime || "100분";
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


export function buildLoglinePrompt(
  idea: string,
  genre: Genre,
  userInput?: Record<string, string>,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  return `# 작업 요청: 로그라인 생성

${commonBrief(idea, genre, userInput, mediumFields)}

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
- 프로 작가가 1초 안에 판단 가능한 명료함
- humanizer 적용 (격언체/관념어 X)
- 매체에 맞는 톤 (영화는 시네마틱, 숏드라마는 강렬, 다큐는 질문형)
`;
}


export function buildSynopsisPrompt(
  idea: string,
  genre: Genre,
  userInput?: Record<string, string>,
  prior?: Record<string, string>,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1000)}`).join("\n\n")
    : "";

  return `# 작업 요청: 시놉시스 (A4 1쪽)

${commonBrief(idea, genre, userInput, mediumFields)}
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


export function buildTreatmentPrompt(
  idea: string,
  genre: Genre,
  userInput?: Record<string, string>,
  prior?: Record<string, string>,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1500)}`).join("\n\n")
    : "";

  return `# 작업 요청: 트리트먼트 (A4 3~5쪽)

${commonBrief(idea, genre, userInput, mediumFields)}
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


export function buildCharactersPrompt(
  idea: string,
  genre: Genre,
  userInput?: Record<string, string>,
  prior?: Record<string, string>,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1500)}`).join("\n\n")
    : "";

  const mfProtagonist = mediumFields?.protagonist_count;
  const protagonistCount = (typeof mfProtagonist === "string" && mfProtagonist)
    || userInput?.protagonist_count
    || "1인 단독 (원톱)";

  return `# 작업 요청: 캐릭터 시트

${commonBrief(idea, genre, userInput, mediumFields)}
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


export function buildWorldviewPrompt(
  idea: string,
  genre: Genre,
  userInput?: Record<string, string>,
  prior?: Record<string, string>,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1200)}`).join("\n\n")
    : "";

  const mfStr = (k: string) => {
    const v = mediumFields?.[k];
    return typeof v === "string" ? v : undefined;
  };
  const era = mfStr("era") || userInput?.era || "현대";
  const space = mfStr("space") || userInput?.space || "서울/수도권 도시";

  return `# 작업 요청: 세계관 정리서

${commonBrief(idea, genre, userInput, mediumFields)}
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


export function buildEpisodesPrompt(
  idea: string,
  genre: Genre,
  userInput?: Record<string, string>,
  prior?: Record<string, string>,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1500)}`).join("\n\n")
    : "";

  const mfStr = (k: string) => {
    const v = mediumFields?.[k];
    return typeof v === "string" ? v : (typeof v === "number" ? String(v) : undefined);
  };
  const episodes = mfStr("episodes")
    || mfStr("total_episodes")
    || mfStr("ep_count")
    || userInput?.episodes
    || userInput?.total_episodes
    || "12부";

  return `# 작업 요청: 회차 구성표

${commonBrief(idea, genre, userInput, mediumFields)}
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


export function buildProposalPrompt(
  idea: string,
  genre: Genre,
  userInput?: Record<string, string>,
  prior?: Record<string, string>,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 1500)}`).join("\n\n")
    : "";

  return `# 작업 요청: 기획안 (제출용)

${commonBrief(idea, genre, userInput, mediumFields)}
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
- 프로 작가 통과 수준의 설득력
`;
}


/** 매체별 출력 형식 가이드 — buildScriptPrompt 내부 분기 */
function mediumOutputFormatGuide(
  genre: Genre,
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const code = genre.letter;
  const mfStr = (k: string): string | undefined => {
    const v = mediumFields?.[k];
    return typeof v === "string" ? v : (typeof v === "number" ? String(v) : undefined);
  };

  switch (code) {
    case "A": // TV 드라마
    case "B": // 영화
    case "D": // 극장 애니
    case "E": // 애니 시리즈
    case "C": { // 숏드라마
      const epHint = mfStr("episodes") || mfStr("total_episodes") || mfStr("ep_count");
      return `**시나리오 표준 — 씬 헤딩 + 대사**:
- 씬 헤딩 형식: \`S#1. 장소 / 시간\` (한국식)
- 인물 헤더: 이름 (행동 지문)
- 대사는 줄바꿈 후 들여쓰기
- 지문은 [ ] 안에 (행동·소리·카메라)
${epHint ? `- 분량 기준: ${epHint}` : ""}`;
    }
    case "F": { // 웹툰
      return `**웹툰 컷 단위 출력**:
- 회차당 65~75컷
- "1컷: 장면 묘사 + 대사 / 효과음", "2컷: ...", ... 형식
- 컷마다 무엇이 보이는지 시각적으로 묘사
- 첫컷 후크 + 엔딩컷 다음회 hook 명시`;
    }
    case "G": { // 다큐
      const fmt = mfStr("format_type") || "큐시트형 (방송용 2단)";
      if (fmt.includes("큐시트")) {
        return `**다큐 큐시트형 (방송용 2단)**:
- 좌(영상): 화면/컷 / 우(오디오): 내레이션·인터뷰·자막
- 표 형식 \`| 시간 | 영상 | 오디오 |\`
- 인터뷰 인용은 "이름 (직책): 발화"`;
      }
      if (fmt.includes("콘티")) {
        return `**다큐 콘티형 (시간순 컷별)**:
- 시간 → 컷 단위 묘사 → 음향/내레이션 명시`;
      }
      return `**다큐 구성안형 (기획용 줄글)**:
- 챕터별 줄글
- 핵심 인터뷰 대상·장면 묘사·내레이션 인용 포함`;
    }
    case "H": { // 웹소설
      const chars = mfStr("chars_per_ep") || "5,000~5,500자 (네이버/카카오 표준)";
      return `**웹소설 텍스트**:
- 회당 분량: ${chars}
- 짧은 단락 (모바일 가독성)
- 한 화 끝에 다음 화 후크 1줄
- 1인칭 또는 3인칭 한정시점 권장`;
    }
    case "I": { // 뮤지컬
      return `**뮤지컬 대본 (Libretto)**:
- 노래 부분: ♪ 표시 + 노래 제목 (ex. ♪ M3. 그날의 약속)
- 레치타티보(낭송)와 노래 명확히 구분
- 무대 지문은 [ ] 안에 (조명·블로킹·전환)`;
    }
    case "J": { // 유튜브
      const len = mfStr("length_type") || "";
      return `**유튜브 자막 대본**:
- ★ 첫 3초 후크 강조 (가장 중요)
- 시간 큐 \`[00:00] 자막\` 형식
- 자막 한 줄 13자 이내, 1초당 2.5자 권장
- CTA(콜투액션) 마지막 5초 명시
${len ? `- 길이 기준: ${len}` : ""}`;
    }
    case "K": { // 전시
      return `**전시 존별 스토리**:
- 존 1, 존 2, ... 순서
- 각 존: 컨셉 / 관람 동선 / 월텍·라벨 / 인터랙티브 요소
- 도슨트 톤 한 단락
- 굿즈 연결점 (있다면)`;
    }
    case "L": { // 게임
      return `**게임 대사 데이터 + 분기**:
- NPC ID / 상황 / 대사 / 분기 조건 / 결과 플래그
- 표 형식 \`| ID | 화자 | 대사 | 선택지 | 다음 |\`
- 컷씬은 별도 시나리오 형식
- 호감도/플래그 변화 명시`;
    }
    case "M": { // 예능
      return `**예능 큐시트**:
- 표 형식 \`| 시간 | 장소 | 코너 | 내용 | MC발화 / 자막 포인트 |\`
- 코너 단위 분할
- MC 발화 + 자막 포인트 + 게스트 리액션 예측
- BGM/효과음 큐 명시`;
    }
    default:
      return `**한국 실무 표준 양식**:
- 표준 양식: ${genre.standard}
- 분량 표준: ${genre.pages}`;
  }
}

export function buildScriptPrompt(
  idea: string,
  genre: Genre,
  userInput?: Record<string, string>,
  prior?: Record<string, string>,
  targetSection = "EP01 첫 부분 샘플 (5~10페이지)",
  mediumFields?: Record<string, string | string[] | number> | null,
): string {
  const priorPart = prior
    ? "\n\n## 이미 작성된 자료\n" + Object.entries(prior).map(([k, v]) => `### ${k}\n${v.slice(0, 2000)}`).join("\n\n")
    : "";
  const formatGuide = mediumOutputFormatGuide(genre, mediumFields);

  return `# 작업 요청: 대본 본문 (${targetSection})

${commonBrief(idea, genre, userInput, mediumFields)}
${priorPart}

## 매체 양식 (★ 정확히 준수)
${genre.name} 한국 실무 표준 양식:
- 표준 양식: ${genre.standard}
- 분량 표준: ${genre.pages}

### 출력 형식 (매체별 분기)
${formatGuide}

## 출력
${targetSection} — 위 매체 양식 그대로 출력.

## ★ 출력 양식 절대 준수 (한국 시나리오 표준)

### 절대 금지
- **마크다운 표기 금지**: \`**\`(굵게), \`##\`/\`#\`(헤더), \`---\`(구분선) 모두 X
- **메타 정보 본문에 박지 마라**: "**장르**: 스릴러", "**분량**: 중편", "**등급**: 15세", "**시점**: 1인칭" 같은 메타 헤더 한 줄도 X. 곧바로 S#1부터 시작.
- **AI 안내 멘트 X**: "안녕하세요", "Story Maker입니다", "이렇게 진행하겠습니다" 등 인사·안내 0.

### 표준 양식 (이대로만)
\`\`\`
S#1. 장소 - 시간

지문 단락. 사람이 무엇을 하는지, 공간이 어떤지. 2~3줄로 자연스럽게.

                              캐릭터명
                  (지시문)
                  대사 한 줄.

지문 다음 액션. 빈 줄로 단락 분리.

                              상대 캐릭터
                  대사 응답.


S#2. 다음 장소 - 시간

(다음 씬 본문)
\`\`\`

### ★ 분량 — 한 번에 끝까지 X (절대)
- 첫 씬(S#1)부터 시작해 5~10페이지(매체 표준 분량)만 작성하고 멈춰라.
- 영화 100분, TV 드라마 16부, 웹툰 50화 — 한 번에 다 X. 절대.
- 마지막 씬에서 자연스럽게 끊고 끝. "다음 씬에서 계속" 같은 안내 X — 그냥 끝.
- 작가가 다음 씬 요청하면 그때 이어서. 지금은 첫 부분만.

### ★ 사람이 쓴 것처럼 (핵심 — 이게 안 되면 프로그램 의미 X)
- **AI 티 단어 0%** — "다층적/본질적/결국/요컨대/즉/한편/그러나/하지만(과잉)/그것은 ~이었다" 모두 금지
- **격언체·대구문 X** — "X가 아니라 Y야", "X면 X답게" 같은 깔끔한 대구문 X
- **번역체 X** — "그것은 ~이다", "~에 다름 아니다" X
- **보여주기, 말하지 X (Show, Don't Tell)** — 감정·심리 설명 대사 X. 행동·소품·침묵·시선·호흡으로
- **디테일은 구체적으로** — "분위기 있는 카페" X → "낡은 LP판이 돌고, 컵 받침이 젖어 있는 카페"
- **공백·여백** — 침묵, "..." (3점), 빈 줄로 호흡

### ★★ 대사 톤 — 캐릭터별 차별화 (사람이 쓴 시나리오의 핵심)

**1. 이름 가리기 테스트 (절대 통과해야 함)**
- 캐릭터명을 모두 가리고 대사만 읽었을 때 누가 말하는지 알 수 있어야
- 못 알 수 있으면 = 모든 캐릭터가 같은 톤으로 말하는 것 = 실패

**2. 차별화 축 (이 5가지로 구분)**
- **세대 어휘**: 10대(은어/줄임말/이모지 어투) / 20대(트렌드) / 30~40대(직장인 톤) / 50+대(완성된 어법) / 60+대(사자성어/옛 표현)
- **출신 사투리**: 서울(표준) / 부산·경남(억양) / 광주·전라(어미 변화) / 대구·경북(특유 어휘) / 제주(독특 어미). 무리하게 X, 자연스럽게 1~2개 단어/어미만
- **직업 어휘**: 의사("바이탈"·"오더"·"콜") / 형사("진술"·"동선"·"용의자") / 교사("수행평가"·"종례") / 사장("매출"·"단가"·"돌리다") / 작가("탈고"·"마감") — 이 캐릭터 직업의 일상어를 1~2번 자연스럽게
- **성격·교육 수준**: 학력 높은 사람(완성된 문장) / 거친 사람(짧고 끊어짐) / 내향(말끝 흐림) / 외향(질문/추임새)
- **감정 상태**: 분노 → 짧고 단절 / 슬픔 → 길고 끊어짐 / 기쁨 → 빠르고 가볍게 / 충격 → "..." 또는 단답

**3. 캐릭터별 비유 체계 (★ 한국 작가 노하우)**
- 주조연마다 직업/취미 기반 고유 비유 1세트 부여
- 예: 야구 코치 출신 → "그 공은 던지지 마", "1루 보내고 가자" / 커피 마니아 → "이 사람은 산미가 강해" / 외과의 → "여기 절개해야 돼"
- 격언체 대사를 그 캐릭터의 비유로 교체

**4. 말버릇·입버릇 (캐릭터마다 1~2개)**
- 매 등장 시 그 캐릭터만 쓰는 표현 박을 것
- 예: "..그렇다 치고", "내 말이", "아니 진짜로", "(혼잣말처럼) 거 참...", "음...", "어쩐지"
- 작품 전체에서 일관성

**5. 대사 형식 룰**
- **숫자 = 한글** — "이십 년", "스물여덟" / "20년", "28" X
- **불완전한 문장 OK** — "...있었어, 그때." / "그게... 그러니까..." 말줄임·도치
- **호칭** — "당신" 남발 X. "오빠/언니/형/누나/이름/직책/별명" 자연스럽게
- **서브텍스트** — 직설 X. "사랑해" → "오늘 늦게까지 있을 거예요?" / "괜찮아" → "(웃으며) 됐어, 그게 다야."
- **반응 대사** — 응? 어. 글쎄. 그래? 음. 같은 짧은 추임새로 호흡 만들기

**6. 대사 자가 검증 (출력 전)**
- [ ] 캐릭터명 가리기 테스트 통과
- [ ] 각 캐릭터마다 말버릇 1~2개 박혀있나
- [ ] 격언체·대구문 X
- [ ] 직업 어휘 1~2번 자연스럽게 노출
- [ ] 감정 상태별 호흡 차이 보이나

### 매체별 표준 양식
- 매체 출력 형식 정확히 준수 (위 가이드 기준)
- 표준 양식: ${genre.standard}
- 분량 표준: ${genre.pages}

### 자가 검증 (출력 전 마지막 체크)
1. 마크다운 (\`**\` \`##\` \`---\`) 한 글자도 없나?
2. 메타 정보(장르/분량/등급/시점) 본문에 안 박혔나?
3. "안녕하세요/Story Maker" 같은 인사 없나?
4. 캐릭터 이름 가리고 읽어도 누가 말하는지 알 수 있나?
5. 한 번에 끝까지 안 갔나? (5~10페이지에서 멈춤)
6. AI 티 단어 0%인가?

이 6가지 다 통과해야 프로 작가 수준. 하나라도 실패면 다시 써라.
`;
}


const ARTIFACT_NAMES: Record<string, string> = {
  treatment:  "트리트먼트 (5~7p · 줄거리 산문체)",
  synopsis:   "시놉시스 (1~2p)",
  character:  "캐릭터 시트 (3~6명)",
  structure:  "구성안 (회차별·막별)",
  scene:      "씬 리스트 (씬 헤딩 + 한 줄 요약)",
  pitch:      "피치덱 (10~15장)",
  intent:     "기획 의도서 — 정부 지원사업용 (왜 이 작품인가, 사회적 의의, 작가 동기)",
  production: "제작 계획 — 정부 지원사업용 (일정·인력·예산·로케이션·장비)",
  bio:        "제출자 이력 — 정부 지원사업용 (작가 소개·대표 작품·수상 경력)",
  impact:     "예상 효과 — 정부 지원사업용 (관객 규모·시장 효과·문화적 의의·교육·산업 파급)",
};

const SUPPORT_ARTIFACTS = ["intent", "production", "bio", "impact"];

export function buildFullPackagePrompt(idea: string, genre: Genre, userInput: Record<string, string>, artifactKeys: string[]): string {
  const artifactList = artifactKeys.map(k => `- **${ARTIFACT_NAMES[k] || k}**`).join("\n");
  const hasSupportArtifacts = artifactKeys.some(k => SUPPORT_ARTIFACTS.includes(k));

  return `# 작업 요청: 기획 패키지${hasSupportArtifacts ? " (정부 지원사업 신청서 포함)" : ""}

${commonBrief(idea, genre, userInput)}

## 만들 산출물 (${artifactKeys.length}종)
${artifactList}

## 출력 룰
- 각 산출물마다 \`## ${"${산출물 이름}"}\` 헤딩으로 구분
- 산출물별 표준 분량 준수 (위 괄호 안 분량)
- ${hasSupportArtifacts ? "**정부 지원사업 신청서 항목** (기획 의도서 / 제작 계획 / 제출자 이력 / 예상 효과)은 한국 콘진원·영진위·문진원 표준 양식 톤으로. 단정·공식적·정량 데이터 포함." : ""}
- 매체에 안 맞는 산출물 (예: 영화의 회차 구성표) 있으면 그 산출물 헤딩 아래에 "이 매체에는 권장하지 않습니다 (이유)" 한 줄로 안내
- 인사·자기소개·다음 단계 안내 X — 곧바로 산출물부터
- 마크다운 표(${"|"} ${"|"} ${"|"})는 활용 OK (피치덱/구성안/씬 리스트 등)

각 산출물의 quality는 작가가 그대로 제출 가능한 수준으로.
`;
}


export function buildOsmuPrompt(idea: string, sourceIp = ""): string {
  const ipPart = sourceIp ? `\n## 원본 IP\n${sourceIp}\n` : "";

  return `# 작업 요청: OSMU 매트릭스 (12개 매체 적합도 분석)

## 핵심 아이디어
${idea}
${ipPart}

---

## ★ 출력 양식 (반드시 이 순서·구조로)

### 1. 한눈에 보기 — 매트릭스 점수표
가장 먼저 다음 표를 출력 (작가가 한 화면에 적합도 비교):

| # | 매체 | 적합도 | 핵심 한 줄 (왜 이 점수) |
|---|------|--------|----------------------|
| 1 | A. TV 드라마 | 95 | … |
| 2 | B. 영화 | 78 | … |
| 3 | C. 숏드라마 | 88 | … |
| 4 | D. 극장 애니 | … | … |
| 5 | E. 애니 시리즈 | … | … |
| 6 | F. 웹툰 | … | … |
| 7 | G. 다큐멘터리 | … | … |
| 8 | H. 웹소설 | … | … |
| 9 | I. 뮤지컬 | … | … |
| 10 | J. 유튜브 | … | … |
| 11 | K. 전시·체험 | … | … |
| 12 | L. 게임 | … | … |
| 13 | M. 예능 | … | … |

### 2. OSMU 전개 우선순위 (Top 3 추천)
점수 높은 매체 중 작가에게 권장하는 순서로 3개:
1. **(매체)** — 왜 이게 1번인지 (1~2줄)
2. **(매체)** — 왜 2번
3. **(매체)** — 왜 3번

### 3. 매체별 자세한 분석 (각 매체 1단락씩, 총 12개)
점수 높은 순서로 정렬해 다음 형식:

\`\`\`
## 🎯 [점수] N위 — [매체 letter]. [매체 이름]
- **차별 매력**: (이 매체에서만 살아나는 강점 1~2문장)
- **시점/시간축/깊이**: (어떻게 풀어가야 하는지)
- **로그라인**: (이 매체용으로 변환된 한 줄)
- **변환 메모**: (원작에서 무엇을 유지/변경/추가)
\`\`\`

→ 12개 매체 모두 위 형식으로.

---

## 룰 (★ 절대 준수)
- 매트릭스 점수표가 **가장 먼저** 나와야 한다 (작가가 한 화면에 본다)
- 미디어별 다른 매력 분배 (영화=절제, 드라마=관계, 웹소설=내면, 게임=인터랙티브, 전시=공간, 다큐=실재성, 예능=캐릭터 케미)
- 단순 변환 X — 각 매체 고유 강점 살리기
- 한 IP 통일성 유지 (캐릭터/세계관 일관)
- 인사·자기소개·서두 X — 곧바로 점수표부터
`;
}
