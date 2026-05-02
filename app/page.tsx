"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { KEY, loadJSON, usePersistedState } from "@/lib/persist";
import {
  WORKFLOWS,
  WORKFLOW_LETTERS,
  HERO_PLACEHOLDERS,
  getWorkflow,
  type Field as WorkflowField,
} from "@/lib/workflows";

export default function HomePage() {
  return (
    <AppShell>
      <HomeMain />
    </AppShell>
  );
}

interface LibraryWork {
  id: number | string;
  title: string;
  genre: string;
  letter: string;
  stage?: string;
  prog: number;
  updated: string;
  size?: string;
  next?: string;
  meta?: string;
}

// 매체별 핵심 결정 필드 (sub_genre 제외, hero 옆 부가 dropdown 1개)
// — 사장님 사양: A=episodes, B=runtime, C=total_episodes, G=format_type,
//   H=chars_per_ep, J=length_type, K=area, M=ep_length 등 매체 핵심 결정
const PRIMARY_DECISION_KEY: Record<string, string> = {
  A: "episodes",
  B: "runtime",
  C: "total_episodes",
  D: "target_age",
  E: "ep_length",
  F: "length_target",
  G: "format_type",
  H: "chars_per_ep",
  I: "venue_size",
  J: "length_type",
  K: "area",
  L: "branch_count",
  M: "ep_length",
};

function findPrimarySelectField(letter: string): WorkflowField | null {
  const wf = getWorkflow(letter);
  const targetKey = PRIMARY_DECISION_KEY[letter];
  if (targetKey) {
    const f = wf.fields.find(x => x.key === targetKey && x.type === "select");
    if (f) return f;
  }
  // fallback: first non-sub_genre select
  return wf.fields.find(x => x.type === "select" && x.key !== "sub_genre") ?? null;
}

