// Markdown → 워드(.docx) / 텍스트(.txt) 변환 + 다운로드 헬퍼
// 한국 작가 표준 워드 포맷. AI 호출 X (클라이언트 변환만, 토큰 0).

import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
} from "docx";

// ─── V3.1 B2 — 한국 시나리오 표준 자동 감지·들여쓰기 ───
// 시나리오 매체 (TV/영화/숏드/애니/뮤지컬/연극) 본문이면 = 자동 한국 시나리오 표준 .docx 양식.
// 호출자 변경 0 = backwards compatible. 시나리오 패턴 (S#N. 또는 N. 장소 + 캐릭터<탭>대사) 발견 시 자동 진입.

type ScriptLineType = "scene" | "subscene" | "character_dialog" | "paren" | "cut" | "subtitle" | "action" | "blank";

interface ParsedScriptLine {
  type: ScriptLineType;
  text: string;
  character?: string;
  dialog?: string;
}

/** 본문 markdown에 시나리오 양식 패턴 있는지 자동 감지 */
function detectScriptFormat(md: string): boolean {
  const lines = md.split("\n");
  let sceneCount = 0;
  let dialogCount = 0;
  let cutCount = 0;
  for (const line of lines) {
    // 씬 헤딩: "S#1. 장소 (시간)"(들여쓰기 없음·신표준) 또는 "   1. 거리"(들여쓰기·구표준)
    if (/^\s*S#\s*\d+\.\s*\S/.test(line) || /^\s{2,}\d+\.\s*\S/.test(line)) sceneCount++;
    // 캐릭터 + 다중 공백 + 대사: "   진우         대사" (5+ 공백 = 시나리오 캐릭터 행)
    if (/^\s{2,}[가-힣A-Za-z][가-힣A-Za-z0-9 ]{0,15}(\s+E)?\s{4,}\S/.test(line)) dialogCount++;
    // CUT TO. or -CUT TO.
    if (/^-?\s*CUT\s*TO\./i.test(line.trim())) cutCount++;
  }
  // 씬 헤딩 ≥1 + 캐릭터 대사 ≥2 = 시나리오 본문 거의 확실
  return (sceneCount >= 1 && dialogCount >= 2) || cutCount >= 1;
}

/** 시나리오 본문 1줄 = 유형 자동 분류 */
function parseScriptLine(line: string): ParsedScriptLine {
  const trimmed = line.trim();
  if (!trimmed) return { type: "blank", text: "" };

  // CUT 전환
  if (/^-?\s*CUT\s*TO\./i.test(trimmed)) return { type: "cut", text: trimmed };

  // 자막 = "자막. ..."
  if (/^자막[\.\s]/.test(trimmed)) return { type: "subtitle", text: trimmed };

  // 씬 헤딩 = "1. 거리" 또는 "S#1. 장소" — 들여쓰기 + 숫자 + 점
  if (/^(S#)?\d+\.\s*\S/.test(trimmed)) return { type: "scene", text: trimmed };

  // 하위 씬 = "-옥상 / 새벽" (CUT 아님)
  if (/^-\S/.test(trimmed)) return { type: "subscene", text: trimmed };

  // 부연 단독 (괄호) = "(놀라며)" 또는 "(손가락질만)"
  if (/^\([^)]+\)\s*$/.test(trimmed)) return { type: "paren", text: trimmed };

  // 캐릭터 + 다중 공백(탭 환산) + 대사 (시나리오 표준)
  // 원본 line (들여쓰기 포함) 정규식 — "   진우         어, 지금 들어가는 중."
  const charDialog = /^\s+([가-힣A-Za-z][가-힣A-Za-z0-9 ]{0,15})(\s+E)?\s{4,}(.+)$/.exec(line);
  if (charDialog) {
    const char = charDialog[1].trim() + (charDialog[2] ? " E" : "");
    return { type: "character_dialog", text: trimmed, character: char, dialog: charDialog[3].trim() };
  }

  // 액션 라인 = 평문 = 왼쪽 끝
  return { type: "action", text: trimmed };
}

// ─── Markdown 인라인 (굵게/기울임) → docx TextRun[] ───
function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // **bold** + *italic* + 일반 텍스트 분할
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith("**") && p.endsWith("**")) {
      runs.push(new TextRun({ text: p.slice(2, -2), bold: true }));
    } else if (p.startsWith("*") && p.endsWith("*")) {
      runs.push(new TextRun({ text: p.slice(1, -1), italics: true }));
    } else {
      runs.push(new TextRun({ text: p }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text })];
}

