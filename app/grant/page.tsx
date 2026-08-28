"use client";

import { useRef, useState } from "react";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Btn } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { downloadDocx, downloadTxt, todayStamp } from "@/lib/storymaker/export";
import { streamFetch } from "@/lib/stream-agent";
import { KEY, usePersistedState } from "@/lib/persist";

export default function GrantPage() {
  return (
    <AppShell>
      <GrantMain />
    </AppShell>
  );
}

interface UploadSlot {
  text: string;
  filename: string;
  status: "idle" | "loading" | "ok" | "error";
  message?: string;
}

const initialSlot: UploadSlot = { text: "", filename: "", status: "idle" };

function GrantMain() {
  const I = ICONS;

  const [notice, setNotice] = usePersistedState<UploadSlot>(KEY.grantNotice, initialSlot);    // 공고
  const [form, setForm] = usePersistedState<UploadSlot>(KEY.grantForm, initialSlot);        // 신청서 양식
  const [proposal, setProposal] = usePersistedState<UploadSlot>(KEY.grantProposal, initialSlot); // 기획안

  const [project, setProject] = usePersistedState<string>(KEY.grantProject, "");
  const [extra, setExtra] = usePersistedState<string>(KEY.grantExtra, "");
  // ★ 2~3분 기다려 받은 신청서가 새로고침 한 번에 사라지던 문제 (실측 2026-08-27)
  const [result, setResult] = usePersistedState<string>(KEY.grantResult, "");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const noticeRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLInputElement>(null);
  const proposalRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (s: UploadSlot) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // ★ V3.1 — Vercel 서버 4.5MB 사전 차단 (큰 파일 = "Request Entity Too Large" 평문 응답 = JSON.parse 실패 사고 방지)
    const VERCEL_MAX = 4.5 * 1024 * 1024;
    if (file.size > VERCEL_MAX) {
      setter({
        text: "", filename: file.name, status: "error",
        message: `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB / 최대 4.5MB).\n\n해결:\n1) 워드·PDF에서 이미지 압축·제거 후 재업로드\n2) [다른 이름 저장] → .txt 또는 = 본문만 복사해서 아래 텍스트 칸에 붙여넣기`,
      });
      return;
    }

    setter({ text: "", filename: file.name, status: "loading", message: `${file.name} 분석 중…` });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });

      // ★ V3.1 — content-type 검증 (= Vercel platform 413 응답이 평문이라 JSON.parse 실패 방지)
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const raw = await res.text();
        let msg = `서버 응답 오류 (${res.status})`;
        if (res.status === 413 || /entity\s*too\s*large/i.test(raw)) {
          msg = `파일이 서버 제한(4.5MB)을 초과합니다.\n\n해결: 본문만 복사해서 아래 텍스트 칸에 붙여넣기 (= 100% 작동, 크기 제한 X).`;
        } else if (res.status >= 500) {
          msg = `서버 오류 (${res.status}). 잠시 후 재시도 또는 = 본문 직접 붙여넣기.`;
        } else {
          msg = `${msg}: ${raw.slice(0, 150)}`;
        }
        setter({ text: "", filename: file.name, status: "error", message: msg });
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setter({ text: "", filename: file.name, status: "error", message: json.error || "업로드 실패" });
        return;
      }
      setter({
        text: json.text,
        filename: json.meta.filename,
        status: "ok",
        message: `${json.meta.filename} — ${json.meta.chars.toLocaleString()}자 추출됨`,
      });
    } catch (err) {
      setter({
        text: "", filename: file.name, status: "error",
        message: err instanceof Error ? err.message : "네트워크 오류",
      });
    }
  };

  const generate = async () => {
    if (running) return;
    if (!notice.text && !form.text && !proposal.text) {
      setError("공고·양식·기획안 중 최소 하나는 업로드해 주세요.");
      return;
    }
    setError("");
    setResult("");
    setRunning(true);

    const ac = new AbortController();
    abortRef.current = ac;

    const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + "...(이하 생략)" : s;

    const userInputBlocks: string[] = [];
    if (notice.text) userInputBlocks.push(`## 📋 사업 공고\n${trunc(notice.text, 6000)}`);
    if (form.text) userInputBlocks.push(`## 📝 신청서 양식 (이 항목들을 빠짐없이 채워야 합니다)\n${trunc(form.text, 5000)}`);
    if (proposal.text) userInputBlocks.push(`## 💡 작가 기획안 (이 작품으로 신청)\n${trunc(proposal.text, 6000)}`);
    if (project.trim()) userInputBlocks.push(`## 작품명\n${project.trim()}`);
    if (extra.trim()) userInputBlocks.push(`## 추가 메모 (작가 보충)\n${extra.trim()}`);

    const fullText = userInputBlocks.join("\n\n");

    try {
      // ★ V3.1.1 — 1단계: Haiku로 공고·양식·기획안 풀 컨텍스트 분석 (Pro fair use = 한도 안 차감)
      let analysis = "";
      try {
        const analyzeRes = await streamFetch({
          mode: "analyze",
          text: `# 지원사업 자료 통합 분석 요청\n\n${fullText}\n\n## 출력 — 핵심 정리\n1. 사업 핵심 가치·심사 기준 (= 공고에서 추출)\n2. 신청서 양식 필수 항목 list (= 양식에서 추출)\n3. 작가 기획안 강점·차별점 (= 기획안에서 추출)\n4. 매칭 전략 (= 작가 기획안 + 사업 가치 = 어떻게 어필할지)`,
          fast: true, // Haiku 강제
        }, { signal: ac.signal });
        if (analyzeRes.body) {
          const reader = analyzeRes.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const events = buf.split("\n\n");
            buf = events.pop() || "";
            for (const evt of events) {
              const lines = evt.split("\n");
              const eventType = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
              const dataLine = lines.find(l => l.startsWith("data:"))?.slice(5).trim();
              if (eventType === "delta" && dataLine) {
                try { const d = JSON.parse(dataLine); if (d.text) analysis += d.text; } catch { /* ignore */ }
              }
            }
          }
        }
      } catch { /* 분석 실패 = 옛 path로 fallback */ }

      const analysisPart = analysis
        ? `\n## ★ 사전 분석 (= Haiku로 통합 분석한 결과)\n${analysis}\n`
        : "";

      // ★ V3.1.1 — 2단계: Sonnet/Opus로 신청서 본격 작성 (= 분석 결과 활용)
      const res = await streamFetch({
          mode: "review", // review mode 활용 (text 입력 → 분석 출력)
          text: `# 작업 요청: 정부/문화재단 지원사업 신청서 작성

${fullText}
${analysisPart}
## 출력 룰 (★ 절대 준수)

1. **양식이 있으면** — 양식의 모든 항목을 빠짐없이 그대로 사용. 항목 순서·번호 그대로. 작가가 그대로 제출 가능한 수준으로 채워라.
2. **양식이 없으면** — 표준 항목으로 작성:
   - 사업명 / 신청자 / 작품명
   - 기획 의도 (왜 이 작품인가, 사회적 의의)
   - 작품 개요 (로그라인·시놉시스·캐릭터·구성)
   - 제작 계획 (일정·인력·예산·로케이션·장비)
   - 제출자 이력 (작가 소개·대표 작품·수상)
   - 예상 효과 (관객 규모·시장·문화적 의의·산업 파급)
   - 첨부 자료 목록
3. **공고가 있으면** — 공고가 요구하는 핵심 가치·심사 기준을 분석해 모든 항목에 반영
4. **기획안이 있으면** — 기획안의 컨셉·강점을 활용해 신청서 항목 채움
5. **톤** — 공식·정량적·설득력. 정부 지원사업 표준 한국어. 자기 자랑 X, 객관적 근거 제시.
6. **마크다운** — 항목 헤딩만 ##, 본문은 평문. 표는 마크다운 표 사용 OK (예산·일정).
7. **분량** — 항목별 충분히 (예산표·일정표는 표로). 작가가 다듬어 제출 가능한 1차 완성본.

곧바로 신청서부터 시작. 인사·자기소개·다음 단계 안내 X.`,
          fast: false, // Opus
      }, { signal: ac.signal });
      if (!res.body) throw new Error("응답 없음");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const evt of events) {
          const lines = evt.split("\n");
          const eventType = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
          const dataLine = lines.find(l => l.startsWith("data:"))?.slice(5).trim();
          if (!eventType || !dataLine) continue;
          try {
            const data = JSON.parse(dataLine);
            if (eventType === "delta" && data.text) {
              setResult(prev => prev + data.text);
            } else if (eventType === "error") {
              setError(data.message || "AI 호출 오류");
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const stop = () => { abortRef.current?.abort(); };

  const downloadName = (project || "지원사업_신청서") + "_" + todayStamp();
  const downloadHtml = () => {
    if (!result) return;
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${project || "지원사업 신청서"}</title>
<style>
  body { font-family: "맑은 고딕", "Malgun Gothic", -apple-system, sans-serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.75; background: #fafaf7; }
  h1 { font-size: 26px; border-bottom: 2px solid #ee6e55; padding-bottom: 8px; margin-top: 32px; }
  h2 { font-size: 20px; margin-top: 28px; color: #2a2a2a; }
  h3 { font-size: 17px; margin-top: 22px; color: #444; }
  p { margin: 12px 0; }
  strong { color: #ee6e55; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f3ed; font-weight: 600; }
  ul, ol { padding-left: 24px; }
  li { margin: 6px 0; }
  .meta { font-size: 12px; color: #888; margin-top: 60px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
</style>
</head>
<body>
<h1>${project || "지원사업 신청서"}</h1>
<div>${result
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
}</div>
<div class="meta">Story Maker · ${new Date().toLocaleDateString("ko-KR")} 생성</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${downloadName}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderUploadCard = (
    label: string, helper: string, slot: UploadSlot,
    setter: (s: UploadSlot) => void, ref: React.RefObject<HTMLInputElement | null>,
  ) => (
    <div style={{
      padding: "16px 18px",
      border: `1px solid ${slot.status === "ok" ? "var(--coral)" : slot.status === "error" ? "#c0392b" : "var(--line)"}`,
      borderRadius: 12,
      background: slot.status === "ok" ? "var(--card)" : "var(--card-soft)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)" }}>{label}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.5 }}>{helper}</div>
      <input
        ref={ref} type="file" accept=".pdf,.docx,.txt,.md,.hwp"
        onChange={(e) => handleUpload(e, setter)}
        style={{ display: "none" }}
      />
      <Btn icon={I.upload || I.plus} onClick={() => ref.current?.click()} disabled={running || slot.status === "loading"}>
        {slot.status === "loading" ? "분석 중…" : slot.status === "ok" ? "다른 파일로 교체" : "파일 업로드"}
      </Btn>
      {slot.message && (
        <span style={{
          fontSize: 11,
          color: slot.status === "error" ? "#c0392b"
               : slot.status === "ok" ? "var(--ink-3)" : "var(--ink-4)",
        }}>
          {slot.status === "ok" ? "✓ " : slot.status === "error" ? "⚠ " : "… "}
          {slot.message}
        </span>
      )}
    </div>
  );

  return (
    <main className="main">
      <Topbar
        eyebrow="GRANT — 지원사업 신청서"
        title='<em style="font-style:italic">Grant</em> Application<span class="dot">.</span>'
        sub="공고 · 양식 · 기획안 3개를 올리면 AI가 양식 항목에 맞춰 신청서 1차 완성본을 작성합니다. 작가는 다듬어 제출."
      />

      <SectionHead num={1} title="자료 업로드" sub="셋 중 하나라도 있으면 시작 가능. 셋 다 있으면 양식이 정확하게." />

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {renderUploadCard(
          "📋 사업 공고",
          "정부·재단의 지원사업 공고 PDF/DOCX. AI가 핵심 가치·심사 기준 파악",
          notice, setNotice, noticeRef,
        )}
        {renderUploadCard(
          "📝 신청서 양식",
          "작성해야 할 항목들이 있는 양식 파일. AI가 양식 그대로 채움 (없으면 표준 항목으로)",
          form, setForm, formRef,
        )}
        {renderUploadCard(
          "💡 작가 기획안",
          "이 작품의 트리트먼트·시놉시스·캐릭터 등 기획 자료. AI가 활용해서 신청서 작성",
          proposal, setProposal, proposalRef,
        )}
      </div>

      <SectionHead num={2} title="추가 정보" sub="필요 시" />

      <div className="form-grid cols-1">
        <Field label="작품명" help="신청서 파일명·제목에 사용">
          <input className="field-input" placeholder="예: 회귀한 황녀가 자신의 살해범을 길들이기로 한다"
            value={project} onChange={e => setProject(e.target.value)} disabled={running} />
        </Field>
        <Field label="추가 메모 (선택)" help="강조할 점·예산 규모·일정 등 자유 메모">
          <textarea className="field-textarea" rows={4}
            placeholder="예: 신청 사업 — 콘진원 OO지원사업 / 예산 규모 1억 / 2026년 하반기 제작 예정"
            value={extra} onChange={e => setExtra(e.target.value)} disabled={running} />
        </Field>
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Btn kind="coral" icon={I.spark} onClick={generate}
          disabled={running || (!notice.text && !form.text && !proposal.text)}>
          {running ? "신청서 작성 중…" : "신청서 작성 시작"}
        </Btn>
        {running && <Btn onClick={stop}>중지</Btn>}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-4)" }}>
          {running ? "AI가 양식 항목별로 작성 중" : "예상 소요 — 약 1~2분 (Opus)"}
        </span>
      </div>

      {error && (
        <div style={{
          marginTop: 16, padding: "12px 16px",
          background: "var(--coral-soft)", border: "1px solid rgba(238,110,85,0.3)",
          borderRadius: 10, color: "var(--coral-deep)", fontSize: 13,
        }}>
          ⚠ {error}
        </div>
      )}

      {(result || running) && (
        <>
          <SectionHead
            num={3}
            title="신청서 (1차 완성본)"
            sub="작가가 다듬어 제출하세요"
            right={result && !running ? (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn icon={I.download} onClick={() => downloadDocx(result, downloadName)}>워드</Btn>
                <Btn icon={I.download} onClick={() => downloadTxt(result, downloadName)}>텍스트</Btn>
                <Btn kind="coral" icon={I.download} onClick={downloadHtml}>HTML</Btn>
              </div>
            ) : undefined}
          />
          <article style={{
            background: "var(--card)",
            border: "1px solid " + (running ? "var(--coral)" : "var(--line)"),
            borderRadius: 14, padding: "24px 26px", minHeight: 200,
          }}>
            {result
              ? <Markdown text={result} />
              : <div style={{ color: "var(--ink-4)", fontSize: 13 }}>{running ? "…" : ""}</div>}
          </article>
        </>
      )}

      <div style={{ height: 60 }} />
    </main>
  );
}
