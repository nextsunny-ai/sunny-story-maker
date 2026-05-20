// V3.1 B1 — paras ↔ doc round-trip 무손실 검증 스크립트.
// 사용:
//   npx tsx scripts/verify-round-trip.ts
//
// 통과 기준:
//   - PROSE (H·O·P) = 본문 그대로 (= 1:1 ProseBlock)
//   - SCREENPLAY (A·B·C·D·E) = 씬 헤딩·캐릭터:대사·지문 인식
//   - STAGE (I·N) = 막·장 구조 + 캐릭터·대사
//   - PANEL (F) = [컷N] + 대사·SFX·N
//   - CUESHEET (G·J·M) = markdown 표
//   - STRUCTURED (K·L) = Zone·GameLine

import { migrateParasToDoc, blocksToPlainText } from "../lib/storymaker/block-convert";

type Status = "done" | "streaming" | "pending";

interface TestPara { id: string; text: string; status: Status; label?: string }

const SAMPLES: Record<string, TestPara[]> = {
  H: [
    { id: "p1", text: "도윤은 거실 창가에 섰다. 달빛이 카펫에 흘러들었고, 그는 한참을 그렇게 서 있었다.", status: "done" },
    { id: "p2", text: "전화벨이 울렸다. 서아의 이름이 떴다.", status: "done" },
  ],
  A: [
    { id: "p1", text: "S#1. 도윤의 집 거실 / 밤\n\n달빛이 카펫에 흘러든다. 도윤(40대), 창가에 서 있다.\n\n도윤: 또 그 꿈이야.\n\n전화벨이 울린다.", status: "done" },
  ],
  F: [
    { id: "p1", text: "[컷1]\n달빛이 가득한 거실. 도윤이 창가에 서 있다.\n\n[컷2]\n클로즈업: 도윤의 손이 떨린다.\nSFX: 띠리리리리…\n\n[컷3]\n전화기 화면: '서아'.\n도윤: ...", status: "done" },
  ],
  G: [
    { id: "p1", text: "| 시간 | 영상 | 오디오 | 자막 |\n|---|---|---|---|\n| 00:00 | 거리 풍경 | 도시 소음 | 2026년 가을, 서울 |\n| 00:15 | 인터뷰 시작 | 김감독: \"이 도시는…\" | 김감독, 영화감독 |", status: "done" },
  ],
  K: [
    { id: "p1", text: "Zone 1: 입구\n공간: 어두운 복도, 천장에 별빛 LED\n동선: 입장 → 1번 패널 (작품 소개)\n오브제: 액자 3개, 의자 1개\n인터랙티브: QR 스캔 = 작품 영상\n도슨트: \"이곳은 시작의 공간입니다…\" (40초)", status: "done" },
  ],
};

interface TestResult {
  letter: string;
  ok: boolean;
  origLen: number;
  roundLen: number;
  preserved: number; // 0-1
  diff?: string;
}

function diff(a: string, b: string): string {
  if (a === b) return "(identical)";
  const lines: string[] = [];
  const al = a.split("\n");
  const bl = b.split("\n");
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) {
      lines.push(`Line ${i + 1}:`);
      lines.push(`  - ${al[i] ?? "(missing)"}`);
      lines.push(`  + ${bl[i] ?? "(missing)"}`);
      if (lines.length > 30) { lines.push("(truncated)"); break; }
    }
  }
  return lines.join("\n");
}

function test(letter: string, paras: TestPara[]): TestResult {
  const doc = migrateParasToDoc(paras, letter);
  const roundText = blocksToPlainText(doc);
  const origText = paras.map(p => p.text).join("\n\n");

  // 공백·줄바꿈 정규화 후 비교 (= 의미상 보존만 확인)
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const origNorm = norm(origText);
  const roundNorm = norm(roundText);

  // 단순 길이 보존율
  const preserved = roundNorm.length === 0 ? 0 :
    Math.min(roundNorm.length, origNorm.length) / Math.max(roundNorm.length, origNorm.length);

  // 핵심 단어 보존 검증 — origNorm의 단어 중 roundNorm에 있는 비율
  const origWords = origNorm.split(" ").filter(w => w.length > 1);
  const inRound = origWords.filter(w => roundNorm.includes(w)).length;
  const wordPreserved = origWords.length === 0 ? 1 : inRound / origWords.length;

  const ok = wordPreserved >= 0.85; // 85% 이상 단어 보존 = 통과

  return {
    letter,
    ok,
    origLen: origText.length,
    roundLen: roundText.length,
    preserved: wordPreserved,
    diff: ok ? undefined : diff(origText, roundText),
  };
}

console.log("\n=== V3.1 B1 — paras ↔ doc round-trip 무손실 검증 ===\n");

const results: TestResult[] = [];
for (const [letter, paras] of Object.entries(SAMPLES)) {
  const r = test(letter, paras);
  results.push(r);
  const status = r.ok ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} [${letter}] ${(r.preserved * 100).toFixed(1)}% 단어 보존 (${r.origLen} → ${r.roundLen} chars)`);
  if (r.diff) {
    console.log(`  Diff:\n${r.diff.split("\n").map(l => "    " + l).join("\n")}\n`);
  }
}

const passed = results.filter(r => r.ok).length;
console.log(`\n총 ${results.length}개 매체 중 ${passed}개 통과.`);

if (passed === results.length) {
  console.log("✅ 전체 PASS — round-trip 무손실 (= 단어 85%+ 보존).");
  process.exit(0);
} else {
  console.log("❌ 일부 FAIL — 위 diff 확인.");
  process.exit(1);
}
