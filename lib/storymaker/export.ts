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

// ─── Markdown 문자열 → docx Document ───
export function markdownToDocx(md: string, title: string): Document {
  const lines = md.split("\n");
  const children: (Paragraph | Table)[] = [];

  // 표지 제목
  children.push(new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 36 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  let i = 0;
  let inCodeBlock = false;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

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
export async function downloadDocx(md: string, filename: string): Promise<void> {
  const title = filename.replace(/\.(docx|md|txt)$/i, "");
  const doc = markdownToDocx(md, title);
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

// ─── 다운로드 옵션 묶음 ───
export type ExportFormat = "docx" | "txt";

export async function exportDocument(md: string, baseFilename: string, format: ExportFormat): Promise<void> {
  if (format === "docx") return downloadDocx(md, baseFilename);
  return downloadTxt(md, baseFilename);
}
