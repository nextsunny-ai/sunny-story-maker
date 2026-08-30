import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

//   서버는 20MB까지 받지만, 배포(Vercel)에서 4.5MB를 넘으면 요청 자체가 막힌다.
//   작가에게는 4.5MB로 안내한다 — 지킬 수 있는 숫자를 말해야 한다.
const MAX_BYTES = 20 * 1024 * 1024;

interface UploadResponse {
  text: string;
  meta: { filename: string; size: number; type: string; chars: number };
}

async function parsePdf(buf: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}

async function parseDocx(buf: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
  return result.value;
}

function parseText(buf: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(buf);
}

// V3.1 #8 — .hwpx 파서 (zip+XML). hwp(바이너리)는 변환 안내 throw.
async function parseHwpxFile(buf: ArrayBuffer): Promise<string> {
  const { parseHwpx } = await import("@/lib/storymaker/hwp-parser");
  return parseHwpx(buf);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "파일이 없습니다." }), {
        status: 400, headers: { "content-type": "application/json" },
      });
    }

    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024}MB).` }), {
        status: 413, headers: { "content-type": "application/json" },
      });
    }

    const name = file.name.toLowerCase();
    const buf = await file.arrayBuffer();
    let text = "";

    try {
      if (name.endsWith(".pdf")) {
        text = await parsePdf(buf);
      } else if (name.endsWith(".docx")) {
        text = await parseDocx(buf);
      } else if (name.endsWith(".doc")) {
        return new Response(JSON.stringify({
          error: "구버전 .doc는 지원하지 않습니다. .docx 또는 .pdf로 변환 후 업로드해주세요.",
        }), { status: 415, headers: { "content-type": "application/json" } });
      } else if (name.match(/\.(txt|md|fountain|fdx)$/)) {
        text = parseText(buf);
      } else if (name.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
        return new Response(JSON.stringify({
          error: "이미지 파일은 곧 지원 예정입니다. 지금은 PDF/Word(.docx)/텍스트 파일을 사용해주세요.",
        }), { status: 415, headers: { "content-type": "application/json" } });
      } else if (name.endsWith(".hwpx")) {
        // V3.1 #8 — .hwpx 진짜 파싱 (zip+XML)
        text = await parseHwpxFile(buf);
      } else if (name.endsWith(".hwp")) {
        // 구버전 .hwp 바이너리 = 친절 변환 안내
        return new Response(JSON.stringify({
          error: "구버전 한글(.hwp) 파일은 자동 변환이 불안정합니다.\n\n[변환 3단계]\n1) 한컴 오피스에서 파일 열기\n2) [파일] → [다른 이름으로 저장] → 파일 형식: HWPX(.hwpx) 또는 PDF(.pdf)\n3) 변환한 파일을 다시 업로드\n\n또는 본문을 복사해서 아래 텍스트 칸에 붙여넣어 주세요.",
        }), { status: 415, headers: { "content-type": "application/json" } });
      } else {
        return new Response(JSON.stringify({
          error: `지원하지 않는 파일 형식입니다 (${name.split(".").pop()}). PDF, Word(.docx), 텍스트(.txt) 사용해주세요.`,
        }), { status: 415, headers: { "content-type": "application/json" } });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "파싱 실패";
      return new Response(JSON.stringify({
        error: `파일을 텍스트로 변환하지 못했습니다. (${msg}) 본문을 직접 복사해서 붙여넣어 주세요.`,
      }), { status: 422, headers: { "content-type": "application/json" } });
    }

    const cleaned = text.trim();
    if (!cleaned) {
      // V3.1 D5 — 매체별 친절 안내
      const ext = name.split(".").pop() || "?";
      let hint = "본문을 직접 복사해서 붙여넣어 주세요.";
      if (ext === "pdf") {
        hint = "스캔된 PDF·이미지 PDF는 텍스트 추출이 불가능합니다.\n[해결] (a) 원본 워드(.docx)·한글(.hwpx) 파일을 받아 업로드 / (b) PDF를 OCR 도구로 텍스트화 후 .txt 업로드 / (c) 본문을 직접 복사해서 붙여넣기.";
      } else if (ext === "docx") {
        hint = "워드 파일이 비어있거나 = 본문이 표·이미지 안에만 있을 수 있습니다. (a) 워드에서 본문 평문으로 복사 / (b) [다른 이름으로 저장] → 평문(.txt) 후 업로드 / (c) 본문 직접 붙여넣기.";
      } else if (ext === "hwpx") {
        hint = "한글(.hwpx) 본문이 비어있거나 = 표·이미지 안에만 있을 수 있습니다. 한컴에서 평문으로 복사 후 직접 붙여넣기를 권합니다.";
      }
      return new Response(JSON.stringify({
        error: `파일에서 텍스트를 찾지 못했습니다 (.${ext}).\n\n${hint}`,
      }), { status: 422, headers: { "content-type": "application/json" } });
    }

    // V3.1 D5 — 매우 짧은 본문 = 작가에게 경고 (= 정상 import가 아닐 가능성)
    if (cleaned.length < 50) {
      console.warn(`[upload] 본문이 매우 짧음 (${cleaned.length}자) — ${name}`);
    }

    const response: UploadResponse = {
      text: cleaned,
      meta: { filename: file.name, size: file.size, type: file.type || name.split(".").pop() || "unknown", chars: cleaned.length },
    };

    return new Response(JSON.stringify(response), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 처리 실패";
    // ★ V3.1 D3 — server log
    console.error("[/api/upload] 실패:", msg);
    return new Response(JSON.stringify({
      //   ★ 작가가 읽는 안내다. 실제 이유를 정확히 말한다 (실측 2026-08-29).
      //   옛 안내는 한도를 20MB로 잘못 적고(실제 4.5MB), 내부 표기 「X」가 그대로 나왔고,
      //   PDF를 올린 작가에게 「PDF로 변환하라」고 했다.
      error: /body|FormData|too large|entity/i.test(msg)
        ? "파일이 너무 큽니다. 한 번에 올릴 수 있는 크기는 4.5MB까지입니다.\n\n" +
          "이렇게 해보세요\n" +
          "· 원고 본문만 복사해서 아래 칸에 붙여넣기 (크기 제한 없음)\n" +
          "· PDF라면 이미지가 많은 경우가 많습니다 — 워드(.docx)나 텍스트(.txt)로 저장해서 올리기\n" +
          "· 원고가 아주 길면 앞부분부터 나눠서 올리기"
        : `파일을 읽지 못했습니다.\n\n` +
          `쓸 수 있는 형식 — 워드(.docx) · 한글(.hwpx) · PDF · 텍스트(.txt)\n` +
          `구버전 .doc / .hwp 는 먼저 변환해 주세요.\n\n` +
          `그래도 안 되면 원고 본문을 복사해서 아래 칸에 붙여넣어 주세요.`
    }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
