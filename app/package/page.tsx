"use client";

import { useRef, useState, useEffect } from "react";
import { useQueryParams } from "@/lib/use-query-params";
import { ICONS } from "@/lib/icons";
import { GENRES, isLaunchGenre } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Tip, Btn } from "@/components/ui";
import { streamAgent } from "@/lib/stream-agent";
import { Markdown } from "@/components/Markdown";
import { downloadDocx, downloadTxt, todayStamp } from "@/lib/storymaker/export";
import { KEY, usePersistedState, loadJSON } from "@/lib/persist";

interface OutputItem {
  k: string;
  name: string;
  meta: string;
  spec: string;
}

const ITEMS: OutputItem[] = [
  { k: "treatment", name: "트리트먼트", meta: "5~7p · 줄거리 산문체", spec: "A4 · 한글" },
  { k: "synopsis",  name: "시놉시스",   meta: "1~2p · 한 줄 ~ 한 페이지", spec: "A4 · 한글" },
  { k: "character", name: "캐릭터 시트", meta: "3~6명 · 동기·아크",       spec: "A4 · 한글" },
  { k: "structure", name: "구성안",     meta: "회차별 / 막별 비트",        spec: "표 · 한글" },
  { k: "scene",     name: "씬 리스트",   meta: "씬 헤딩 + 한 줄 요약",      spec: "엑셀" },
  { k: "pitch",     name: "피치덱",     meta: "10~15장 · 비주얼 중심",     spec: "PPT" },
  // ── 지원사업 신청서용 (정부 지원사업 / 영진위 / 콘진원 / 문진원 등) ──
  { k: "intent",     name: "기획 의도서", meta: "왜 이 작품인가 · 사회적 의의",   spec: "A4 · 한글" },
  { k: "production", name: "제작 계획",   meta: "일정·인력·예산·로케이션",       spec: "A4 · 한글" },
  { k: "bio",        name: "제출자 이력", meta: "작가 소개 · 대표 작품 · 수상",    spec: "A4 · 한글" },
  { k: "impact",     name: "예상 효과",   meta: "관객·시장·문화적 효과",         spec: "A4 · 한글" },
];

const STEP_LABEL: Record<string, string> = {
  analyze: "의뢰 분석",
  treatment: "트리트먼트",
  synopsis: "시놉시스",
  character: "캐릭터 시트",
  structure: "구성안",
  scene: "씬 리스트",
  pitch: "피치덱",
  intent: "기획 의도서",
  production: "제작 계획",
  bio: "제출자 이력",
  impact: "예상 효과",
};

// 제출자 이력 산출물에 자동 첨부되는 작가 프로필.
// /admin 페이지의 KEY.adminProfile과 동일 키 — 한쪽 입력 = 양쪽 sync.
interface WriterProfileLocal {
  name: string;
  penName: string;
  role: string;
  email: string;
  mainGenre: string;
  career: string;
  works: string;
  avoid: string;
  likes: string;
}

const EMPTY_WRITER_PROFILE: WriterProfileLocal = {
  name: "",
  penName: "",
  role: "작가 · 감독",
  email: "",
  mainGenre: "",
  career: "1~5년",
  works: "",
  avoid: "",
  likes: "",
};

// 라이브러리 작품 카드 — write/page.tsx의 LibraryWorkLite와 동일 구조 (read-only)
interface LibraryWorkRef {
  id: number | string;
  title: string;
  genre: string;
  letter: string;
  stage: string;
  prog: number;
  updated: string;
  size: string;
  next?: string;
}

// KEY.writeProject(id)에서 read하는 단순 타입 (paras·notes만 사용)
interface PersistedProjectLite {
  paras?: { text?: string; label?: string }[];
  notes?: { label?: string }[];
  mediumFields?: Record<string, unknown>;
}

type GrantMode = "new" | "existing" | "direct";

export default function PackagePage() {
  return (
    <AppShell>
      <PackageMain />
    </AppShell>
  );
}