// ─── Markdown 표 라인 → Table ───
function buildTable(lines: string[]): Table {
  const rows: TableRow[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // 구분선 (|---|---|) 제외
    if (/^\|[\s:|-]+\|$/.test(trimmed)) continue;
    const cells = trimmed
      .replace(/^\||\|$/g, "")
      .split("|")
      .map(c => c.trim());
    rows.push(new TableRow({
      children: cells.map(c => new TableCell({
        children: [new Paragraph({ children: parseInline(c) })],
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      })),
    }));
  }
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
    },
  });
}

/** ★ 표지 옵션 — 대표님 명시 2026-05-04: 외부 발송 가능 수준 */
export interface CoverOptions {
  /** 작가명 — 표지 하단에 박힘 */
  author?: string;
  /** 부제 / 매체 (예: "TV 미니시리즈 16부작") */
  subtitle?: string;
  /** 버전 (예: "v.07") */
  version?: string;
  /** 날짜 (YYMMDD or 직접 박은 형식) */
  date?: string;
  /** 저작권 표시 (= "© 작가명 2026" 자동 또는 직접) */
  copyright?: string;
}

// ─── Markdown 문자열 → docx Document ───
export function markdownToDocx(md: string, title: string, cover?: CoverOptions): Document {
  const lines = md.split("\n");
  const children: (Paragraph | Table)[] = [];

  // ★ 표지 페이지 (한국 시나리오 표준 — 김태훈 작가 「아이엠소리」 형식 참조)
  // 표지 = 별도 페이지 (= 본문 = 다음 페이지부터)

  // 작품명 = 가운데 = 매우 큼 = 위에서 약 1/3 지점
  children.push(new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 2400, after: 0 } })); // 위 빈 공간

  children.push(new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 56, font: "Pretendard" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // 부제 / 매체
  if (cover?.subtitle) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cover.subtitle, size: 22, color: "666666", font: "Pretendard" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));
  }

  // 버전
  if (cover?.version) {
    children.push(new Paragraph({
      children: [new TextRun({ text: cover.version, size: 18, color: "999999", font: "Pretendard" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }));
  }

  // 날짜
  if (cover?.date) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `(${cover.date})`, size: 16, color: "999999", font: "Pretendard" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }));
  }

  // 작가명 = 표지 하단 (= 표지 본문에서 약 60% 아래)
  if (cover?.author) {
    children.push(new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 2400, after: 0 } }));
    children.push(new Paragraph({
      children: [new TextRun({ text: cover.author, bold: true, size: 24, font: "Pretendard" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }));
  }

  // 저작권 = 표지 끝 (선택)
  if (cover?.copyright) {
    children.push(new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 800, after: 0 } }));
    children.push(new Paragraph({
      children: [new TextRun({ text: cover.copyright, size: 14, color: "888888", italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }));
  }

  // 표지 끝 = 페이지 break (다음 페이지부터 본문)
  children.push(new Paragraph({
    children: [new TextRun({ text: "" })],
    pageBreakBefore: true,
  }));

  // ★ V3.1 B2 — 한국 시나리오 표준 자동 감지·들여쓰기
  // 시나리오 본문 (TV·영화·숏드라마·애니·뮤지컬 등) = 자동 들여쓰기 양식.
  // 방송국·제작사·영진위 제출 가능 수준.
  const isScript = detectScriptFormat(md);

  let i = 0;
  let inCodeBlock = false;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ★ 시나리오 모드 분기 (V3.1 B2) — 한국 시나리오 표준 양식
    if (isScript) {
      const parsed = parseScriptLine(line);
      switch (parsed.type) {
        case "scene":
          // 씬 헤딩 = 굵게·들여쓰기·앞뒤 여백
          children.push(new Paragraph({
            children: [new TextRun({ text: parsed.text, bold: true, size: 22, font: "맑은 고딕" })],
            indent: { left: 360 },
            spacing: { before: 320, after: 160 },
            keepNext: true,
          }));
          break;
        case "subscene":
          // 하위 씬 (-옥상 / 새벽) = 굵게 + 살짝 여백
          children.push(new Paragraph({
            children: [new TextRun({ text: parsed.text, bold: true, size: 21, font: "맑은 고딕" })],
            spacing: { before: 160, after: 80 },
          }));
          break;
        case "cut":
          // CUT TO. = 굵게·왼쪽 끝·앞뒤 여백
          children.push(new Paragraph({
            children: [new TextRun({ text: parsed.text, bold: true, font: "맑은 고딕" })],
            spacing: { before: 160, after: 160 },
          }));
          break;
        case "subtitle":
          // 자막 = 가운데·이탤릭
          children.push(new Paragraph({
            children: [new TextRun({ text: parsed.text, italics: true, font: "맑은 고딕" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }));
          break;
        case "character_dialog":
          // 캐릭터 + 탭 + 대사 (= 한국 시나리오 표준 들여쓰기)
          // 캐릭터 = 들여쓰기 6공백 / 대사 시작 = 12공백 (탭으로 정렬)
          children.push(new Paragraph({
            children: [
              new TextRun({ text: parsed.character || "", bold: true, font: "맑은 고딕" }),
              new TextRun({ text: "\t" }),
              new TextRun({ text: parsed.dialog || "", font: "맑은 고딕" }),
            ],
            indent: { left: 1440, hanging: 720 },
            spacing: { after: 80 },
          }));
          break;
        case "paren":
          // 부연 (괄호) = 들여쓰기 깊게·이탤릭·연한 색
          children.push(new Paragraph({
            children: [new TextRun({ text: parsed.text, italics: true, color: "555555", font: "맑은 고딕" })],
            indent: { left: 1800 },
            spacing: { after: 60 },
          }));
          break;
        case "action":
          // 액션 라인 (지문) = 왼쪽 끝 평문
          children.push(new Paragraph({
            children: parseInline(parsed.text),
            spacing: { after: 100 },
          }));
          break;
        case "blank":
          // 빈 줄 = 단락 구분 (= skip = 다음 단락 = 자동 여백)
          break;
      }
      i++;
      continue;
    }

    // 코드 블록 (```) 무시 (그대로 출력)
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      i++;
      continue;
    }
    if (inCodeBlock) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line, font: "Consolas", size: 18 })],
        spacing: { after: 60 },
      }));
      i++;
      continue;
    }

    // 빈 줄 = 단락 구분
    if (!trimmed) {
      i++;
      continue;
    }

    // 헤딩 (# ## ###)
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const heading =
        level === 1 ? HeadingLevel.HEADING_1 :
        level === 2 ? HeadingLevel.HEADING_2 :
        level === 3 ? HeadingLevel.HEADING_3 :
        level === 4 ? HeadingLevel.HEADING_4 :
        HeadingLevel.HEADING_5;
      children.push(new Paragraph({
        children: parseInline(text),
        heading,
        spacing: { before: 240, after: 120 },
      }));
      i++;
      continue;
    }

    // 표 (|...|)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length > 0) {
        children.push(buildTable(tableLines));
        children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      }
      continue;
    }

    // 리스트 (- 또는 1.)
    const bulletMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    const numberMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (bulletMatch) {
      children.push(new Paragraph({
        children: parseInline(bulletMatch[1]),
        bullet: { level: 0 },
        spacing: { after: 60 },
      }));
      i++;
      continue;
    }
    if (numberMatch) {
      // numbering reference는 따로 정의 필요해서 docx 깨질 수 있음 — 그냥 텍스트 prefix로
      const numPrefix = trimmed.match(/^(\d+)\./)?.[1] ?? "";
      children.push(new Paragraph({
        children: [new TextRun({ text: `${numPrefix}. ` }), ...parseInline(numberMatch[1])],
        spacing: { after: 60 },
        indent: { left: 360 },
      }));
      i++;
      continue;
    }

    // 인용 (> )
    const quoteMatch = /^>\s+(.+)$/.exec(trimmed);
    if (quoteMatch) {
      children.push(new Paragraph({
        children: parseInline(quoteMatch[1]),
        indent: { left: 360 },
        spacing: { after: 60 },
      }));
      i++;
      continue;
    }

    // 구분선 (---)
    if (/^[-=*]{3,}$/.test(trimmed)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "─".repeat(40), color: "BBBBBB" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
      }));
      i++;
      continue;
    }

    // 일반 단락
    children.push(new Paragraph({
      children: parseInline(line),
      spacing: { after: 80 },
      style: "Normal",
    }));
    i++;
  }

  return new Document({
    creator: "Story Maker",
    title,
    description: "Story Maker — 프로페셔널 작가 에이전트",
    styles: {
      default: {
        document: {
          run: { font: "맑은 고딕", size: 22 }, // 11pt
          paragraph: { spacing: { line: 320 } }, // 1.4 line height
        },
      },
    },
    sections: [{
      properties: {},
      children,
    }],
  });
}

