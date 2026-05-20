// V3.0 본문 변환 함수 — Para[] ↔ Block[] · Block[] ↔ 평탄 텍스트 · 평탄 텍스트 → Block[]
// 단계 0 = 스텁(PROSE 그룹은 완전 동작, 나머지는 PROSE 폴백). 단계 1~6에서 그룹별 정밀 파서 점진 추가.

import type { Block, MediumGroup, WriteDoc } from "./write-doc";
import { groupOf } from "./write-doc";

// V2.14 Para 구조 (마이그레이션 input). WriteCanvas.tsx의 Para와 동형.
interface ParaLike {
  id: string;
  n?: number;
  label?: string;
  text: string;
  status: "done" | "streaming" | "pending";
  streamTarget?: string;
  notes?: string;
}

// ─── Para[] → WriteDoc (마이그레이션 무손실 보증) ───
export function migrateParasToDoc(paras: ParaLike[], letter: string): WriteDoc {
  const group = groupOf(letter);

  // PROSE 그룹 = Para와 동형. 1:1 무손실.
  if (group === "PROSE") {
    return {
      v: 3,
      group,
      letter,
      blocks: paras.map((p) => ({
        id: p.id,
        kind: "prose",
        text: p.text,
        label: p.label,
        status: p.status,
        notes: p.notes,
      })),
    };
  }

  // 그 외 그룹 = 평탄화 후 그룹 파서 재파싱 (파싱 실패 시 ProseBlock fallback = 텍스트 손실 0)
  const flattened = paras
    .filter((p) => p.text && p.text.trim())
    .map((p) => p.text)
    .join("\n\n");
  const blocks = plainTextToBlocks(group, flattened, letter);
  return {
    v: 3,
    group,
    letter,
    blocks: blocks.length > 0 ? blocks : paras.map((p) => ({
      id: p.id,
      kind: "prose" as const,
      text: p.text,
      label: p.label,
      status: p.status,
      notes: p.notes,
    })),
  };
}

// ─── Block[] → 평탄 텍스트 (export·AI 호출·매체 변경 공용) ───
export function blocksToPlainText(doc: WriteDoc): string {
  return doc.blocks
    .map((b) => blockToText(b))
    .filter((t) => t && t.trim())
    .join("\n\n");
}

function blockToText(b: Block): string {
  switch (b.kind) {
    case "prose":
      return b.text || "";

    case "header": {
      const num = b.number ? `${b.number}. ` : "";
      const prefix = b.level === "episode" ? `# ${num}` : b.level === "chapter" ? `## ${num}` : `### ${num}`;
      return `${prefix}${b.title}`;
    }

    case "scene-heading": {
      const ie = b.intExt ? `${b.intExt}. ` : "";
      const sn = b.sceneNo ? `S#${b.sceneNo} ` : "";
      const place = b.place || "";
      const time = b.time ? ` - ${b.time}` : "";
      return `${sn}${ie}${place}${time}`.trim();
    }

    case "action":
      return b.text || "";

    case "dialogue": {
      const ch = b.character + (b.effect ? " (E)" : "");
      const paren = b.parenthetical ? `\n(${b.parenthetical})` : "";
      return `${ch}${paren}\n${b.text}`;
    }

    case "music-number": {
      const no = b.numberNo ? `♪ #${b.numberNo} ` : "♪ ";
      return `${no}${b.numberTitle}\n${b.lyrics}`;
    }

    case "cue-row": {
      const cells = Object.values(b.cells).filter(Boolean).join(" | ");
      return `| ${b.timecode} | ${cells} |`;
    }

    case "cut": {
      const lines = [`[컷${b.cutNo}] ${b.visual}`];
      if (b.dialogue) lines.push(`대사: ${b.dialogue}`);
      if (b.sfx) lines.push(`SFX: ${b.sfx}`);
      if (b.narration) lines.push(`N: ${b.narration}`);
      return lines.join("\n");
    }

    case "game-line": {
      const parts = [b.lineId, b.character, b.text];
      if (b.condition) parts.push(b.condition);
      if (b.nextId) parts.push(`→${b.nextId}`);
      if (b.affinity) parts.push(b.affinity);
      return `| ${parts.join(" | ")} |`;
    }

    case "zone": {
      const lines = [`[존${b.zoneNo}] ${b.zoneName}`];
      if (b.area) lines.push(`면적: ${b.area}`);
      if (b.flow) lines.push(`동선: ${b.flow}`);
      if (b.objects) lines.push(`오브제: ${b.objects}`);
      if (b.interactive) lines.push(`인터랙티브: ${b.interactive}`);
      if (b.docent) lines.push(`도슨트: ${b.docent}`);
      return lines.join("\n");
    }

    default:
      // exhaustive check — TS가 모든 kind 처리됐는지 확인
      return "";
  }
}

// ─── 평탄 텍스트 → Block[] (그룹별 파싱) ───
// 단계 0 = 모든 그룹 PROSE 폴백 (빈 줄 split). 단계 1~6에서 그룹별 정밀 파서 점진 추가.
export function plainTextToBlocks(group: MediumGroup, text: string, _letter?: string): Block[] {
  if (!text || !text.trim()) return [];

  // 단계 1+: PROSE는 빈 줄 단락 split이 정공법
  if (group === "PROSE") {
    return splitProseBlocks(text);
  }

  // 단계 2~6에서 그룹별 정밀 파서를 여기 추가 예정.
  // 현재(단계 0) = 모든 그룹 PROSE 폴백 (텍스트 손실 0, 단 그룹별 정밀 양식은 미적용).
  return splitProseBlocks(text);
}

function splitProseBlocks(text: string): Block[] {
  return text
    .split(/\n\s*\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => ({
      id: `b_${Date.now()}_${i}`,
      kind: "prose" as const,
      text: t,
      status: "done" as const,
    }));
}

// ─── 매체 변경 시 데이터 보존 (블록 평탄화 → 새 그룹 파서) ───
export function changeMedium(doc: WriteDoc, newLetter: string): WriteDoc {
  const newGroup = groupOf(newLetter);
  if (newGroup === doc.group) {
    return { ...doc, letter: newLetter };
  }
  const text = blocksToPlainText(doc);
  return {
    v: 3,
    group: newGroup,
    letter: newLetter,
    blocks: plainTextToBlocks(newGroup, text, newLetter),
  };
}
