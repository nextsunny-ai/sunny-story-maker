// V3.0 본문 변환 함수 — Para[] ↔ Block[] · Block[] ↔ 평탄 텍스트 · 평탄 텍스트 → Block[]
// 단계 0 = 스텁(PROSE 그룹은 완전 동작, 나머지는 PROSE 폴백). 단계 1~6에서 그룹별 정밀 파서 점진 추가.

import type { Block, MediumGroup, WriteDoc } from "./write-doc";
import { groupOf, CUE_COLUMNS } from "./write-doc";

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

  //   ★ 쓰는 중에는 파싱하지 않는다 (실측 2026-08-28).
  //   시나리오·웹툰은 단락을 합쳐 다시 파싱해 블록을 만드는데,
  //   스트리밍 중에는 문장이 잘려 있어("S#1. 영안실 / 오") 파서가 제대로 못 만든다.
  //   그래서 화면이 빈 채로 남았고, 작가는 새로고침해야 자기 글을 볼 수 있었다.
  //   기다리는 3분이 견딜 만한지는 글이 흐르는지에 달렸다 — 쓰는 동안은 그대로 보여준다.
  //   다 쓰고 나면(streaming 이 없어지면) 아래 파서가 제대로 정리한다.
  const isWriting = paras.some((p) => p.status === "streaming");
  if (isWriting) {
    return {
      v: 3,
      group,
      letter,
      blocks: paras.map((p) => ({
        id: p.id,
        kind: "prose" as const,
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
  // ★ V3.1 B1 — CUESHEET 그룹 = cueColumns 자동 박힘 (= round-trip 보존)
  const cueColumns = group === "CUESHEET" ? (CUE_COLUMNS[letter] || CUE_COLUMNS.M) : undefined;
  return {
    v: 3,
    group,
    letter,
    ...(cueColumns ? { cueColumns } : {}),
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
  const parts: string[] = [];

  // ★ V3.1 B1 — CUESHEET = 표 헤더 row 먼저 (round-trip 보존)
  if (doc.group === "CUESHEET" && doc.cueColumns && doc.cueColumns.length > 0) {
    const headers = ["시간", ...doc.cueColumns.map(c => c.label)];
    parts.push(`| ${headers.join(" | ")} |`);
    parts.push(`|${headers.map(() => "---").join("|")}|`);
  }

  for (const b of doc.blocks) {
    const t = blockToText(b, doc);
    if (t && t.trim()) parts.push(t);
  }
  return parts.join("\n");
}

function blockToText(b: Block, doc?: WriteDoc): string {
  switch (b.kind) {
    case "prose":
      return b.text || "";

    case "header": {
      const num = b.number ? `${b.number}. ` : "";
      const prefix = b.level === "episode" ? `# ${num}` : b.level === "chapter" ? `## ${num}` : `### ${num}`;
      return `${prefix}${b.title}`;
    }

    case "scene-heading": {
      // ★ V3.1 B1 — S#1. (점 박힘 = round-trip 보존)
      const ie = b.intExt ? `${b.intExt}. ` : "";
      const sn = b.sceneNo ? `S#${b.sceneNo}. ` : "";
      const place = b.place || "";
      const time = b.time ? ` / ${b.time}` : "";
      return `${sn}${ie}${place}${time}`.trim();
    }

    case "action":
      return b.text || "";

    case "dialogue": {
      // ★ V3.1 B1 — 한국 시나리오 표준 "캐릭터: 대사" (= round-trip 1줄 보존)
      const ch = b.character + (b.effect ? " (E)" : "");
      const paren = b.parenthetical ? ` (${b.parenthetical})` : "";
      return `${ch}${paren}: ${b.text}`;
    }

    case "music-number": {
      const no = b.numberNo ? `♪ #${b.numberNo} ` : "♪ ";
      return `${no}${b.numberTitle}\n${b.lyrics}`;
    }

    case "cue-row": {
      // ★ V3.1 B1 — doc.cueColumns 순서대로 cells 박음 (= round-trip 보존)
      if (doc?.cueColumns) {
        const ordered = doc.cueColumns.map(c => b.cells[c.key] || "");
        return `| ${b.timecode} | ${ordered.join(" | ")} |`;
      }
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
  if (group === "PANEL") {
    return parsePanelCuts(text);
  }
  if (group === "CUESHEET") {
    return parseCuesheet(text, _letter);
  }
  if (group === "STRUCTURED") {
    return _letter === "K" ? parseExhibition(text) : parseGameLines(text);
  }
  if (group === "PROSE") {
    return splitProseBlocks(text);
  }
  return splitProseBlocks(text);
}

// ─── K 전시 파서 (V3.0 단계 6) ───
function parseExhibition(text: string): Block[] {
  const blocks: Block[] = [];
  let seq = 0;
  const nextId = () => `b_${Date.now()}_${seq++}`;

  // [존N] / Zone N / 존 N / ### 존N. 부제 / ## 존 N. 부제 단위로 분리 (★ V3.1 B6)
  const RE_ZONE = /\[\s*존\s*(\d+)\s*\]|^#{1,3}\s*존\s*(\d+)\s*[\.:]?\s*(.*)$|^Zone\s+(\d+)\s*[:.]|^존\s+(\d+)\s*[:.]/gm;
  const zoneMarkers: Array<{ no: number; start: number; headEnd: number; markerName?: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = RE_ZONE.exec(text)) !== null) {
    const no = parseInt(m[1] || m[2] || m[4] || m[5], 10);
    const markerName = (m[3] || "").trim() || undefined;  // ### 존N. <부제> = 마커에서 zoneName 직접
    if (!isNaN(no)) zoneMarkers.push({ no, start: m.index, headEnd: m.index + m[0].length, markerName });
  }
  if (zoneMarkers.length === 0) {
    return splitProseBlocks(text);
  }
  // 첫 마커 이전 = prose 폴백
  if (zoneMarkers[0].start > 0) {
    const head = text.slice(0, zoneMarkers[0].start).trim();
    if (head) head.split(/\n\s*\n+/).map(t => t.trim()).filter(Boolean).forEach((t) => {
      blocks.push({ id: nextId(), kind: "prose", text: t, status: "done" });
    });
  }
  for (let i = 0; i < zoneMarkers.length; i++) {
    const cur = zoneMarkers[i];
    const next = zoneMarkers[i + 1];
    const body = text.slice(cur.headEnd, next ? next.start : text.length).trim();
    const lines = body.split("\n").map(l => l.trim());

    let zoneName = "";
    let area: string | undefined;
    let flow: string | undefined;
    let objects: string | undefined;
    let interactive: string | undefined;
    let docent: string | undefined;

    // 마커에서 직접 추출된 zoneName 우선 (= "### 존1. 시작의 방" 같은 case)
    if (cur.markerName) zoneName = cur.markerName;

    // ★ 불릿(-, *, •) prefix 제거 후 매칭 (작가가 "- 면적: ..." 같이 쓰는 일이 많음)
    for (const rawLine of lines) {
      if (!rawLine) continue;
      const line = rawLine.replace(/^[-*•]\s+/, "");
      // ★ V3.1 B1+B6 보강 — 작가가 쓰는 다양한 키워드 다 인식
      const am = line.match(/^(?:면적|공간|규모|크기|Area|Space|Size)\s*[:：]\s*(.+)$/i);
      const fm = line.match(/^(?:동선|흐름|루트|경로|Flow|Route|Path)\s*[:：]\s*(.+)$/i);
      const om = line.match(/^(?:오브제|작품|전시물|구조물|Objects?|Items?|Exhibits?)\s*[:：]\s*(.+)$/i);
      const im = line.match(/^(?:인터랙티브|체험|상호작용|Interactive|Experience)\s*[:：]\s*(.+)$/i);
      const dm = line.match(/^(?:도슨트|해설|설명|음성안내|Docent|Narration|Guide)\s*[:：]\s*(.+)$/i);
      // ★ V3.1 B6 추가 — 체류·컨셉·테마·굿즈·평면도
      const sm = line.match(/^(?:체류|체류시간|체류 시간|Stay|Duration|Visit)\s*[:：]\s*(.+)$/i);
      const cm = line.match(/^(?:컨셉|테마|콘셉트|Concept|Theme)\s*[:：]\s*(.+)$/i);
      const gm = line.match(/^(?:굿즈|상품|머천다이즈|Goods?|Merch)\s*[:：]\s*(.+)$/i);
      const mm = line.match(/^(?:평면도|도면|배치도|Floor|Map|Layout)\s*[:：]\s*(.+)$/i);
      if (am) area = (area ? `${area}; ${am[1]}` : am[1]);
      else if (sm) area = (area ? `${area}; 체류 ${sm[1]}` : `체류 ${sm[1]}`);
      else if (cm) area = (area ? `${area}; 컨셉 ${cm[1]}` : `컨셉 ${cm[1]}`);
      else if (mm) area = (area ? `${area}; 평면도 ${mm[1]}` : `평면도 ${mm[1]}`);
      else if (fm) flow = fm[1];
      else if (om) objects = (objects ? `${objects}; ${om[1]}` : om[1]);
      else if (gm) objects = (objects ? `${objects}; 굿즈 ${gm[1]}` : `굿즈 ${gm[1]}`);
      else if (im) interactive = im[1];
      else if (dm) docent = (docent ? `${docent}\n${dm[1]}` : dm[1]);
      else if (!zoneName) zoneName = line;
    }

    blocks.push({
      id: nextId(), kind: "zone",
      zoneNo: cur.no,
      zoneName: zoneName || `존 ${cur.no}`,
      area, flow, objects, interactive, docent,
      status: "done",
    });
  }
  return blocks;
}

// ─── L 게임 파서 (V3.0 단계 6) ───
function parseGameLines(text: string): Block[] {
  const blocks: Block[] = [];
  let seq = 0;
  const nextId = () => `b_${Date.now()}_${seq++}`;

  const lines = text.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // markdown 표 행: | id | char | text | cond | next | aff |
    if (/^\|.*\|$/.test(line)) {
      const cells = line.slice(1, -1).split("|").map(s => s.trim());
      if (cells.length >= 3 && cells[0] && !/^[-:\s]+$/.test(cells[0]) && cells[0].toUpperCase() !== "ID") {
        blocks.push({
          id: nextId(), kind: "game-line",
          lineId: cells[0],
          character: cells[1] || "",
          text: cells[2] || "",
          condition: cells[3] || undefined,
          nextId: cells[4] || undefined,
          affinity: cells[5] || undefined,
          status: "done",
        });
        continue;
      }
    }

    // 그 외 = prose 폴백
    blocks.push({ id: nextId(), kind: "prose", text: line, status: "done" });
  }
  return blocks;
}

// ─── PANEL 파서 (V3.0 단계 3 — 웹툰 [컷N]) ───
function parsePanelCuts(text: string): Block[] {
  const blocks: Block[] = [];
  let blockSeq = 0;
  const nextId = () => `b_${Date.now()}_${blockSeq++}`;

  // [컷N] ... [컷N+1] ... 단위로 분리. 시작점이 [컷N] 아니면 prose 폴백.
  const RE_CUT = /\[\s*컷\s*(\d+)\s*\]/g;
  const cutMatches: Array<{ no: number; start: number; headEnd: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = RE_CUT.exec(text)) !== null) {
    cutMatches.push({ no: parseInt(m[1], 10), start: m.index, headEnd: m.index + m[0].length });
  }

  if (cutMatches.length === 0) {
    // 컷 마커 없음 = 폴백 (텍스트 손실 0)
    return splitProseBlocks(text);
  }

  // 첫 컷 이전 텍스트 = 폴백 prose
  if (cutMatches[0].start > 0) {
    const head = text.slice(0, cutMatches[0].start).trim();
    if (head) {
      head.split(/\n\s*\n+/).map(t => t.trim()).filter(Boolean).forEach((t) => {
        blocks.push({ id: nextId(), kind: "prose", text: t, status: "done" });
      });
    }
  }

  for (let i = 0; i < cutMatches.length; i++) {
    const cur = cutMatches[i];
    const next = cutMatches[i + 1];
    const body = text.slice(cur.headEnd, next ? next.start : text.length).trim();

    // 첫 줄 = 그림 묘사. 그 다음 라벨이 있는 줄 = 대사·SFX·N
    const lines = body.split("\n").map(l => l.trim());
    let visual = "";
    let dialogue: string | undefined;
    let sfx: string | undefined;
    let narration: string | undefined;

    const visualLines: string[] = [];
    let stillVisual = true;
    for (const line of lines) {
      if (!line) {
        if (visualLines.length > 0) stillVisual = false;
        continue;
      }
      const dm = line.match(/^(대사|D|Dialogue)\s*[:：]\s*(.+)$/i);
      const sm = line.match(/^(SFX|효과음|음향)\s*[:：]\s*(.+)$/i);
      const nm = line.match(/^(N|나레이션|Narration)\s*[:：]\s*(.+)$/i);
      if (dm) { dialogue = (dialogue ? dialogue + "\n" : "") + dm[2]; stillVisual = false; continue; }
      if (sm) { sfx = (sfx ? sfx + " " : "") + sm[2]; stillVisual = false; continue; }
      if (nm) { narration = (narration ? narration + "\n" : "") + nm[2]; stillVisual = false; continue; }
      if (stillVisual) visualLines.push(line);
      else {
        // 라벨 없는 추가 줄 = 직전 항목에 이어붙이거나 visual에
        if (dialogue !== undefined) dialogue += "\n" + line;
        else if (narration !== undefined) narration += "\n" + line;
        else visualLines.push(line);
      }
    }
    visual = visualLines.join(" ").trim() || "(그림 묘사 없음)";

    blocks.push({
      id: nextId(), kind: "cut",
      cutNo: cur.no,
      visual, dialogue, sfx, narration,
      status: "done",
    });
  }

  return blocks;
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

// ─── CUESHEET 파서 (V3.0 단계 4 — markdown 표 행 추출) ───
function parseCuesheet(text: string, letter?: string): Block[] {
  const blocks: Block[] = [];
  let seq = 0;
  const nextId = () => `b_${Date.now()}_${seq++}`;
  const columns = (letter && CUE_COLUMNS[letter]) || CUE_COLUMNS.M;

  const lines = text.split("\n");
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { inTable = false; continue; }

    // markdown 표 행: | a | b | c | (cell이 2개 이상)
    if (/^\|.*\|$/.test(line) && (line.match(/\|/g)?.length || 0) >= 3) {
      // separator line (--- | --- | ---) = skip + 표 시작 신호
      if (/^[\s|:\-]+$/.test(line)) { inTable = true; continue; }

      const cells = line.slice(1, -1).split("|").map((s) => s.trim());

      // 헤더 행 (첫 표 행 + cells가 columns header와 매칭) = skip
      if (!inTable) {
        const looksLikeHeader = cells.length >= 2 && (cells[0].includes("시간") || /^time/i.test(cells[0]));
        if (looksLikeHeader) { inTable = true; continue; }
      }
      inTable = true;

      const timecode = cells[0] || "";
      const cellMap: Record<string, string> = {};
      columns.forEach((c, idx) => { cellMap[c.key] = cells[idx + 1] || ""; });

      blocks.push({
        id: nextId(), kind: "cue-row",
        timecode, cells: cellMap,
        status: "done",
      });
      continue;
    }

    // 표가 아닌 텍스트 = prose 폴백 (G 다큐 구성안형 등)
    blocks.push({
      id: nextId(), kind: "prose",
      text: line, status: "done",
    });
    inTable = false;
  }

  return blocks;
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
