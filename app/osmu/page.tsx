"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Btn } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { LibraryPicker } from "@/components/LibraryPicker";
import { streamAgent } from "@/lib/stream-agent";

export default function OsmuPage() {
  return (
    <AppShell>
      <OsmuMain />
    </AppShell>
  );
}

interface SampleResult {
  score: number;
  headline: string;
  note: string;
  strength: string;
}

function OsmuMain() {
  const router = useRouter();
  const I = ICONS;

  const [source, setSource] = useState("F");
  const [depth, setDepth] = useState<"A" | "B" | "C">("A");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [running, setRunning] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const targetCount = GENRES.length - 1; // 원본 제외
  const depthInfo = {
    A: { label: "매트릭스 분석", desc: "각 매체 1단락 · 빠른 스캔 (★ 가장 안정)", eta: "1~3분", pages: "1단락", disabled: false },
    B: { label: "트리트먼트", desc: "각 매체 A4 1쪽 · Haiku 사전 분석 + Sonnet 변환", eta: `${targetCount * 1}~${targetCount * 2}분`, pages: "A4 1쪽", disabled: false },
    // ★ V3.1.1 — 풀 패키지 = Haiku 2단계 path로 재활성 (대표님 명시 2026-05-21)
    // 출력 한도 빠듯 = AI가 = 6~8 매체에서 잘릴 가능성 = depth A 추천 → adapt 페이지에서 본격 권장.
    C: { label: "풀 패키지", desc: "각 매체 시놉+캐릭터+첫 부분 (⚠ 출력 한도 빠듯 = 일부 매체 잘림 가능)", eta: `${targetCount * 3}~${targetCount * 5}분`, pages: "패키지", disabled: false },
  } as const;
  const cur = depthInfo[depth];

  // 데모: 결과 데이터 (12장르)
  const sampleResults: Record<string, SampleResult> = {
    A: { score: 95, headline: "원작 — 그대로 살림", note: "캐릭터·세계관·정서 모두 유지. 16부 가장 자연스러움.", strength: "정서·캐릭터" },
    B: { score: 78, headline: "압축형 영화화", note: "2시간 안에 핵심 갈등만. 조연 대거 정리 필요.", strength: "임팩트" },
    C: { score: 88, headline: "세로 숏드라마", note: "회당 1~2분 · 100화. 후크 매 회차마다.", strength: "확장성" },
    D: { score: 72, headline: "감성 애니 영화", note: "비주얼 메타포로 정서 증폭. 어른 관객.", strength: "비주얼" },
    F: { score: 82, headline: "원작 웹툰", note: "65컷·100화. 컷 단위 호흡 살리기.", strength: "비주얼·호흡" },
    G: { score: 65, headline: "메이킹 다큐", note: "원작자 인터뷰 + 제작 과정. 부속물.", strength: "브랜딩" },
    H: { score: 92, headline: "장르 웹소설", note: "회당 5천자 · 200화. 내면 묘사 강점.", strength: "내면" },
    I: { score: 70, headline: "주크박스 뮤지컬", note: "넘버 12곡. 핵심 감정 장면만 발췌.", strength: "정서" },
    J: { score: 84, headline: "유튜브 시리즈", note: "10분짜리 · 캐릭터 채널 운영. 팬덤 직접 소통.", strength: "팬덤" },
    K: { score: 76, headline: "체험형 전시", note: "9개 존 · 주요 장면 재현 + 굿즈.", strength: "오프라인" },
    L: { score: 89, headline: "비주얼 노벨 게임", note: "선택지 분기. 멀티엔딩 5종. 호감도 시스템.", strength: "인터랙션" },
    M: { score: 58, headline: "예능 콜라보", note: "캐릭터 ↔ 셀럽 매칭. 단발성 스페셜.", strength: "화제성" },
  };

  const sourceGenre = GENRES.find(g => g.letter === source) || GENRES[0];

  const startMatrix = async () => {
    if (running) return;
    if (!body.trim()) {
      setError("원본 작품 본문을 입력해주세요.");
      return;
    }
    setError(null);
    setStreamText("");
    setRunning(true);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // ★ V3.1.1 — 영화 1편(5만자) 등 큰 시나리오도 핵심 발췌 (앞·1/4·중반·3/4·결말 5구간 = 20K자)
      // 옛 = 앞 8,000자만 분석 = 결말·중반 누락 = 부실. 새 = 5구간 발췌 = 핵심 다 보존.
      const truncatedBody = (() => {
        const LIMIT = 20000;
        if (body.length <= LIMIT) return body;
        const headLen = Math.floor(LIMIT * 0.30);
        const q1Len = Math.floor(LIMIT * 0.15);
        const midLen = Math.floor(LIMIT * 0.15);
        const q3Len = Math.floor(LIMIT * 0.15);
        const tailLen = LIMIT - headLen - q1Len - midLen - q3Len;
        const total = body.length;
        const q1Start = Math.floor(total * 0.25 - q1Len / 2);
        const midStart = Math.floor(total * 0.5 - midLen / 2);
        const q3Start = Math.floor(total * 0.75 - q3Len / 2);
        return body.slice(0, headLen)
          + `\n\n…(앞부분 끝 · 원문 ${total.toLocaleString()}자 중 [1/4 지점]으로)…\n\n`
          + body.slice(q1Start, q1Start + q1Len)
          + `\n\n…([1/4] 끝 · [중반]으로)…\n\n`
          + body.slice(midStart, midStart + midLen)
          + `\n\n…([중반] 끝 · [3/4]로)…\n\n`
          + body.slice(q3Start, q3Start + q3Len)
          + `\n\n…([3/4] 끝 · [결말]로)…\n\n`
          + body.slice(total - tailLen);
      })();
      const { getWorkId } = await import("@/lib/storymaker/work-id");
      const workId = title.trim() ? getWorkId(source, title.trim()) : "";

      // ★ V3.1.1 — depth B/C = Haiku 2단계 path (= 풀 컨텍스트 + Sonnet 변환). depth A = 옛 path.
      let analysis = "";
      if (depth === "B" || depth === "C") {
        await streamAgent({
          body: {
            mode: "analyze",
            text: truncatedBody,
            genreLetter: source,
            fast: true, // Haiku 강제 = 한도 안 차감
          },
          userPromptSummary: `[OSMU ${depth} 사전 분석] ${title || "원본"}`,
          signal: ac.signal,
          onDelta: (chunk) => { analysis += chunk; },
          onError: (msg) => setError(msg),
        });
      }

      await streamAgent({
        body: {
          mode: "osmu",
          idea: truncatedBody,
          sourceIp: title || "원본 작품",
          genreLetter: source,
          depth, // ★ V3.1.1 — depth 전달
          ...(analysis ? { analysis } : {}), // ★ depth B/C = Haiku 분석 결과
          fast: depth === "A" ? (await import("@/lib/storymaker/model-prefs")).isFastModel("osmu") : false, // depth B/C = Sonnet
          ...(workId ? { workId } : {}),
        },
        userPromptSummary: `[OSMU ${depth}] ${title || "원본"} (${source}) → ${depth === "A" ? "매트릭스" : depth === "B" ? "트리트먼트" : "풀 패키지"}`,
        signal: ac.signal,
        onDelta: (chunk) => setStreamText(prev => prev + chunk),
        onError: (msg) => setError(msg),
      });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const stopMatrix = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // ★ V3.1.1 — Vercel 4.5MB 사전 차단 + 친절 안내
    const VERCEL_MAX = 4.5 * 1024 * 1024;
    if (file.size > VERCEL_MAX) {
      alert(`파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB / 최대 4.5MB).\n\n해결: 본문만 복사해서 아래 텍스트 칸에 붙여넣기 (크기 제한 X, 100% 작동).`);
      return;
    }

    // PDF/DOCX/HWPX/TXT/MD 모두 지원 — /api/upload route가 파싱 (unpdf, mammoth, hwp-parser)
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (["pdf", "docx", "doc", "hwpx"].includes(ext)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });

        // content-type 검증 = Vercel 413 평문 응답 = JSON.parse 실패 방지
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const raw = await res.text();
          alert(
            res.status === 413 || /entity\s*too\s*large/i.test(raw)
              ? "파일이 서버 제한(4.5MB)을 초과합니다.\n\n해결: 본문만 복사해서 아래 텍스트 칸에 붙여넣기."
              : `서버 오류 (${res.status}). 본문 붙여넣기 권장.`
          );
          return;
        }

        const json = await res.json();
        if (!res.ok) {
          alert("업로드 실패: " + (json.error || res.status));
          return;
        }
        setBody(String(json.text || "").slice(0, 50_000));
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      } catch (err) {
        alert("업로드 오류: " + (err instanceof Error ? err.message : String(err)) + "\n\n본문을 직접 붙여넣기 권장.");
      }
      return;
    }

    // TXT/MD 등 텍스트 파일은 브라우저에서 직접 read
    const reader = new FileReader();
    reader.onload = ev => {
      const text = String(ev.target?.result || "");
      setBody(text.slice(0, 50_000));
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsText(file);
  };

  // 본문 입력 시 mock 사라짐. 빈 상태일 때만 예시로 표시.
  const isEmpty = !body.trim();
  const resultRows = isEmpty ? GENRES
    .filter(g => g.letter !== source)
    .map(g => ({ g, r: sampleResults[g.letter] }))
    .filter(x => x.r)
    .sort((a, b) => b.r.score - a.r.score) : [];

  const top3 = resultRows.slice(0, 3);

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — OSMU"
        title='하나의 이야기, <em style="font-style:italic">열두 가지 매체</em>'
        sub="원본 한 작품을 12개 매체로 동시 분석 — 적합도·강점·전환 룰을 매트릭스로 한 번에."
      />

      {/* INPUT CARD */}
      <div className="osmu-input">
        <div className="osmu-input-grid">
          <div className="osmu-input-source is-demo">
            <div className="osmu-input-label">원본 작품</div>
            <div className="osmu-input-source-meta">
              <input
                type="text"
                className="osmu-input-source-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="작품명"
              />
              <div className="osmu-input-source-tags">
                <span className="osmu-input-tag is-genre">
                  {I[sourceGenre.letter]} {sourceGenre.letter}. {sourceGenre.name}
                </span>
                <span className="osmu-input-tag">{body.length.toLocaleString()}자</span>
              </div>
            </div>
            <textarea
              className="osmu-input-source-text"
              rows={4}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="시놉시스 또는 1화 본문 — 자유롭게 붙여넣기 (★ 큰 시나리오 = 파일 업로드 또는 본문 복사. 4.5MB 초과 파일 = 본문 붙여넣기 권장)"
            />
            <div className="osmu-input-source-actions">
              <button
                className="osmu-link-btn"
                type="button"
                onClick={() => setShowLibrary(true)}
              >
                {I.library}<span>라이브러리에서 가져오기</span>
              </button>
              <button
                className="osmu-link-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                {I.upload}<span>파일 업로드</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md,.markdown,.fountain,.fdx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="osmu-input-config">
            <div className="osmu-config-block">
              <div className="osmu-input-label">원본 매체</div>
              <select
                className="osmu-config-select"
                value={source}
                onChange={e => setSource(e.target.value)}
              >
                {GENRES.map(g => (
                  <option key={g.letter} value={g.letter}>
                    {g.letter}. {g.name}
                  </option>
                ))}
              </select>
              <div className="osmu-config-hint">
                나머지 <strong>{targetCount}개 매체</strong>로 자동 분석
              </div>
            </div>

            <div className="osmu-config-block">
              <div className="osmu-input-label">분석 깊이</div>
              <div className="osmu-depth-row">
                {(["A", "B", "C"] as const).map(k => {
                  const info = depthInfo[k];
                  return (
                    <button
                      key={k}
                      className={"osmu-depth-pill" + (depth === k ? " is-on" : "") + (info.disabled ? " is-disabled" : "")}
                      onClick={() => {
                        if (info.disabled) {
                          alert("풀 패키지 = 12 매체 × (시놉+캐릭터+본문) ≈ 5만자 출력 = AI 한도 초과 = 사실상 작동 X.\n\n★ 권장 = adapt 페이지에서 1 매체씩 본격 변환 (예: '영화 → 웹툰 50화' = 단계별).");
                          router.push("/adapt");
                          return;
                        }
                        setDepth(k);
                      }}
                      title={info.desc}
                      disabled={info.disabled}
                      style={info.disabled ? { opacity: 0.5, cursor: "help" } : undefined}
                      aria-disabled={info.disabled}
                    >
                      <span className="osmu-depth-pill-name">{info.label}{info.disabled ? " ⚠" : ""}</span>
                      <span className="osmu-depth-pill-pages">{info.pages}</span>
                    </button>
                  );
                })}
              </div>
              <div className="osmu-config-hint">
                {cur.desc} · 예상 <strong>{cur.eta}</strong>
              </div>
            </div>

            <button
              className="osmu-run-cta"
              type="button"
              onClick={running ? stopMatrix : startMatrix}
              disabled={!body.trim() && !running}
            >
              <span className="osmu-run-cta-icon">{I.spark}</span>
              <span className="osmu-run-cta-label">
                {running ? "중지" : "12개 매체 매트릭스 시작"}
              </span>
              <span className="osmu-run-cta-meta">
                {running ? "스트리밍 중…" : cur.eta}
              </span>
            </button>
            {error && (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--coral, #d96a5a)" }}>
                ⚠ {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {(running || streamText) && (
        <div style={{ marginTop: 24 }}>
          <SectionHead
            title="매트릭스 분석 결과"
            sub={running ? "스트리밍 중 — 12개 매체 분석" : `완료 · ${streamText.length.toLocaleString()}자`}
            right={!running && streamText ? (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn kind="primary" icon={I.save} onClick={async () => {
                  const { downloadDocx } = await import("@/lib/storymaker/export");
                  const stamp = new Date().toISOString().slice(0, 10);
                  const t = title || "OSMU 매트릭스";
                  await downloadDocx(`# ${t} — OSMU 매트릭스\n> 생성일: ${stamp}  |  원본 매체: ${sourceGenre.name}\n\n${streamText}`, `${t}_OSMU_${stamp}`);
                }}>워드</Btn>
                <Btn icon={I.save} onClick={async () => {
                  const { downloadTxt } = await import("@/lib/storymaker/export");
                  const stamp = new Date().toISOString().slice(0, 10);
                  const t = title || "OSMU 매트릭스";
                  downloadTxt(`# ${t} — OSMU 매트릭스\n> 생성일: ${stamp}  |  원본 매체: ${sourceGenre.name}\n\n${streamText}`, `${t}_OSMU_${stamp}`);
                }}>텍스트</Btn>
              </div>
            ) : null}
          />
          <div className="output-item" style={{
            padding: "20px 22px", display: "block",
            fontSize: 13.5, lineHeight: 1.75, color: "var(--ink-2)",
            fontFamily: "var(--font-sans, ui-sans-serif), system-ui",
            maxHeight: "70vh", overflowY: "auto",
          }}>
            {streamText
              ? <Markdown text={streamText} />
              : <span style={{ color: "var(--ink-4)" }}>잠시만요…</span>}
          </div>
        </div>
      )}

      {/* 빈 상태 안내 — 본문 미입력 시. AI 결과(streamText)는 위쪽 영역에서 표시. */}
      {isEmpty && !streamText && (
        <div style={{
          marginTop: 28,
          padding: "44px 28px",
          border: "1px dashed var(--line)",
          borderRadius: 14,
          background: "var(--card-soft)",
          textAlign: "center",
          color: "var(--ink-3)",
          lineHeight: 1.75,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--coral)", letterSpacing: "0.12em", marginBottom: 10 }}>
            OSMU 매트릭스
          </div>
          <div style={{ fontSize: 15, color: "var(--ink-1)", marginBottom: 6, fontWeight: 600 }}>
            원본 본문을 입력하면 <em style={{ fontStyle: "italic", color: "var(--coral)" }}>12개 매체</em>로 펼쳐집니다
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-4)" }}>
            웹툰 · 웹소설 · 영화 · TV드라마 · 숏드라마 · 애니메이션 · 게임 · 뮤지컬 · 다큐 · 유튜브 · 전시 · 예능
            <br />
            매체별 적합도 점수 + 강점 + 전환 룰을 한 번에 분석
          </div>
        </div>
      )}

      <LibraryPicker
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        title="원본 작품 가져오기"
        subtitle="라이브러리 작품을 선택하면 본문이 OSMU 분석 입력에 자동으로 들어옵니다."
        onPick={(work, body) => {
          setSource(work.letter);
          if (!title) setTitle(work.title);
          if (body) {
            setBody(body.slice(0, 50_000));
          }
        }}
      />
    </main>
  );
}