// ─── Markdown → 워드 다운로드 (브라우저) ───
export async function downloadDocx(md: string, filename: string, cover?: CoverOptions): Promise<void> {
  const title = filename.replace(/\.(docx|md|txt)$/i, "");
  // ★ cover 안 박혀있어도 = admin profile에서 자동 박음 (작가 이름·저작권)
  let coverFinal = cover;
  if (!coverFinal && typeof window !== "undefined") {
    try {
      const profileRaw = window.localStorage.getItem("sunny.admin.anon.profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        const author = (p.penName || p.name || "").trim();
        if (author) {
          const year = new Date().getFullYear();
          coverFinal = {
            author,
            copyright: `© ${author} ${year} — 무단 복제 금지`,
          };
        }
      }
    } catch { /* ignore */ }
  }
  const doc = markdownToDocx(md, title, coverFinal);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${title}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Markdown → 텍스트(.txt) 다운로드 ───
// markdown 마크 (# / ** / | 표) 자동 정리해서 깔끔한 일반 텍스트로
export function downloadTxt(md: string, filename: string): void {
  const title = filename.replace(/\.(docx|md|txt)$/i, "");
  const txt = mdToPlain(md);
  const blob = new Blob([`${title}\n${"=".repeat(title.length * 2)}\n\n${txt}`], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".txt") ? filename : `${title}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function mdToPlain(md: string): string {
  return md
    .replace(/^(#{1,6})\s+/gm, "")        // # 헤딩 마크 제거
    .replace(/\*\*([^*]+)\*\*/g, "$1")    // **bold** → 일반
    .replace(/\*([^*]+)\*/g, "$1")        // *italic* → 일반
    .replace(/`([^`]+)`/g, "$1")          // `code` → 일반
    .replace(/^>\s+/gm, "  ")             // > 인용 → 들여쓰기
    .replace(/^[-*]\s+/gm, "• ")          // - 불릿 → •
    .replace(/^\d+\.\s+/gm, (m) => m)     // 1. 숫자 리스트는 유지
    .replace(/^\|.+\|$/gm, (m) => {
      // 표 행 → 탭 구분
      const cells = m.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      if (cells.every(c => /^[\s:-]+$/.test(c))) return ""; // 구분선 제거
      return cells.join("\t");
    })
    .replace(/^[-=*]{3,}$/gm, "─".repeat(40)); // 구분선
}

// ─── V3.1 D4 — Fountain (시나리오 표준 plain text format) ───
// http://fountain.io — 평문이지만 변환기에 넣으면 표준 시나리오 양식 자동 생성.
// 룰:
//   - INT./EXT./EST. 시작 = scene heading (대문자)
//   - 캐릭터 이름 = 모두 대문자 + 그 다음 줄 = 대사
//   - (괄호) = 인물 지시
//   - >제목< = 센터
//   - !지문 = 강제 action

/**
 * 본문 markdown / 평문 → Fountain 변환 (best effort).
 * 한국어 시나리오 패턴 (S#1. / 캐릭터: 대사) → Fountain 표준.
 */
export function toFountain(md: string, title?: string): string {
  const lines = md.split("\n");
  const out: string[] = [];

  // 메타데이터 (= Title Page)
  if (title) {
    out.push(`Title: ${title}`);
    out.push(`Credit: Written by`);
    out.push(`Author: ${title}`);
    out.push(`Source: SUNNY Story Maker`);
    out.push("");
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) { out.push(""); continue; }

    // 마크다운 헤더 = Fountain section heading (`# ` → `# `)
    if (/^#{1,6}\s/.test(line)) { out.push(line); continue; }

    // S#1. 장소 - 시간 → INT./EXT. 형식 그대로 (Fountain은 INT./EXT./EST.로 시작하면 scene heading)
    const sceneKR = /^S#\d+/.exec(line);
    if (sceneKR) {
      // 한국어 씬 = scene heading 그대로 (Fountain은 .을 앞에 박으면 강제 scene)
      out.push("." + line);
      continue;
    }
    if (/^(INT\.|EXT\.|EST\.|INT\/EXT)/.test(line)) {
      out.push(line.toUpperCase());
      continue;
    }

    // 캐릭터: 대사 패턴
    const dialogMatch = /^([가-힣A-Za-z][가-힣A-Za-z0-9\s]{0,30}):\s*(.+)$/.exec(line);
    if (dialogMatch) {
      const charName = dialogMatch[1].trim().toUpperCase();
      const dialog = dialogMatch[2].trim();
      // 괄호 안 = 인물 지시
      out.push("");
      out.push(charName);
      out.push(dialog);
      continue;
    }

    // 일반 지문 = 그대로 (= action)
    out.push(line);
  }

  return out.join("\n");
}

/**
 * Fountain (.fountain) 다운로드
 */
export function downloadFountain(md: string, filename: string): void {
  const title = filename.replace(/\.(docx|md|txt|fountain|fdx|pdf)$/i, "");
  const fountain = toFountain(md, title);
  const blob = new Blob([fountain], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".fountain") ? filename : `${title}.fountain`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * PDF 다운로드 — markdownToDocx 결과를 docx → PDF 변환 X (= 클라이언트 무거움).
 * 대신 = 브라우저 print → "PDF로 저장" 흐름. (window.print + dedicated CSS)
 * 작가는 가장 익숙한 path = OS 기본 PDF 저장.
 */
export function downloadPdfViaPrint(md: string, filename: string): void {
  const title = filename.replace(/\.(docx|md|txt|pdf)$/i, "");
  const lines = md.split("\n").filter(l => l.trim() || true);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 25mm 20mm; }
    @media print {
      body { font-family: "맑은 고딕", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; font-size: 11pt; line-height: 1.6; color: #222; }
      h1 { font-size: 18pt; font-weight: 700; text-align: center; margin: 0 0 32px; page-break-after: avoid; }
      h2 { font-size: 14pt; font-weight: 700; margin: 24px 0 12px; page-break-after: avoid; }
      h3 { font-size: 12pt; font-weight: 600; margin: 18px 0 10px; }
      p { margin: 0 0 10px; orphans: 3; widows: 3; }
      .scene { font-weight: 700; margin-top: 18px; }
      .dialogue { padding-left: 80px; margin: 6px 0; }
      .character { padding-left: 140px; font-weight: 700; margin: 12px 0 2px; }
    }
    body { font-family: "맑은 고딕", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
    .print-hint { background: #fffbeb; border: 1px solid #fbbf24; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; color: #92400e; }
    @media print { .print-hint, .print-btn { display: none; } }
    .print-btn { padding: 8px 18px; background: #ff6b53; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="print-hint">
    💡 <strong>브라우저 인쇄 (Ctrl+P)</strong> → 대상: "PDF로 저장" 선택 → 저장하기.<br />
    또는 아래 버튼 → 같은 인쇄 화면 열림.
  </div>
  <button class="print-btn" onclick="window.print()">📄 PDF로 저장 (인쇄)</button>
  <h1>${title}</h1>
  ${lines.map(l => {
    const t = l.trim();
    if (!t) return "<p>&nbsp;</p>";
    const h3 = /^###\s+(.+)/.exec(t);
    const h2 = /^##\s+(.+)/.exec(t);
    if (h2) return `<h2>${h2[1]}</h2>`;
    if (h3) return `<h3>${h3[1]}</h3>`;
    if (/^S#\d+/.test(t)) return `<p class="scene">${escapeHtml(t)}</p>`;
    return `<p>${escapeHtml(t)}</p>`;
  }).join("\n  ")}
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("팝업이 차단됐습니다. 팝업 차단을 풀고 다시 시도하시거나 = .docx로 받아 워드에서 PDF 저장해주세요.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── 다운로드 옵션 묶음 ───
export type ExportFormat = "docx" | "txt" | "fountain" | "pdf";

export async function exportDocument(md: string, baseFilename: string, format: ExportFormat): Promise<void> {
  if (format === "docx") return downloadDocx(md, baseFilename);
  if (format === "fountain") return downloadFountain(md, baseFilename);
  if (format === "pdf") return downloadPdfViaPrint(md, baseFilename);
  return downloadTxt(md, baseFilename);
}

/**
 * todayStamp — 파일명에 쓰는 오늘 날짜 (YYYY-MM-DD).
 *
 * toISOString() 은 UTC 기준이라 한국 시간 새벽에 파일을 받으면
 * 파일명이 하루 전 날짜로 찍힌다 (실측 2026-08-27 00:5x, 파일명은 08-26).
 * 작가가 날짜로 원고를 정리하니 보고 있는 날짜와 같아야 한다.
 */
export function todayStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
