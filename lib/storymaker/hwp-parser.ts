// V3.1 #8 — .hwp / .hwpx 파싱.
//
// .hwpx = HWP 5.0+ 표준 = zip + XML (DOCX와 비슷). JSZip로 풀어서 Contents/section*.xml 텍스트 추출.
// .hwp = HWP 5.0 이전 = 바이너리 (Compound File Binary, OLE). 순수 JS 라이브러리가 production 신뢰성 X
//        → friendly 안내 + PDF 변환 가이드 (사용자 학습 비용 vs 코드 복잡도 trade-off — 글로벌 룰 16 BYOK).
//
// 둘 다 = 텍스트만 추출 (서식·표·이미지 X = AI 작가팀이 자유롭게 다시 정리하는 게 목적).

import JSZip from "jszip";

/**
 * .hwpx 파일을 텍스트로 변환.
 * 구조: PK zip → Contents/section0.xml, Contents/section1.xml, ...
 */
export async function parseHwpx(buf: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const sections: string[] = [];

  // Contents/section*.xml 파일을 정렬해서 순서대로 처리
  const sectionFiles = Object.keys(zip.files)
    .filter(name => /^Contents\/section\d+\.xml$/i.test(name))
    .sort();

  if (sectionFiles.length === 0) {
    throw new Error("HWPX 파일 안에 본문 XML(Contents/section*.xml)이 없습니다.");
  }

  for (const name of sectionFiles) {
    const file = zip.files[name];
    if (!file) continue;
    const xml = await file.async("string");
    sections.push(extractTextFromHwpxXml(xml));
  }
  return sections.join("\n\n");
}

/**
 * HWPX XML에서 텍스트만 추출.
 * 구조: <hp:p>(단락) → <hp:run> → <hp:t>텍스트</hp:t>
 * 추가로 <hp:t> 안에 char 단위 텍스트가 흩어져 있을 수 있어 모든 <hp:t> 내용을 모음.
 */
function extractTextFromHwpxXml(xml: string): string {
  const paragraphs: string[] = [];
  // <hp:p ...>...</hp:p> 단위로 분할
  const paraRe = /<hp:p\b[^>]*>([\s\S]*?)<\/hp:p>/gi;
  let m: RegExpExecArray | null;
  while ((m = paraRe.exec(xml)) !== null) {
    const paraContent = m[1];
    // <hp:t>...</hp:t> 텍스트 모두 추출
    const texts: string[] = [];
    const tRe = /<hp:t\b[^>]*>([\s\S]*?)<\/hp:t>/gi;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(paraContent)) !== null) {
      texts.push(decodeXmlEntities(tm[1]));
    }
    const joined = texts.join("").trim();
    if (joined) paragraphs.push(joined);
  }
  return paragraphs.join("\n\n");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&"); // & 마지막에 (= chain decode 방지)
}

/**
 * .hwp (구버전 바이너리) — Node 환경에서 순수 JS로 production 신뢰성 X.
 * 친절 안내 + 변환 가이드 throw.
 */
export function parseHwpLegacyError(): never {
  throw new Error(
    "구버전 .hwp (HWP 5.0 이전) 바이너리 파일은 자동 변환이 불안정합니다.\n\n" +
    "[3단계 변환 안내]\n" +
    "1) 한컴 오피스에서 파일 열기\n" +
    "2) [파일] → [다른 이름으로 저장] → 파일 형식: HWPX(.hwpx) 또는 PDF(.pdf)\n" +
    "3) 변환한 파일을 다시 업로드\n\n" +
    "또는 본문을 복사해서 아래 텍스트 칸에 붙여넣어 주세요."
  );
}
