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
// 단계 1 = PROSE. 단계 2 = SCREENPLAY+STAGE. 그 외 그룹 PROSE 폴백 (단계 3~6에서 점진 추가).
export function plainTextToBlocks(group: MediumGroup, text: string, _letter?: string): Block[] {
  if (!text || !text.trim()) return [];

  if (group === "SCREENPLAY" || group === "STAGE") {
    return parseScreenplay(text, group === "STAGE");
  }
  if (group === "PROSE") {
    return splitProseBlocks(text);
  }
  return splitProseBlocks(text);
}

// ─── SCREENPLAY + STAGE 파서 (V3.0 단계 2) ───
// 라인 단위로 분석 + 정규식 매칭. 매칭 실패한 줄은 ActionBlock 폴백 (텍스트 손실 0).
function parseScreenplay(text: string, stage: boolean): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  let i = 0;
  let blockSeq = 0;
  const nextId = () => `b_${Date.now()}_${blockSeq++}`;

  // 정규식 — 한국 + 영어 시나리오 표준
  const RE_SCENE = /^\s*(?:#+\s*)?(?:S#\s*(\d+)|씬\s*(\d+)|장면\s*(\d+))[\.\s:]*\s*(.*)$/i;
  const RE_INTEXT = /^\s*(?:#+\s*)?(INT|EXT|INT\/EXT|실내|실외)[\.:\s]+(.+?)(?:[-—]\s*(.+))?$/i;
  const RE_HEADING_MIX = /^\s*(?:#+\s*)?(?:S#\s*(\d+))[\s\.]*\s*(INT|EXT)[\.:\s]+(.+?)(?:[-—]\s*(.+))?$/i;
  const RE_FADE = /^\s*(?:FADE\s*(?:IN|OUT)|페이드\s*(?:인|아웃)).*$/i;
  const RE_MUSIC = /^\s*♪\s*(?:#?(\d+))?\s*[.\s]*\s*(.+)$/;
  const RE_ACT = /^\s*(?:제)?\s*(\d+)\s*막(?:\s*[:.\s]\s*(.+))?$/;
  const RE_SCENE_HEADER = /^\s*(?:제)?\s*(\d+)\s*장(?:\s*[:.\s]\s*(.+))?$/;
  const RE_DIALOGUE_COLON = /^\s*([가-힣A-Za-z][가-힣A-Za-z0-9·\s]{0,12})\s*:\s*(.+)$/;
  const RE_DIALOGUE_INDENT = /^\s{4,}([가-힣A-Za-z][가-힣A-Za-z0-9·\s]{0,12})\s*(?:\(([^)]+)\))?\s*$/;
  const RE_PAREN_LINE = /^\s*\(([^)]+)\)\s*$/;
  const RE_NARRATION_QUOTE = /^\s*["「『](.+)["」』]\s*$/;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) { i++; continue; }

    // 페이드인/아웃 = 단순 ActionBlock
    if (RE_FADE.test(line)) {
      blocks.push({ id: nextId(), kind: "action", text: line, status: "done" });
      i++; continue;
    }

    // STAGE: 막
    if (stage) {
      const m = line.match(RE_ACT);
      if (m) {
        blocks.push({
          id: nextId(), kind: "header", level: "act",
          number: m[1], title: m[2] || "", status: "done",
        });
        i++; continue;
      }
      const sm = line.match(RE_SCENE_HEADER);
      if (sm) {
        blocks.push({
          id: nextId(), kind: "header", level: "scene-group",
          number: sm[1], title: sm[2] || "", status: "done",
        });
        i++; continue;
      }
      // 뮤지컬 ♪넘버
      const mn = line.match(RE_MUSIC);
      if (mn) {
        const lyrics: string[] = [];
        i++;
        while (i < lines.length && lines[i].trim() && !RE_MUSIC.test(lines[i]) && !RE_SCENE.test(lines[i]) && !RE_INTEXT.test(lines[i])) {
          lyrics.push(lines[i]); i++;
        }
        blocks.push({
          id: nextId(), kind: "music-number",
          numberNo: mn[1], numberTitle: mn[2] || "",
          lyrics: lyrics.join("\n"),
          status: "done",
        });
        continue;
      }
    }

    // 씬 + INT/EXT 결합
    const hm = line.match(RE_HEADING_MIX);
    if (hm) {
      blocks.push({
        id: nextId(), kind: "scene-heading",
        sceneNo: hm[1],
        intExt: (hm[2].toUpperCase() as "INT" | "EXT"),
        place: hm[3], time: hm[4] || undefined,
        status: "done",
      });
      i++; continue;
    }
    // 씬 헤딩 단독
    const sm = line.match(RE_SCENE);
    if (sm) {
      const sceneNo = sm[1] || sm[2] || sm[3];
      const rest = (sm[4] || "").trim();
      // rest에 INT./EXT.가 있을 수도
      const ie = rest.match(/^(INT|EXT|INT\/EXT|실내|실외)[\.:\s]+(.+?)(?:[-—]\s*(.+))?$/i);
      if (ie) {
        blocks.push({
          id: nextId(), kind: "scene-heading", sceneNo,
          intExt: ie[1].toUpperCase().startsWith("INT") ? "INT" : ie[1].toUpperCase().startsWith("EXT") ? "EXT" : undefined,
          place: ie[2], time: ie[3] || undefined,
          status: "done",
        });
      } else {
        blocks.push({
          id: nextId(), kind: "scene-heading", sceneNo,
          place: rest || "장소", status: "done",
        });
      }
      i++; continue;
    }
    // INT/EXT 단독
    const ie = line.match(RE_INTEXT);
    if (ie) {
      blocks.push({
        id: nextId(), kind: "scene-heading",
        intExt: ie[1].toUpperCase().startsWith("INT") ? "INT" : "EXT",
        place: ie[2], time: ie[3] || undefined,
        status: "done",
      });
      i++; continue;
    }

    // 대사 — "캐릭터: 대사" 한 줄 형태
    const dc = line.match(RE_DIALOGUE_COLON);
    if (dc) {
      blocks.push({
        id: nextId(), kind: "dialogue",
        character: dc[1].trim(), text: dc[2].trim(),
        status: "done",
      });
      i++; continue;
    }

    // 대사 — 들여쓰기 캐릭터 + 다음 줄에 (지문)·대사
    const di = raw.match(RE_DIALOGUE_INDENT);
    if (di) {
      const character = di[1].trim();
      const effect = !!di[2] && /e/i.test(di[2]);
      let parenthetical: string | undefined;
      let dialogueLine = "";
      i++;
      // 다음 줄: (지문) 또는 대사
      if (i < lines.length) {
        const pm = lines[i].trim().match(RE_PAREN_LINE);
        if (pm) {
          parenthetical = pm[1];
          i++;
        }
      }
      if (i < lines.length && lines[i].trim()) {
        dialogueLine = lines[i].trim();
        i++;
      }
      blocks.push({
        id: nextId(), kind: "dialogue",
        character, parenthetical, text: dialogueLine, effect: effect || undefined,
        status: "done",
      });
      continue;
    }

    // 따옴표 한 줄 = 대사 (캐릭터 미상 — 직전 캐릭터 이어쓰기 또는 폴백)
    const nq = line.match(RE_NARRATION_QUOTE);
    if (nq) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "dialogue") {
        // 이어진 대사 — text에 줄바꿈 추가
        (last as { text: string }).text = last.text + "\n" + nq[1];
      } else {
        blocks.push({
          id: nextId(), kind: "dialogue",
          character: "", text: nq[1], status: "done",
        });
      }
      i++; continue;
    }

    // 그 외 = 지문(Action) 단락. 빈 줄 만날 때까지 모음
    const actionLines = [line];
    i++;
    while (i < lines.length && lines[i].trim()
      && !RE_SCENE.test(lines[i]) && !RE_INTEXT.test(lines[i]) && !RE_HEADING_MIX.test(lines[i])
      && !RE_DIALOGUE_COLON.test(lines[i]) && !RE_DIALOGUE_INDENT.test(lines[i])
      && !RE_FADE.test(lines[i]) && !RE_MUSIC.test(lines[i])
      && (!stage || (!RE_ACT.test(lines[i]) && !RE_SCENE_HEADER.test(lines[i])))) {
      actionLines.push(lines[i].trim());
      i++;
    }
    blocks.push({
      id: nextId(), kind: "action",
      text: actionLines.join(" "),
      status: "done",
    });
  }

  return blocks;
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
