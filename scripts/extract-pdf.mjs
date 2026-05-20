// V3.1.1 — PDF 텍스트 추출 헬퍼 (작가가 OSMU·adapt에 paste용)
// usage: node scripts/extract-pdf.mjs "PDF경로.pdf"
// 결과 = 같은 폴더에 .extracted.txt로 저장.

import { extractText, getDocumentProxy } from "unpdf";
import fs from "node:fs";
import path from "node:path";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node scripts/extract-pdf.mjs <pdf-path>");
  process.exit(1);
}
if (!fs.existsSync(pdfPath)) {
  console.error(`File not found: ${pdfPath}`);
  process.exit(1);
}

const buf = fs.readFileSync(pdfPath);
const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
const pdf = await getDocumentProxy(u8);
const { text } = await extractText(pdf, { mergePages: true });
const result = Array.isArray(text) ? text.join("\n\n") : text;

const outPath = pdfPath.replace(/\.pdf$/i, ".extracted.txt");
fs.writeFileSync(outPath, result, "utf-8");
console.log(`✅ ${result.length.toLocaleString()} chars`);
console.log(`📄 ${outPath}`);