function PackageMain() {
  const I = ICONS;
  const searchParams = useQueryParams();
  const [outputs, setOutputs] = useState<Record<string, boolean>>({
    treatment: true, synopsis: true, character: true,
    structure: true, scene: false, pitch: false,
  });

  const [genreLetter, setGenreLetter] = useState("A");

  // ★ V3.1 C6 — 매체 변경 시 = 매체별 한국 실무 추천 산출물 자동 선택
  useEffect(() => {
    import("@/lib/storymaker/medium-artifacts").then(({ getRecommendedArtifacts }) => {
      const recommended = getRecommendedArtifacts(genreLetter);
      const recKeys = recommended.map(a => a.key);
      setOutputs(prev => {
        // 사용자가 직접 변경하지 X 옛 디폴트면 = 매체별 추천으로 교체
        const next: Record<string, boolean> = {};
        for (const item of ITEMS) {
          next[item.k] = recKeys.includes(item.k);
        }
        // 옛 지원사업 토글은 보존
        if (prev.intent) next.intent = true;
        if (prev.production) next.production = true;
        if (prev.bio) next.bio = true;
        if (prev.impact) next.impact = true;
        return next;
      });
    }).catch(() => { /* import 실패 = 옛 디폴트 그대로 */ });
  }, [genreLetter]);
  const [project, setProject] = useState("");
  const [runtime, setRuntime] = useState("");
  const [platform, setPlatform] = useState("");
  const [target, setTarget] = useState("");
  const [tone, setTone] = useState("");
  const [pov, setPov] = useState("");
  const [logline, setLogline] = useState("");
  const [story, setStory] = useState("");

  // ─── 지원사업 섹션 (?support=1 query면 자동 활성화) ───
  const [supportEnabled, setSupportEnabled] = useState(() => searchParams.get("support") === "1");
  useEffect(() => {
    if (searchParams.get("support") === "1") {
      setSupportEnabled(true);
      setOutputs(prev => ({ ...prev, intent: true, production: true, bio: true, impact: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 공고·양식 = 다중 (1~여러 개). 한 작품에 여러 공고 적용 / 양식 여러 버전 가능.
  interface SupportFile {
    id: string;
    text: string;
    filename: string;
    status: "loading" | "ok" | "error";
    message?: string;
  }
  const [noticeFiles, setNoticeFiles] = useState<SupportFile[]>([]);
  const [formFiles, setFormFiles] = useState<SupportFile[]>([]);

  // ★ 공고 메타데이터 자동 추출 (D 단계)
  interface GrantMeta {
    title?: string;
    agency?: string;
    program_type?: string;
    deadline?: string;
    submission_method?: string;
    submission_url?: string;
    budget_total?: string;
    budget_per_project?: string;
    support_period?: string;
    eligibility?: string;
    selection_criteria?: string;
    judges?: string;
    required_documents?: string;
    format_constraints?: string;
    key_dates?: string;
    contact?: string;
    notes?: string;
  }
  const [grantMeta, setGrantMeta] = useState<GrantMeta | null>(null);
  const [extractingMeta, setExtractingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const extractGrantMeta = async () => {
    const okNotices = noticeFiles.filter(f => f.status === "ok" && f.text);
    if (okNotices.length === 0) {
      setMetaError("공고 파일을 먼저 업로드해주세요.");
      return;
    }
    setExtractingMeta(true);
    setMetaError(null);
    setGrantMeta(null);
    // 여러 공고면 첫 번째만 (다중 추출 = 다음 라운드)
    const noticeText = okNotices.map(f => f.text).join("\n\n=== 다음 공고 ===\n\n");
    try {
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "extract-grant-meta",
          text: noticeText,
          fast: true, // Haiku — JSON 추출은 가벼움
        }),
      });
      if (!res.body) throw new Error("응답 없음");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let collected = "";
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
            if (eventType === "delta" && data.text) collected += data.text;
            else if (eventType === "error") throw new Error(data.message || "오류");
          } catch { /* ignore parse */ }
        }
      }
      // JSON 블록 추출 — ```json … ``` 또는 단일 JSON 객체
      const jsonMatch = collected.match(/```json\s*([\s\S]*?)\s*```/) ||
                        collected.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) {
        throw new Error("JSON 형식 응답 안 받음 — 다시 시도하거나 공고 본문 확인");
      }
      const parsed = JSON.parse(jsonMatch[1]) as GrantMeta;
      setGrantMeta(parsed);
    } catch (e) {
      setMetaError(e instanceof Error ? e.message : "메타 추출 실패");
    } finally {
      setExtractingMeta(false);
    }
  };
  const noticeInputRef = useRef<HTMLInputElement>(null);
  const formInputRef = useRef<HTMLInputElement>(null);

  const handleSupportUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "notice" | "form",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const setter = kind === "notice" ? setNoticeFiles : setFormFiles;
    const id = `sf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const loadingFile: SupportFile = {
      id, text: "", filename: file.name, status: "loading",
      message: `${file.name} 분석 중…`,
    };
    // ★ V3.1.1 — Vercel 4.5MB 사전 차단 + 친절 안내
    const VERCEL_MAX = 4.5 * 1024 * 1024;
    if (file.size > VERCEL_MAX) {
      setter(prev => [...prev, {
        id, text: "", filename: file.name, status: "error",
        message: `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB / 최대 4.5MB). 본문만 복사해서 텍스트 칸에 붙여넣기 권장.`,
      }]);
      return;
    }
    setter(prev => [...prev, loadingFile]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });

      // content-type 검증 = Vercel 413 평문 = JSON.parse 실패 방지
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const raw = await res.text();
        const msg = res.status === 413 || /entity\s*too\s*large/i.test(raw)
          ? "파일이 서버 제한(4.5MB)을 초과합니다. 본문 붙여넣기 권장."
          : `서버 오류 (${res.status})`;
        setter(prev => prev.map(f => f.id === id
          ? { ...f, status: "error", message: msg }
          : f));
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setter(prev => prev.map(f => f.id === id
          ? { ...f, status: "error", message: json.error || "업로드 실패" }
          : f));
        return;
      }
      setter(prev => prev.map(f => f.id === id
        ? {
            ...f, status: "ok",
            text: json.text, filename: json.meta.filename,
            message: `${json.meta.filename} — ${json.meta.chars.toLocaleString()}자`,
          }
        : f));
    } catch (err) {
      setter(prev => prev.map(f => f.id === id
        ? { ...f, status: "error", message: err instanceof Error ? err.message : "네트워크 오류" }
        : f));
    }
  };

  const removeSupportFile = (kind: "notice" | "form", id: string) => {
    const setter = kind === "notice" ? setNoticeFiles : setFormFiles;
    setter(prev => prev.filter(f => f.id !== id));
  };

  // 지원사업 ON 시 산출물 4개 자동 체크
  const toggleSupport = (next: boolean) => {
    setSupportEnabled(next);
    if (next) {
      setOutputs(prev => ({
        ...prev,
        intent: true,
        production: true,
        bio: true,
        impact: true,
      }));
    }
  };

  // ★ 2~3분 기다려 받은 6종 산출물이 새로고침 한 번에 사라지던 문제 (실측 2026-08-27)
  const [result, setResult] = usePersistedState<string>(KEY.packageResult, "");
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // 작가 프로필 — KEY.adminProfile과 동일 키 (admin 페이지와 sync).
  // bio(제출자 이력) 체크 시 인라인 카드 노출 — 빈 상태면 편집 모드, 저장된 상태면 view 모드 + [수정].
  const [writerProfile, setWriterProfile] = usePersistedState<WriterProfileLocal>(
    KEY.adminProfile,
    EMPTY_WRITER_PROFILE
  );
  // draft = 편집 중 임시값. [저장] 눌러야 진짜 writerProfile에 반영.
  const [draftProfile, setDraftProfile] = useState<WriterProfileLocal>(writerProfile);
  // writerProfile hydrate 또는 외부 변경 시 draft 동기화
  useEffect(() => { setDraftProfile(writerProfile); }, [writerProfile]);
  const updateDraft = <K extends keyof WriterProfileLocal>(key: K, value: WriterProfileLocal[K]) => {
    setDraftProfile(prev => ({ ...prev, [key]: value }));
  };
  // stream-agent.ts hasProfile 판정과 동일 — name/penName/works 중 하나라도 있으면 첨부.
  const profileNeedsFill = !(writerProfile.name.trim() || writerProfile.penName.trim() || writerProfile.works.trim());
  const showProfileForm = outputs.bio;
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [editMode, setEditMode] = useState(true);
  // 첫 hydrate 후 한 번만: 이미 저장된 프로필이 있으면 view 모드로.
  const initialModeSet = useRef(false);
  useEffect(() => {
    if (initialModeSet.current) return;
    initialModeSet.current = true;
    if (!profileNeedsFill) setEditMode(false);
  }, [profileNeedsFill]);
  const profileDirty =
    draftProfile.name !== writerProfile.name ||
    draftProfile.penName !== writerProfile.penName ||
    draftProfile.role !== writerProfile.role ||
    draftProfile.email !== writerProfile.email ||
    draftProfile.mainGenre !== writerProfile.mainGenre ||
    draftProfile.career !== writerProfile.career ||
    draftProfile.works !== writerProfile.works;
  const onSaveProfile = () => {
    setWriterProfile(draftProfile);
    setEditMode(false);
  };
  const onEditProfile = () => {
    setDraftProfile(writerProfile);
    setEditMode(true);
  };
  const onCancelEdit = () => {
    setDraftProfile(writerProfile);
    setEditMode(false);
  };

  // 지원사업 작성 모드 — 새 기획서 / 기존 작품 활용 / 양식 직접 채우기
  const [grantMode, setGrantMode] = useState<GrantMode>("new");
  // 라이브러리 작품 (mount 후 hydrate — SSR 안전)
  const [libworks, setLibworks] = useState<LibraryWorkRef[]>([]);
  useEffect(() => {
    setLibworks(loadJSON<LibraryWorkRef[]>(KEY.libraryWorks, []));
  }, []);
  const [selectedWorkId, setSelectedWorkId] = useState<string>("");
  const selectedWork = libworks.find(w => String(w.id) === selectedWorkId) || null;

  // 파일 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    kind: "idle" | "loading" | "error" | "ok"; message?: string;
  }>({ kind: "idle" });

  const onPickFile = () => fileInputRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // ★ V3.1.1 — Vercel 4.5MB 사전 차단 + 친절 안내
    const VERCEL_MAX = 4.5 * 1024 * 1024;
    if (file.size > VERCEL_MAX) {
      setUploadStatus({
        kind: "error",
        message: `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB / 최대 4.5MB). 본문만 복사해서 텍스트 칸에 붙여넣기 권장 (크기 제한 X).`,
      });
      return;
    }

    setUploadStatus({ kind: "loading", message: `${file.name} 분석 중…` });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });

      // content-type 검증 = Vercel 413 평문 = JSON.parse 실패 방지
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const raw = await res.text();
        setUploadStatus({
          kind: "error",
          message: res.status === 413 || /entity\s*too\s*large/i.test(raw)
            ? "파일이 서버 제한(4.5MB)을 초과합니다. 본문 붙여넣기 권장."
            : `서버 오류 (${res.status})`,
        });
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setUploadStatus({ kind: "error", message: json.error || "업로드 실패" });
        return;
      }
      setStory(prev => (prev ? prev + "\n\n" : "") + json.text);
      setUploadStatus({ kind: "ok", message: `${json.meta.filename} — ${json.meta.chars.toLocaleString()}자 추가됨` });
    } catch (err) {
      setUploadStatus({ kind: "error", message: err instanceof Error ? err.message : "네트워크 오류" });
    }
  };

  // 다운로드
  const downloadName = (project || "기획_패키지") + "_" + todayStamp();
  const downloadHtml = () => {
    if (!result) return;
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${project || "기획 패키지"}</title>
<style>
  body { font-family: "맑은 고딕", "Malgun Gothic", -apple-system, sans-serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.75; background: #fafaf7; }
  h1 { font-size: 28px; border-bottom: 2px solid #ee6e55; padding-bottom: 8px; margin-top: 32px; }
  h2 { font-size: 22px; margin-top: 28px; color: #2a2a2a; }
  h3 { font-size: 18px; margin-top: 22px; color: #444; }
  p { margin: 12px 0; }
  strong { color: #ee6e55; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f3ed; font-weight: 600; }
  blockquote { border-left: 4px solid #ee6e55; padding: 8px 16px; margin: 16px 0; background: #fff8f5; color: #555; }
  hr { border: none; border-top: 1px solid #ddd; margin: 32px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 6px 0; }
  code { background: #f0eee8; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  .meta { font-size: 12px; color: #888; margin-top: 60px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
</style>
</head>
<body>
<h1>${project || "기획 패키지"}</h1>
<div>${result
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^---$/gm, "<hr>")
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
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

  const toggle = (k: string) => {
    if (running) return;
    setOutputs(o => ({ ...o, [k]: !o[k] }));
  };

  const selectedKeys = Object.entries(outputs).filter(([, v]) => v).map(([k]) => k);
  const selectedNames = selectedKeys.map(k => ITEMS.find(i => i.k === k)?.name || k);

  const stepsForRun = ["analyze", ...selectedKeys];
  const steps = stepsForRun.map((k, i) => ({
    n: i + 1,
    key: k,
    label: STEP_LABEL[k] || k,
    state: completedSteps.includes(k) ? "done"
         : activeStep === k ? "active"
         : "",
  }));

  const generate = async (overrideKeys?: string[]) => {
    if (running) return;
    // React onClick 이 이벤트 객체를 넘기는 사고 방지 — 배열일 때만 인정한다
    const runKeys = Array.isArray(overrideKeys) ? overrideKeys : selectedKeys;
    if (runKeys.length === 0) {
      setError("산출물을 1개 이상 선택해주세요.");
      return;
    }
    setError("");
    setResult("");
    setCompletedSteps([]);
    setActiveStep("analyze");
    setRunning(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // 분석 단계는 즉시 완료 처리 (실제 LLM 호출은 full-package에서 한 번에)
      await new Promise(r => setTimeout(r, 250));
      setCompletedSteps(["analyze"]);
      setActiveStep(runKeys[0]);

      let collected = "";
      const userInput: Record<string, string> = {
        project,
        runtime,
        platform,
        target,
        tone,
        pov,
      };
      if (logline.trim()) userInput.logline = logline.trim();
      if (story.trim())   userInput.story = story.trim();

      // 지원사업 활성화 시 공고·양식·작성 모드·기존 작품을 prior로 전달
      const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + "...(이하 생략)" : s;
      const prior: Record<string, string> = {};
      if (supportEnabled) {
        prior["__지원사업_모드"] = "ON — 정부/문화재단 지원사업 신청서 톤. 공식·정량적·심사 통과 가능 수준.";
        // 공고 다중 — 여러 공고 동시 분석 (예: 영진위 + 콘진원 동시 지원)
        const okNotices = noticeFiles.filter(f => f.status === "ok" && f.text);
        if (okNotices.length === 1) {
          prior["사업_공고"] = trunc(okNotices[0].text, 5000);
        } else if (okNotices.length > 1) {
          prior["사업_공고"] = okNotices
            .map((f, i) => `[공고 ${i + 1}: ${f.filename}]\n${trunc(f.text, 3500)}`)
            .join("\n\n=== 다음 공고 ===\n\n");
          prior["__공고_갯수"] = `${okNotices.length}개 공고 동시 분석 — 각 공고의 심사 기준·우선순위를 반영해서 통합 신청서`;
        }
        // 양식 다중 — 여러 양식 (예: 영진위 양식 + 콘진원 양식)
        const okForms = formFiles.filter(f => f.status === "ok" && f.text);
        if (okForms.length === 1) {
          prior["신청서_양식"] = trunc(okForms[0].text, 4000);
        } else if (okForms.length > 1) {
          prior["신청서_양식"] = okForms
            .map((f, i) => `[양식 ${i + 1}: ${f.filename}]\n${trunc(f.text, 3000)}`)
            .join("\n\n=== 다음 양식 ===\n\n");
          prior["__양식_갯수"] = `${okForms.length}개 양식 — 각 양식 그대로 채워서 별도 출력 (양식 1, 양식 2 ... 순으로)`;
        }

        // 작성 모드별 prior 추가
        if (grantMode === "existing" && selectedWork) {
          // 라이브러리에서 선택된 작품의 본문·노트를 KEY.writeProject(id)에서 read
          try {
            const proj = loadJSON<PersistedProjectLite | null>(
              KEY.writeProject(String(selectedWork.id)),
              null
            );
            if (proj?.paras && proj.paras.length > 0) {
              const body = proj.paras
                .filter(p => p.text && p.text.trim())
                .map(p => p.text)
                .join("\n\n");
              if (body) prior["기존_작품_본문"] = trunc(body, 8000);
            }
            if (proj?.notes && proj.notes.length > 0) {
              const noteText = proj.notes
                .filter(n => n.label)
                .map(n => `- ${n.label}`)
                .join("\n");
              if (noteText) prior["작가_노트"] = noteText;
            }
          } catch { /* localStorage read 실패 무시 */ }
          prior["기존_작품_정보"] = `${selectedWork.title} · ${selectedWork.genre} · ${selectedWork.size}`;
          prior["__작성_모드"] = "기존 작품 활용 — 위 작품 본문·노트를 기반으로 신청서. 새로 창작 X, 기존 자산 정리·각색.";
        } else if (grantMode === "direct") {
          prior["__작성_모드"] = "양식 직접 채우기 — 위 신청서_양식의 빈칸을 그대로 채워 출력. 별도 산출물 형식 X. 양식의 항목·번호·구조 그대로 유지하고 작가 정보·기획안으로 채울 것.";
        } else {
          prior["__작성_모드"] = "새 기획서 — 위 작품 정보·로그라인·내용 기반으로 처음부터 신청서 작성.";
        }
      }

      const { getWorkId } = await import("@/lib/storymaker/work-id");
      const workId = project.trim() ? getWorkId(genreLetter, project.trim()) : "";

      // ★ V3.1.1 — 1단계: Haiku로 풀 컨텍스트 분석 (Pro fair use = 한도 거의 무제한)
      // 작가 입력 (제목·로그라인·줄거리·의뢰서 답변·옛 자료) 다 통합해서 = 핵심 정리
      let analysis = "";
      const analysisInput = [
        `# 작품 정보`,
        `- 제목: ${project || "(미정)"}`,
        `- 매체: ${genreLetter}`,
        ``,
        `## 한 줄 아이디어`,
        logline.trim() || "(미작성)",
        ``,
        `## 줄거리·시놉시스`,
        story.trim() || "(미작성)",
        ``,
        `## 의뢰서 답변`,
        Object.entries(userInput || {})
          .filter(([, v]) => v)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n") || "(미작성)",
      ].join("\n");

      setActiveStep("analyze");
      await streamAgent({
        body: {
          mode: "analyze",
          text: analysisInput,
          genreLetter,
          fast: true, // Haiku 강제 = 한도 안 차감
        },
        userPromptSummary: `[패키지 사전 분석] ${(project || "작품").slice(0, 50)}`,
        signal: ac.signal,
        onDelta: (chunk) => { analysis += chunk; },
        onError: (msg) => setError(msg),
      });

      // ★ V3.1.1 — 2단계: Sonnet/Opus로 산출물 생성 (= 분석 결과 활용 = 풀 컨텍스트 quality + 토큰 절약)
      await streamAgent({
        body: {
          mode: "full-package",
          idea: logline.trim() || story.trim() || project,
          genreLetter,
          fast: false, // 패키지는 깊이 — Opus/Sonnet
          userInput,
          artifactKeys: runKeys,
          analysis, // ★ Haiku 분석 결과 전달
          ...(workId ? { workId } : {}),
          ...(Object.keys(prior).length > 0 ? { prior } : {}),
        },
        userPromptSummary: `[패키지] ${project.slice(0, 50)} — ${runKeys.length}종 산출물`,
        signal: ac.signal,
        onDelta: (chunk) => {
          collected += chunk;
          setResult(prev => prev + chunk);

          // 산출물 헤더 감지 → 진행 표시 갱신
          for (const k of runKeys) {
            if (completedSteps.includes(k)) continue;
            const name = ITEMS.find(i => i.k === k)?.name;
            if (name && collected.includes(name)) {
              setActiveStep(prev => {
                if (prev === k) return prev;
                if (prev && prev !== "analyze") {
                  setCompletedSteps(cs => cs.includes(prev) ? cs : [...cs, prev]);
                }
                return k;
              });
            }
          }
        },
        onError: (msg) => {
          setError(msg);
        },
        onDone: () => {
          setActiveStep("");
          setCompletedSteps(["analyze", ...runKeys]);
        },
      });
    } catch {
      // streamAgent 안에서 onError 처리됨
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
    setActiveStep("");
  };

  // 산출물 1개만 깊이 작업 — 그 항목만 체크 + generate 호출.
  // 사용자에게 = "한 산출물 단독 호출 = 8000 토큰 다 쓸 수 있어 깊이 ↑" 의도.
  const onSingleRun = (key: string) => {
    if (running) return;
    setOutputs(() => {
      const next: Record<string, boolean> = {};
      ITEMS.forEach(it => { next[it.k] = it.k === key; });
      return next;
    });
    // setOutputs는 비동기 — generate에 직접 keys 전달
    generate([key]);
  };

  return (
    <main className="main">
      <Topbar
        eyebrow="CREATE — PLAN PACKAGE"
        title='기획 <em style="font-style:italic">패키지</em>'
        sub="의뢰 한 번으로 트리트먼트 · 시놉시스 · 캐릭터 시트 · 구성안 · 씬 리스트 · 피치덱까지 한 번에."
      />

      <div className="hero-callout">
        <div className="hero-callout-num">{String(selectedKeys.length).padStart(2, "0")}</div>
        <div className="hero-callout-text">
          <div className="hero-callout-title">한 번 의뢰하면 {selectedKeys.length}종 산출물</div>
          <div className="hero-callout-sub">
            매체에 맞춰 표준 포맷(한글·워드·엑셀·PPT)으로 자동 생성됩니다. 작가는 검토하고 다듬는 데에만 집중하세요.
          </div>
        </div>
        <Btn kind="coral" icon={I.spark} onClick={() => generate()} disabled={running || selectedKeys.length === 0}>
          {running ? "생성 중…" : "의뢰 시작"}
        </Btn>
      </div>

      <div className="process-flow">
        {steps.map(s => (
          <div key={s.key} className={"process-step " + s.state}>
            <div className="process-step-num">
              {s.state === "done" ? <span style={{ display: "inline-flex", width: 10, height: 10, color: "#fff" }}>{I.check}</span> : s.n}
            </div>
            <span className="process-step-text">{s.label}</span>
          </div>
        ))}
      </div>

      <SectionHead num={1} title="작품 정보" sub="매체와 장르부터 정해주세요. 이후 모든 산출물에 적용됩니다." />

      <div className="form-grid">
        <Field label="매체" required>
          <select className="field-select" value={genreLetter} onChange={e => setGenreLetter(e.target.value)} disabled={running}>
            {GENRES.map(g => (
              <option key={g.letter} value={g.letter} disabled={!isLaunchGenre(g.letter)}>{g.letter}. {g.name}{isLaunchGenre(g.letter) ? ` (${g.sub})` : " — 2차 오픈 예정"}</option>
            ))}
          </select>
        </Field>
        <Field label="작품명" required help="저장과 다운로드 파일명에 사용됩니다.">
          <input className="field-input" placeholder="예: 트랑로제" value={project} onChange={e => setProject(e.target.value)} disabled={running} />
        </Field>
        <Field label="러닝타임 / 분량" help="매체 표준에 자동 맞춤됩니다.">
          <input className="field-input" value={runtime} onChange={e => setRuntime(e.target.value)} disabled={running} />
        </Field>
        <Field label="편성·플랫폼">
          <input className="field-input" value={platform} onChange={e => setPlatform(e.target.value)} disabled={running} />
        </Field>
      </div>

      <SectionHead num={2} title="이야기 핵심" sub="자유롭게. 한 문장도 좋고, 한 페이지도 좋습니다. 또는 PDF/DOCX 자료 업로드." />

      <div style={{
        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
        padding: "14px 16px", marginBottom: 16,
        background: "var(--card-soft)", border: "1px dashed var(--line)",
        borderRadius: 12,
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
        <Btn icon={I.upload || I.plus} onClick={onPickFile} disabled={running || uploadStatus.kind === "loading"}>
          {uploadStatus.kind === "loading" ? "분석 중…" : "자료 업로드 (PDF / DOCX / TXT)"}
        </Btn>
        {uploadStatus.message && (
          <span style={{
            fontSize: 12,
            color: uploadStatus.kind === "error" ? "var(--coral-deep)"
                 : uploadStatus.kind === "ok" ? "var(--ink-3)" : "var(--ink-4)",
          }}>
            {uploadStatus.kind === "ok" ? "✓ " : uploadStatus.kind === "error" ? "⚠ " : ""}
            {uploadStatus.message}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-5)" }}>
          업로드한 텍스트는 아래 &quot;구체적인 내용&quot;에 추가됩니다.
        </span>
      </div>

      <div className="form-grid cols-1">
        <Field label="이야기 한 줄" help="아직 정해지지 않았다면 비워두세요. SUNNY가 제안합니다.">
          <input className="field-input" placeholder='예: "30대 직장인 여성이 옛 연인의 결혼식에서 첫사랑을 다시 만난다"' value={logline} onChange={e => setLogline(e.target.value)} disabled={running} />
        </Field>
        <Field label="구체적인 내용·욕망·세계관">
          <textarea className="field-textarea script" rows={6} placeholder="머릿속의 이미지·대사·인물 단편을 자유롭게 적어주세요. 정리되어 있지 않아도 좋습니다." value={story} onChange={e => setStory(e.target.value)} disabled={running} />
        </Field>
      </div>

      <div className="form-grid cols-3">
        <Field label="타겟"><input className="field-input" value={target} onChange={e => setTarget(e.target.value)} disabled={running} /></Field>
        <Field label="톤"><input className="field-input" value={tone} onChange={e => setTone(e.target.value)} disabled={running} /></Field>
        <Field label="시점"><input className="field-input" value={pov} onChange={e => setPov(e.target.value)} disabled={running} /></Field>
      </div>

      <SectionHead
        num={3}
        title="산출물 선택"
        sub="기본 4종이 선택돼 있습니다. 필요한 것만 켜고 끄세요. 지원사업 켜면 정부용 4종 자동 추가."
        right={<span style={{ fontSize: 12, color: "var(--ink-4)" }}>{selectedKeys.length} / {ITEMS.length} 선택됨</span>}
      />

      {/* 사용법 안내 — 두 가지 작업 방식 (전체 한 번에 vs 산출물별 깊이) */}
      <div style={{
        marginBottom: 16, padding: "14px 18px",
        background: "var(--card-soft)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.65,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 6 }}>
          ⓘ 두 가지 작업 방법
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <div>
            <strong style={{ color: "var(--ink-1)" }}>A. 전체 한 번에</strong> — 산출물 여러 개 체크 + 아래 <strong style={{ color: "var(--coral)" }}>「패키지 생성」</strong> 버튼. 빠르게 한 번에 다 받기 (각 산출물 = 적당한 분량).
          </div>
          <div>
            <strong style={{ color: "var(--ink-1)" }}>B. 산출물별 깊이</strong> — 각 카드 우측 <strong style={{ color: "var(--coral)" }}>🎯 깊이 버튼</strong> 클릭. 한 산출물만 단독 호출 = 8,000 토큰 다 사용 = <em>훨씬 더 깊고 정확</em>.
          </div>
          <div style={{ color: "var(--ink-4)", marginTop: 4 }}>
            <strong>권장 흐름:</strong> 「패키지 생성」으로 전체 미리보기 → 마음에 안 드는 산출물만 「🎯 깊이」로 다시 작업.
          </div>
        </div>
      </div>

      <div className="output-grid">
        {ITEMS.map(it => {
          const isSupport = ["intent", "production", "bio", "impact"].includes(it.k);
          // 단독 깊이 작업 가능 여부 (full-package는 모두 가능 — 모두 노출)
          const canDeep = true;
          return (
            <div
              key={it.k}
              className="output-item"
              data-on={outputs[it.k]}
              onClick={(e) => {
                // 깊이 버튼 클릭 시 = toggle 막기
                if ((e.target as HTMLElement).closest("[data-deep-btn]")) return;
                toggle(it.k);
              }}
              style={{
                ...(isSupport ? { borderLeft: "3px solid var(--coral)" } : {}),
                position: "relative",
              }}
            >
              <div className="output-check">{I.check}</div>
              <div style={{ flex: 1 }}>
                <div className="output-name">
                  {it.name}
                  {isSupport && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--coral)", fontWeight: 700 }}>지원사업</span>}
                </div>
                <div className="output-meta">{it.meta}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="output-spec">{it.spec}</div>
                {canDeep && (
                  <button
                    type="button"
                    data-deep-btn
                    onClick={(e) => {
                      e.stopPropagation();
                      onSingleRun(it.k);
                    }}
                    disabled={running}
                    title={`${it.name}만 단독 호출로 깊이 작업 (다른 산출물 미생성)`}
                    style={{
                      padding: "5px 10px", fontSize: 11, fontWeight: 700,
                      background: "transparent", color: "var(--coral-deep)",
                      border: "1px solid var(--coral)", borderRadius: 6,
                      cursor: running ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      opacity: running ? 0.4 : 1,
                    }}
                  >
                    🎯 깊이
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 작가 프로필 인라인 폼 — bio(제출자 이력) 체크됐는데 프로필 비어있을 때만 노출.
          입력하면 KEY.adminProfile에 저장되어 stream-agent가 자동 첨부 (다음 작업에도 재사용). */}
      {showProfileForm && (
        <div style={{
          marginTop: 24,
          padding: "20px 22px 22px",
          border: "1px solid var(--coral)",
          borderRadius: 14,
          background: "var(--coral-soft)",
        }}>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 14,
            marginBottom: profileExpanded ? 18 : 0,
          }}>
            <div style={{
              flex: "0 0 auto",
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--coral)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 15, lineHeight: 1,
            }}>!</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                작가 프로필 — 제출자 이력에 들어갈 정보
                {!editMode && !profileNeedsFill && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px",
                    borderRadius: 999, background: "var(--coral)", color: "#fff",
                    letterSpacing: 0,
                  }}>저장됨</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.55 }}>
                제출자 이력 산출물에 자동 첨부되는 작가 정보입니다.
                <span style={{ color: "var(--ink-4)" }}> (어드민 → 작가 탭과 동일 — 한쪽 수정 시 양쪽 반영)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProfileExpanded(v => !v)}
              aria-expanded={profileExpanded}
              aria-label={profileExpanded ? "작가 프로필 접기" : "작가 프로필 펼치기"}
              style={{
                flex: "0 0 auto",
                padding: "6px 12px", fontSize: 12, fontWeight: 700,
                background: profileExpanded ? "transparent" : "var(--coral)",
                color: profileExpanded ? "var(--ink-3)" : "#fff",
                border: `1px solid ${profileExpanded ? "var(--line)" : "var(--coral)"}`,
                borderRadius: 8, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{
                display: "inline-block",
                transform: profileExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
                fontSize: 10, lineHeight: 1,
              }}>▾</span>
              {profileExpanded ? "접기" : "펼치기"}
            </button>
          </div>

          {profileExpanded && (
          <>
          <div className="form-grid">
            <Field label="이름" required>
              <input
                className="field-input"
                value={draftProfile.name}
                placeholder="예: 홍길동"
                onChange={e => updateDraft("name", e.target.value)}
                disabled={running || !editMode}
              />
            </Field>
            <Field label="작가명 / 필명">
              <input
                className="field-input"
                value={draftProfile.penName}
                placeholder="예: 홍작가"
                onChange={e => updateDraft("penName", e.target.value)}
                disabled={running || !editMode}
              />
            </Field>
            <Field label="역할">
              <select
                className="field-select"
                value={draftProfile.role}
                onChange={e => updateDraft("role", e.target.value)}
                disabled={running || !editMode}
              >
                <option>작가 · 감독</option>
                <option>작가</option>
                <option>감독</option>
                <option>기획자</option>
              </select>
            </Field>
            <Field label="이메일" help="공모전 제출용 연락처">
              <input
                className="field-input"
                value={draftProfile.email}
                placeholder="example@email.com"
                onChange={e => updateDraft("email", e.target.value)}
                disabled={running || !editMode}
              />
            </Field>
            <Field label="주력 장르" help="3개까지">
              <input
                className="field-input"
                value={draftProfile.mainGenre}
                placeholder="예: TV 드라마, 영화, 웹소설"
                onChange={e => updateDraft("mainGenre", e.target.value)}
                disabled={running || !editMode}
              />
            </Field>
            <Field label="경력 연차">
              <select
                className="field-select"
                value={draftProfile.career}
                onChange={e => updateDraft("career", e.target.value)}
                disabled={running || !editMode}
              >
                <option>지망생</option>
                <option>1~5년</option>
                <option>5~10년</option>
                <option>10년 이상</option>
              </select>
            </Field>
          </div>

          <div className="form-grid cols-1" style={{ marginTop: 4 }}>
            <Field label="대표 작품" help="단막 · 미니시리즈 · 영화 · 웹소설 등 — 형식·연도 자유">
              <textarea
                className="field-textarea"
                rows={3}
                value={draftProfile.works}
                placeholder="예: 단막 「작품명」 (방송사, 연도) / 미니시리즈 「작품명」 (방송사, 연도, n부작) / 영화 「작품명」 (배급사, 연도)"
                onChange={e => updateDraft("works", e.target.value)}
                disabled={running || !editMode}
              />
            </Field>
          </div>

          <div style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px dashed var(--line)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.5 }}>
              {editMode
                ? (profileDirty
                    ? "작성 중 — [저장] 눌러야 다음 작업부터 자동 첨부 시작"
                    : (profileNeedsFill
                        ? "이름·작가명·대표 작품 중 하나는 채워야 자동 첨부됩니다"
                        : "변경 사항 없음 — 그대로 두려면 [수정 취소], 저장된 값 유지"))
                : "✓ 저장됨 — 다음 작업부터 자동 첨부 활성. 변경하려면 [수정] 누르세요."}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {editMode ? (
                <>
                  {!profileNeedsFill && (
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      disabled={running}
                      style={{
                        padding: "7px 14px", fontSize: 12, fontWeight: 600,
                        background: "transparent", color: "var(--ink-3)",
                        border: "1px solid var(--line)", borderRadius: 8,
                        cursor: running ? "not-allowed" : "pointer",
                      }}
                    >수정 취소</button>
                  )}
                  <button
                    type="button"
                    onClick={onSaveProfile}
                    disabled={running || !profileDirty}
                    style={{
                      padding: "7px 16px", fontSize: 12, fontWeight: 700,
                      background: !profileDirty ? "var(--line)" : "var(--coral)",
                      color: !profileDirty ? "var(--ink-4)" : "#fff",
                      border: `1px solid ${!profileDirty ? "var(--line)" : "var(--coral)"}`,
                      borderRadius: 8,
                      cursor: (running || !profileDirty) ? "not-allowed" : "pointer",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >저장</button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onEditProfile}
                  disabled={running}
                  style={{
                    padding: "7px 16px", fontSize: 12, fontWeight: 700,
                    background: "transparent", color: "var(--coral-deep)",
                    border: "1px solid var(--coral)", borderRadius: 8,
                    cursor: running ? "not-allowed" : "pointer",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >✏ 수정</button>
              )}
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* 04. 지원사업 모드 (선택) */}
      <SectionHead
        num={4}
        title="지원사업 (선택)"
        sub="정부·문화재단 지원사업 신청서 작성 모드. 켜면 산출물 4종(지원사업) 자동 체크 + 공고·양식 업로드 가능."
        right={
          <button
            type="button"
            onClick={() => toggleSupport(!supportEnabled)}
            disabled={running}
            style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 700,
              background: supportEnabled ? "var(--coral)" : "transparent",
              color: supportEnabled ? "#fff" : "var(--ink-3)",
              border: `1px solid ${supportEnabled ? "var(--coral)" : "var(--line)"}`,
              borderRadius: 8, cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {supportEnabled ? "● 지원사업 ON" : "○ OFF"}
          </button>
        }
      />

      {supportEnabled && (
        <>
        {/* 작성 모드 — 새 기획서 / 기존 작품 / 양식 직접 채우기 */}
        <div style={{
          padding: "16px 18px", marginBottom: 14,
          border: "1px solid var(--line)",
          borderRadius: 12, background: "var(--card-soft)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 4 }}>
            ✍ 작성 모드
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginBottom: 12, lineHeight: 1.5 }}>
            지원사업 신청서를 어떻게 만들지 — 새로 창작할지, 기존 작품을 활용할지, 업로드한 양식 그대로 채울지
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr" }}>
            {([
              { id: "new" as GrantMode,      label: "새 기획서",       desc: "위 작품 정보로 처음부터 작성", icon: "📝" },
              { id: "existing" as GrantMode, label: "기존 작품 활용",  desc: "라이브러리 작품 본문·노트 기반", icon: "📚" },
              { id: "direct" as GrantMode,   label: "양식 직접 채우기", desc: "양식 빈칸을 그대로 채움",      icon: "📋" },
            ]).map(m => {
              const on = grantMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGrantMode(m.id)}
                  disabled={running}
                  style={{
                    padding: "12px 14px", textAlign: "left",
                    background: on ? "var(--coral-soft)" : "transparent",
                    color: on ? "var(--coral-deep)" : "var(--ink-2)",
                    border: `1px solid ${on ? "var(--coral)" : "var(--line)"}`,
                    borderRadius: 10, cursor: running ? "not-allowed" : "pointer",
                    display: "flex", flexDirection: "column", gap: 4,
                  }}
                >
                  <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 2 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: on ? "var(--coral-deep)" : "var(--ink-4)", lineHeight: 1.45 }}>
                    {m.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {grantMode === "existing" && (
            <div style={{
              marginTop: 14, paddingTop: 14,
              borderTop: "1px dashed var(--line)",
            }}>
              <Field
                label="라이브러리 작품 선택"
                help={libworks.length === 0
                  ? "아직 라이브러리에 등록된 작품이 없습니다. Write에서 작품을 작성하면 자동 등록됩니다."
                  : `${libworks.length}편 중 선택 — 본문·노트가 신청서 prior로 자동 첨부됩니다`}
              >
                <select
                  className="field-select"
                  value={selectedWorkId}
                  onChange={e => setSelectedWorkId(e.target.value)}
                  disabled={running || libworks.length === 0}
                >
                  <option value="">— 작품 선택 —</option>
                  {libworks.map(w => (
                    <option key={String(w.id)} value={String(w.id)}>
                      {w.title} · {w.genre} · {w.size} ({w.stage})
                    </option>
                  ))}
                </select>
              </Field>
              {selectedWork && (
                <div style={{
                  marginTop: 8, padding: "10px 14px",
                  background: "var(--coral-soft)", borderRadius: 8,
                  fontSize: 12, color: "var(--coral-deep)", lineHeight: 1.55,
                }}>
                  ✓ <strong>{selectedWork.title}</strong> 선택됨 — {selectedWork.genre} · {selectedWork.size} · 진척 {Math.round(selectedWork.prog * 100)}% · 마지막 수정 {selectedWork.updated}
                </div>
              )}
            </div>
          )}

          {grantMode === "direct" && (
            <div style={{
              marginTop: 14, paddingTop: 14,
              borderTop: "1px dashed var(--line)",
              fontSize: 12, color: "var(--ink-3)", lineHeight: 1.65,
            }}>
              <strong style={{ color: "var(--ink-1)" }}>양식 직접 채우기 모드</strong> — 아래에서 신청서 양식을 업로드하세요. AI가 양식의 항목·번호·구조 그대로 유지하면서 빈칸만 채워 출력합니다. 별도 산출물(트리트먼트·시놉시스 등)은 만들지 않고 양식 한 파일로.
            </div>
          )}
        </div>

        {/* 공고·양식 업로드 (모든 모드 공통, direct 모드는 양식 필수). 다중 업로드. */}
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr" }}>
          {/* 공고 (다중) */}
          <div style={{
            padding: "16px 18px",
            border: `1px solid ${noticeFiles.some(f => f.status === "ok") ? "var(--coral)" : "var(--line)"}`,
            borderRadius: 12, background: "var(--card-soft)",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)" }}>
                📋 사업 공고
              </div>
              {noticeFiles.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--coral)", fontWeight: 600 }}>
                  {noticeFiles.length}개
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.5 }}>
              정부·재단 공고 (영진위·콘진원·문진원 등). 여러 개 동시 지원 가능.
            </div>

            {noticeFiles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {noticeFiles.map((f, i) => (
                  <div key={f.id} style={{
                    padding: "8px 10px",
                    background: f.status === "error" ? "rgba(192,57,43,0.08)" : "var(--bg)",
                    border: `1px solid ${f.status === "ok" ? "var(--coral)" : f.status === "error" ? "#c0392b" : "var(--line)"}`,
                    borderRadius: 8,
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 11.5,
                  }}>
                    <span style={{ fontSize: 10, color: "var(--ink-5)", fontWeight: 700, minWidth: 18 }}>
                      #{i + 1}
                    </span>
                    <span style={{
                      flex: 1, color: f.status === "error" ? "#c0392b" : "var(--ink-2)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {f.status === "ok" ? "✓ " : f.status === "error" ? "⚠ " : "… "}
                      {f.message || f.filename}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSupportFile("notice", f.id)}
                      disabled={running || f.status === "loading"}
                      title="제거"
                      style={{
                        padding: "2px 6px", fontSize: 11,
                        background: "transparent", color: "var(--ink-4)",
                        border: "1px solid var(--line)", borderRadius: 4,
                        cursor: running ? "not-allowed" : "pointer",
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <input ref={noticeInputRef} type="file" accept=".pdf,.docx,.txt,.md,.hwp"
              onChange={(e) => handleSupportUpload(e, "notice")} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn icon={I.upload || I.plus} onClick={() => noticeInputRef.current?.click()}
                disabled={running || noticeFiles.some(f => f.status === "loading")}>
                {noticeFiles.length === 0 ? "공고 업로드" : "+ 공고 추가"}
              </Btn>
              {/* ★ 메타데이터 자동 추출 (D 단계) */}
              {noticeFiles.some(f => f.status === "ok") && (
                <button
                  type="button"
                  onClick={extractGrantMeta}
                  disabled={extractingMeta || running}
                  style={{
                    padding: "8px 14px", fontSize: 12, fontWeight: 600,
                    background: extractingMeta ? "var(--card-soft)" : "var(--coral-soft)",
                    color: "var(--coral-deep)",
                    border: "1px solid var(--coral)",
                    borderRadius: 6,
                    cursor: extractingMeta ? "wait" : "pointer",
                    opacity: extractingMeta ? 0.6 : 1,
                  }}
                  title="공고 본문에서 마감일·심사기준·예산 등 자동 추출 (Haiku, 빠름)"
                >
                  {extractingMeta ? "추출 중…" : "📊 메타 추출"}
                </button>
              )}
            </div>

            {/* 추출 결과 카드 */}
            {grantMeta && (
              <div style={{
                marginTop: 10, padding: 14, background: "var(--card)",
                border: "1px solid var(--coral)", borderRadius: 10, fontSize: 12,
                color: "var(--ink-2)", lineHeight: 1.7,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--coral-deep)", marginBottom: 8 }}>
                  📊 추출된 메타데이터
                </div>
                {[
                  ["title", "제목"],
                  ["agency", "주관"],
                  ["deadline", "마감"],
                  ["submission_method", "접수"],
                  ["budget_total", "총 예산"],
                  ["budget_per_project", "건당"],
                  ["support_period", "지원 기간"],
                  ["eligibility", "자격"],
                  ["selection_criteria", "심사 기준"],
                  ["judges", "심사위원"],
                  ["required_documents", "제출 서류"],
                  ["format_constraints", "양식 제약"],
                  ["key_dates", "주요 일정"],
                  ["contact", "문의"],
                  ["notes", "주의사항"],
                ].map(([k, label]) => {
                  const v = grantMeta[k as keyof GrantMeta];
                  if (!v || !v.trim()) return null;
                  return (
                    <div key={k} style={{ marginBottom: 4, display: "flex", gap: 8 }}>
                      <span style={{ fontWeight: 700, minWidth: 70, color: "var(--ink-4)" }}>{label}:</span>
                      <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{v}</span>
                    </div>
                  );
                })}
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-5)" }}>
                  ※ 자동 추출 = 부정확할 수 있음. 작가가 = 본문에서 직접 확인 필수.
                </div>
              </div>
            )}
            {metaError && (
              <div style={{
                marginTop: 10, padding: 10, background: "rgba(220,38,38,0.05)",
                border: "1px solid rgba(220,38,38,0.3)", borderRadius: 6,
                fontSize: 12, color: "rgb(180,30,30)",
              }}>
                ⚠ 메타 추출 실패: {metaError}
              </div>
            )}
          </div>

          {/* 양식 (다중) */}
          <div style={{
            padding: "16px 18px",
            border: `1px solid ${formFiles.some(f => f.status === "ok") ? "var(--coral)" : "var(--line)"}`,
            borderRadius: 12, background: "var(--card-soft)",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)" }}>
                📝 신청서 양식
              </div>
              {formFiles.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--coral)", fontWeight: 600 }}>
                  {formFiles.length}개
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.5 }}>
              작성할 양식 파일. 여러 양식 = 각각 채워서 별도 출력.
            </div>

            {formFiles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {formFiles.map((f, i) => (
                  <div key={f.id} style={{
                    padding: "8px 10px",
                    background: f.status === "error" ? "rgba(192,57,43,0.08)" : "var(--bg)",
                    border: `1px solid ${f.status === "ok" ? "var(--coral)" : f.status === "error" ? "#c0392b" : "var(--line)"}`,
                    borderRadius: 8,
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 11.5,
                  }}>
                    <span style={{ fontSize: 10, color: "var(--ink-5)", fontWeight: 700, minWidth: 18 }}>
                      #{i + 1}
                    </span>
                    <span style={{
                      flex: 1, color: f.status === "error" ? "#c0392b" : "var(--ink-2)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {f.status === "ok" ? "✓ " : f.status === "error" ? "⚠ " : "… "}
                      {f.message || f.filename}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSupportFile("form", f.id)}
                      disabled={running || f.status === "loading"}
                      title="제거"
                      style={{
                        padding: "2px 6px", fontSize: 11,
                        background: "transparent", color: "var(--ink-4)",
                        border: "1px solid var(--line)", borderRadius: 4,
                        cursor: running ? "not-allowed" : "pointer",
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <input ref={formInputRef} type="file" accept=".pdf,.docx,.txt,.md,.hwp"
              onChange={(e) => handleSupportUpload(e, "form")} style={{ display: "none" }} />
            <Btn icon={I.upload || I.plus} onClick={() => formInputRef.current?.click()}
              disabled={running || formFiles.some(f => f.status === "loading")}>
              {formFiles.length === 0 ? "양식 업로드" : "+ 양식 추가"}
            </Btn>
          </div>
        </div>
        </>
      )}

      <div style={{ marginTop: 28, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Btn kind="coral" icon={I.spark} onClick={() => generate()} disabled={running || selectedKeys.length === 0}>
          {running ? "생성 중…" : "패키지 생성"}
        </Btn>
        {running && <Btn onClick={stop}>중지</Btn>}
        <Btn icon={I.save} disabled>임시 저장</Btn>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-4)" }}>
          {running
            ? `진행 — ${activeStep ? STEP_LABEL[activeStep] : "준비 중"} (${completedSteps.filter(s => s !== "analyze").length}/${selectedKeys.length})`
            : "예상 소요 시간 — 약 2~3분"}
        </span>
      </div>

      {error && (
        <div style={{
          marginTop: 16,
          padding: "12px 16px",
          background: "var(--coral-soft)",
          border: "1px solid rgba(238,110,85,0.3)",
          borderRadius: 10,
          color: "var(--coral-deep)",
          fontSize: 13,
        }}>
          ⚠ {error}
        </div>
      )}

      {(result || running) && (
        <>
          <SectionHead
            num={4}
            title="패키지 결과"
            sub={`선택한 ${selectedKeys.length}종 산출물이 한 번에 흘러나옵니다 — ${selectedNames.join(" · ")}`}
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
            borderRadius: 14,
            padding: "24px 26px",
            minHeight: 200,
          }}>
            {result
              ? <Markdown text={result} />
              : <div style={{ color: "var(--ink-4)", fontSize: 13 }}>{running ? "…" : ""}</div>}
          </article>
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <Tip>
          작가의 의도가 충분히 적힐수록 결과물이 정확해집니다. 한 줄로 시작해서 작업하면서 채워도 됩니다.
        </Tip>
      </div>

      <div style={{ height: 60 }}></div>
    </main>
  );
}
