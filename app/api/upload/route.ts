import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024; // 20MB

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
      } else if (name.endsWith(".hwp")) {
        return new Response(JSON.stringify({
          error: "한글(.hwp) 파일은 PDF로 내보낸 후 업로드해주세요. (한컴 → 파일 → PDF로 저장)",
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
      return new Response(JSON.stringify({
        error: "파일에서 텍스트를 찾지 못했습니다. 스캔된 PDF 또는 이미지 PDF일 수 있습니다. 본문을 직접 복사해주세요.",
      }), { status: 422, headers: { "content-type": "application/json" } });
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
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