function HomeMain() {
  const router = useRouter();
  const I = ICONS;
  const G = GENRES;
  const [idea, setIdea] = usePersistedState<string>(KEY.homeIdea, "");

  // 매체: localStorage homeMediumOverride > adminPrimaryMedium > "A"
  // 진입 시 초기값 결정 (SSR-safe). 카드 클릭 시 즉시 setMedium + override 저장.
  const [medium, setMedium] = useState<string>("A");
  const [primaryDecisionValue, setPrimaryDecisionValue] = useState<string>("");

  useEffect(() => {
    const override = loadJSON<string | null>(KEY.homeMediumOverride, null);
    const admin = loadJSON<string | null>(KEY.adminPrimaryMedium, null);
    const next = (override && WORKFLOWS[override]) ? override
                : (admin && WORKFLOWS[admin]) ? admin
                : "A";
    setMedium(next);
  }, []);

  // 매체 변경 시 부가 dropdown 기본값 리셋
  useEffect(() => {
    const f = findPrimarySelectField(medium);
    if (f && f.options && f.options.length) {
      const def = (typeof f.default === "string" && f.options.includes(f.default))
        ? f.default
        : f.options[0];
      setPrimaryDecisionValue(def);
    } else {
      setPrimaryDecisionValue("");
    }
  }, [medium]);

  const wf = getWorkflow(medium);
  const primaryField = useMemo(() => findPrimarySelectField(medium), [medium]);

  // 카드 클릭 = 즉시 매체 전환 (페이지 이동 X). override를 localStorage에 저장.
  const switchMedium = (letter: string) => {
    if (!WORKFLOWS[letter]) return;
    setMedium(letter);
    try {
      window.localStorage.setItem(KEY.homeMediumOverride, JSON.stringify(letter));
    } catch { /* ignore */ }
  };

  // 영감 풀 — 매번 새로고침 시 랜덤 3개 노출
  const SAMPLE_POOL = useMemo(() => [
    "잃어버린 약혼반지를 추적하는 도둑이 진짜 도둑은 자신이었다는 걸 깨닫는 이야기",
    "AI 작가가 작성한 시나리오가 실제 살인사건과 일치한다는 신고가 들어온다",
    "엘리트 입시 학원 1등 학생이, 어느 날 자기 시험지가 백지로 제출됐다는 걸 알게 된다",
    "20년 만에 돌아온 첫사랑이 사실은 살인범이었다는 걸 알게 된 형사",
    "치매에 걸린 아버지의 일기장에서 가족 모두가 모르는 비밀이 드러난다",
    "회귀한 황녀가 자신의 살해범을 길들이기로 한다",
    "평범한 대학생이 게임 속 NPC에게 사랑받는 이야기",
    "1990년대 서울의 비디오 가게 사장이 실종된 학생을 찾아 나선다",
    "한 평범한 주부가 30년 동안 운영해온 분식집의 마지막 일주일",
    "지방 소멸 위기 마을에 들어온 청년 화가의 1년",
    "메뉴판이 매일 다른 식당. 손님은 그 메뉴가 자기 인생이라는 걸 알게 된다",
    "엄마와 단둘이 사는 고2가 옥상에서 이상한 노트를 줍는다",
    "회사에서 매일 마주치던 인턴이 사실 미래에서 온 자기 자식이었다",
    "조선의 악귀들이 홍대에서 깨어난다. 평범한 아르바이트생 셋의 몸을 빌려서",
    "매일 같은 꿈을 꾸는 디자이너. 꿈에서 만난 사람이 어느 날 회의실에 나타난다",
    "은퇴한 형사가 자신이 30년 전 종결한 사건이 미해결이었음을 깨닫는다",
    "한밤중 라디오 사연을 보낸 청취자가 다음 날 살해당한다",
    "지하철 같은 칸에 매일 마주치는 낯선 사람이 자기 자신의 미래라면",
  ], []);

  // 클라이언트에서만 셔플 (SSR/CSR hydration 불일치 방지)
  const [samples, setSamples] = useState<string[]>(() => SAMPLE_POOL.slice(0, 3));
  useEffect(() => {
    const shuffled = [...SAMPLE_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    setSamples(shuffled);
  }, [SAMPLE_POOL]);

  // 진행 중인 작품 — library 누적 데이터 중 현재 매체와 일치하는 최근 3개
  const [recent, setRecent] = useState<LibraryWork[]>([]);
  useEffect(() => {
    const works = loadJSON<LibraryWork[]>(KEY.libraryWorks, []);
    const inProgress = works
      .filter(w => (w.prog ?? 0) < 1)
      .filter(w => w.letter === medium)
      .slice(0, 3);
    setRecent(inProgress);
  }, [medium]);

  // STATS — library 누적 기반 실시간 계산
  const [stats, setStats] = useState({ done: 0, wip: 0, pages: 0, calls: 0 });
  useEffect(() => {
    const works = loadJSON<LibraryWork[]>(KEY.libraryWorks, []);
    const done = works.filter(w => (w.prog ?? 0) >= 1).length;
    const wip = works.filter(w => (w.prog ?? 0) < 1).length;
    setStats({ done, wip, pages: 0, calls: 0 });
  }, []);

  const heroPlaceholder = HERO_PLACEHOLDERS[medium]
    || "예) 번아웃으로 퇴사한 30대 직장인이 시골 마을 작은 카페를 인수하면서 벌어지는 일…";
  // 매체 이름 받침 따라 "을/를" 결정 (한국어 조사 자동)
  const lastChar = wf.name.charAt(wf.name.length - 1);
  const lastCode = lastChar.charCodeAt(0);
  const hasJongseong = lastCode >= 0xac00 && lastCode <= 0xd7a3
    ? ((lastCode - 0xac00) % 28) !== 0
    : false;
  const eyebrowText = `오늘은 어떤 ${wf.name}${hasJongseong ? "을" : "를"} 시작할까요`;

  // V1 정신 — 한 버튼. 의뢰서 → 개요 → 컨펌 → 본문 (정공법 한 흐름).
  const launch = () => {
    if (!idea.trim()) return;
    const params = new URLSearchParams({
      mode: "new",
      idea: idea.trim(),
      genre: medium,
    });
    if (primaryField && primaryDecisionValue) {
      params.set(primaryField.key, primaryDecisionValue);
    }
    router.push(`/develop?${params.toString()}`);
  };

  return (
    <main className="main">
      <Topbar
        eyebrow="WORKSPACE — HOME"
        title='Good <em style="font-style:italic">morning</em>, 작가님<span class="dot">.</span>'
        sub="머릿속 한 문장이면 충분합니다. SUNNY가 로그라인부터 첫 부분 샘플까지 만들어 드려요."
      />

      {/* HERO — 매체 어댑티브 single-input */}
      <div className="home-hero">
        <div className="home-hero-eyebrow">
          <span className="home-hero-bullet"></span>
          {eyebrowText}
        </div>

        <textarea
          className="home-hero-input"
          rows={3}
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder={heroPlaceholder}
        />

        <div className="home-hero-controls">
          <div className="home-hero-genre">
            <label className="home-hero-genre-label">매체</label>
            <select
              className="home-hero-genre-select"
              value={medium}
              onChange={e => switchMedium(e.target.value)}
            >
              {WORKFLOW_LETTERS.map(letter => {
                const w = WORKFLOWS[letter];
                return (
                  <option key={letter} value={letter}>
                    {letter}. {w.name}
                  </option>
                );
              })}
            </select>
            {primaryField && primaryField.options && (
              <select
                className="home-hero-genre-spec home-hero-format-select"
                value={primaryDecisionValue}
                onChange={e => setPrimaryDecisionValue(e.target.value)}
                title={primaryField.label}
              >
                {primaryField.options.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>

          <div className="home-hero-actions">
            <span className="home-hero-count">
              <span className="num">{idea.length}</span><span className="sep">/</span>200
            </span>
            <button
              className="home-hero-launch"
              disabled={!idea.trim()}
              onClick={launch}
            >
              <span className="home-hero-launch-icon">{I.spark}</span>
              <span className="home-hero-launch-text">Start Writing</span>
              <span className="home-hero-launch-arrow">{I.arrow}</span>
            </button>
          </div>
        </div>

        <div className="home-hero-samples">
          <span className="home-hero-samples-label">— 영감이 필요하면</span>
          {samples.map((s, i) => (
            <button key={i} className="home-hero-sample" onClick={() => setIdea(s)}>
              {s.length > 32 ? s.slice(0, 32) + "…" : s}
            </button>
          ))}
        </div>
      </div>

      {/* CONTINUE — 이어서 작업하기 (현재 매체 작품만) */}
      <SectionHead
        num={1}
        title="이어서 작업하기"
        sub={`작가님이 마지막으로 머문 ${wf.name} 작품`}
        right={
          <button className="section-link" onClick={() => router.push("/library")}>
            전체 라이브러리
            <span className="section-link-arrow">{I.arrow}</span>
          </button>
        }
      />

      {recent.length === 0 ? (
        <div style={{
          padding: "40px 24px", textAlign: "center", color: "var(--ink-3)",
          border: "1px dashed var(--line)", borderRadius: 14, background: "var(--card-soft)",
          fontSize: 14, lineHeight: 1.7,
        }}>
          이 매체({wf.name}) 진행 중 작품이 없습니다.
          <br />
          위에서 한 줄 아이디어로 시작해보세요.
        </div>
      ) : (
        <div className="home-continue-grid">
          {recent.map((w, i) => (
            <div key={w.id ?? i} className="home-continue-card"
              onClick={() => router.push(`/write?mode=continue&project=${encodeURIComponent(w.title)}`)}>
              <div className="home-continue-top">
                <div className="home-continue-icon">{I[w.letter]}</div>
                <div className="home-continue-genre">{w.genre}</div>
              </div>
              <div className="home-continue-title">{w.title}</div>
              <div className="home-continue-next">
                <span className="home-continue-next-label">NEXT</span>
                <span className="home-continue-next-text">{w.next ?? "이어쓰기 위치 미정"}</span>
              </div>
              <div className="home-continue-prog">
                <div className="home-continue-prog-bar">
                  <div className="home-continue-prog-fill" style={{ width: (w.prog * 100) + "%" }}></div>
                </div>
                <span className="home-continue-prog-meta">{w.meta ?? w.size ?? ""} · {Math.round(w.prog * 100)}%</span>
              </div>
              <div className="home-continue-foot">
                <span className="home-continue-updated">{w.updated}</span>
                <span className="home-continue-cta">
                  이어쓰기
                  <span className="home-continue-cta-arrow">{I.arrow}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GENRE GRID — 작업실 전환 */}
      <SectionHead
        num={3}
        title="작업실 전환"
        sub="다른 매체로 즉시 변환 — 클릭하면 위 hero가 그 매체에 맞춰 바뀝니다"
      />

      <div className="home-genre-mini">
        {G.map(g => {
          const isActive = g.letter === medium;
          return (
            <button
              key={g.letter}
              className="home-genre-mini-card"
              onClick={() => switchMedium(g.letter)}
              style={isActive ? {
                borderColor: "var(--coral)",
                borderWidth: 2,
                fontWeight: 700,
              } : undefined}
              title={isActive ? `현재 작업실: ${g.name}` : `${g.name}로 전환`}
            >
              <span className="home-genre-mini-icon">{I[g.letter]}</span>
              <span className="home-genre-mini-name" style={isActive ? { color: "var(--coral)" } : undefined}>
                {g.name}
              </span>
              <span className="home-genre-mini-sub">{g.sub}</span>
            </button>
          );
        })}
      </div>

      {/* STATS */}
      <div className="stats" style={{ marginTop: 36 }}>
        <div className="stat">
          <div className="stat-label">완성 작품</div>
          <div className="stat-value">{stats.done}<span className="unit">편</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">진행 중</div>
          <div className="stat-value">{stats.wip}<span className="unit">편</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">누적 분량</div>
          <div className="stat-value">{stats.pages}<span className="unit">p</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">SUNNY 사용</div>
          <div className="stat-value">{stats.calls}<span className="unit">회</span></div>
        </div>
      </div>

      <div className="footer-band">
        <div className="footer-band-left">
          <span>SUNNY Story Maker</span>
          <span>·</span>
          <span>v2.2 (Develop)</span>
        </div>
        <div>마지막 동기화 — 방금 전</div>
      </div>
    </main>
  );
}
