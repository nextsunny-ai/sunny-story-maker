"use client";

import { Fragment, useState } from "react";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Btn } from "@/components/ui";
import { KEY, usePersistedState } from "@/lib/persist";

export default function AdminPage() {
  return (
    <AppShell>
      <AdminMain />
    </AppShell>
  );
}

function AdminMain() {
  const [tab, setTab] = useState<"writer" | "system">("writer");

  return (
    <main className="main">
      <Topbar
        eyebrow="ADMIN"
        title='어드민<span class="dot">.</span>'
        sub="작가 프로필과 시스템 설정. SUNNY가 더 잘 도울 수 있도록 본인의 정보를 알려주세요."
      />

      <div className="adm-tabs">
        <button
          className="adm-tab"
          data-active={tab === "writer"}
          onClick={() => setTab("writer")}
        >
          <span className="adm-tab-num">— 01</span>
          <span className="adm-tab-label">작가</span>
        </button>
        <button
          className="adm-tab"
          data-active={tab === "system"}
          onClick={() => setTab("system")}
        >
          <span className="adm-tab-num">— 02</span>
          <span className="adm-tab-label">시스템</span>
        </button>
      </div>

      {tab === "writer" ? <WriterTab /> : <SystemTab />}

      <div style={{ height: 60 }}></div>
    </main>
  );
}

const SKILL_CATEGORIES = [
  { id: "loved", label: "좋아하는 표현", hint: "이런 식으로 써줘 — 자주 쓰고 싶은 패턴" },
  { id: "rejected", label: "피하고 싶은 표현", hint: "이건 쓰지 마 — AI투·클리셰·번역체 등" },
  { id: "direction", label: "자주 쓰는 디렉션", hint: "장면·인물·구조에 자주 주는 가이드" },
  { id: "metaphor", label: "비유·메타포", hint: "이 작가가 자주 쓰는 비유 체계" },
  { id: "free", label: "자유 메모", hint: "분류 없는 노하우 — 스타일·룰 무엇이든" },
];

interface WriterProfile {
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

const EMPTY_PROFILE: WriterProfile = {
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

interface LearningEntry {
  date: string;        // YYYY-MM-DD
  category: string;    // loved | rejected | direction | metaphor | free
  text: string;
}

function WriterTab() {
  const I = ICONS;
  const [skillCat, setSkillCat] = useState<string>("loved");
  const cur = SKILL_CATEGORIES.find(c => c.id === skillCat) || SKILL_CATEGORIES[0];

  const [profile, setProfile] = usePersistedState<WriterProfile>(KEY.adminProfile, EMPTY_PROFILE);
  const [learning, setLearning] = usePersistedState<LearningEntry[]>(KEY.adminLearning, []);
  const [draft, setDraft] = useState<string>("");

  const updateProfile = <K extends keyof WriterProfile>(key: K, value: WriterProfile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const onSaveLearning = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      alert("학습시킬 내용을 입력해 주세요.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    setLearning(prev => [...prev, { date: today, category: skillCat, text: trimmed }]);
    setDraft("");
  };

  const learningStats = (() => {
    const counts: Record<string, number> = { loved: 0, rejected: 0, direction: 0, metaphor: 0, free: 0 };
    let chars = 0;
    for (const e of learning) {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
      chars += e.text.length;
    }
    const lastDate = learning.length ? learning[learning.length - 1].date : "—";
    return { count: learning.length, chars, counts, lastDate };
  })();

  const learningHistory = learning.length === 0
    ? "(아직 학습 기록이 없습니다.)"
    : [...learning].reverse().map(e => {
        const label = SKILL_CATEGORIES.find(c => c.id === e.category)?.label ?? e.category;
        return `## ${e.date}\n[${label}] ${e.text}`;
      }).join("\n\n");

  const downloadLearningMd = () => {
    if (learning.length === 0) {
      alert("아직 누적된 학습이 없습니다.");
      return;
    }
    const author = profile.penName || profile.name || "작가";
    const header = `# ${author} 누적 학습\n\n총 ${learning.length}건 · ${learningStats.chars.toLocaleString()}자\n생성일: ${new Date().toISOString().slice(0, 10)}\n\n---\n\n`;
    const body = learningHistory;
    const blob = new Blob([header + body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${author}_학습_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const showAllLearning = () => {
    if (learning.length === 0) {
      alert("아직 누적된 학습이 없습니다.\n\n새 학습을 추가하면 여기에서 전체 목록을 볼 수 있어요.");
      return;
    }
    alert(`전체 학습 — ${learning.length}건 · ${learningStats.chars.toLocaleString()}자\n\n` + learningHistory.slice(0, 1500) + (learningHistory.length > 1500 ? "\n\n…(이하 생략 — .md 다운로드로 전체 보기)" : ""));
  };

  const initial = (profile.name || "작").trim().charAt(0);
  const displayName = profile.penName || profile.name || "이름을 입력해주세요";
  const displayRole = profile.role || "역할 미정";
  const displayBio = profile.works || "대표 작품을 입력하면 여기에 표시됩니다.";

  return (
    <Fragment>
      <div className="adm-profile">
        <div className="adm-profile-avatar">
          <span>{initial}</span>
        </div>
        <div className="adm-profile-text">
          <div className="adm-profile-eyebrow">내 프로필</div>
          <div className="adm-profile-name">{displayName}</div>
          <div className="adm-profile-role">{displayRole}</div>
          <div className="adm-profile-bio">{displayBio}</div>
        </div>
        <div className="adm-profile-side">
          <Btn kind="primary" icon={I.write}>편집</Btn>
        </div>
      </div>

      <SectionHead num={1} title="기본 정보" sub="작품 저장 시 자동으로 들어갑니다." />

      <div className="form-grid">
        <Field label="이름" required>
          <input
            className="field-input"
            value={profile.name}
            placeholder="예: 홍길동"
            onChange={e => updateProfile("name", e.target.value)}
          />
        </Field>
        <Field label="작가명 / 필명">
          <input
            className="field-input"
            value={profile.penName}
            placeholder="예: 홍작가"
            onChange={e => updateProfile("penName", e.target.value)}
          />
        </Field>
        <Field label="역할">
          <select
            className="field-select"
            value={profile.role}
            onChange={e => updateProfile("role", e.target.value)}
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
            value={profile.email}
            placeholder="example@email.com"
            onChange={e => updateProfile("email", e.target.value)}
          />
        </Field>
      </div>

      <SectionHead num={2} title="활동 정보" sub="SUNNY가 작가의 톤과 경험치에 맞춰 결과물을 조정합니다." />

      <div className="form-grid">
        <Field label="주력 장르" help="3개까지 선택">
          <input
            className="field-input"
            value={profile.mainGenre}
            placeholder="예: TV 드라마, 영화, 웹소설"
            onChange={e => updateProfile("mainGenre", e.target.value)}
          />
        </Field>
        <Field label="경력 연차">
          <select
            className="field-select"
            value={profile.career}
            onChange={e => updateProfile("career", e.target.value)}
          >
            <option>지망생</option>
            <option>1~5년</option>
            <option>5~10년</option>
            <option>10년 이상</option>
          </select>
        </Field>
        <Field label="대표 작품" span={2}>
          <textarea
            className="field-textarea"
            rows={3}
            value={profile.works}
            placeholder="예: 단막 「작품명」 (방송사, 연도) / 미니시리즈 「작품명」 (방송사, 연도, n부작)"
            onChange={e => updateProfile("works", e.target.value)}
          />
        </Field>
      </div>

      <SectionHead num={3} title="작가의 선호" sub="SUNNY가 도움말을 줄 때 참고합니다." />

      <div className="form-grid cols-1">
        <Field label="피하고 싶은 표현 · 스타일" help="AI투, 클리셰, 어휘 등 자유롭게.">
          <textarea
            className="field-textarea"
            rows={3}
            value={profile.avoid}
            placeholder="예: 격언체 대사 ✗ / 영어 번역체 ✗ / '당신' 호명 ✗"
            onChange={e => updateProfile("avoid", e.target.value)}
          />
        </Field>
        <Field label="좋아하는 작가 · 작품" help="레퍼런스로 톤을 맞춥니다.">
          <textarea
            className="field-textarea"
            rows={3}
            value={profile.likes}
            placeholder="예: 박해영 작가 (나의 아저씨), 노희경 작가 (디어 마이 프렌즈)"
            onChange={e => updateProfile("likes", e.target.value)}
          />
        </Field>
      </div>

      <SectionHead
        num={4}
        title="내 학습 노하우"
        sub="작가마다 스타일이 다릅니다. 본인만의 표현·룰을 누적하면 모든 작업에 자동 반영 — 다른 작가에겐 적용 X."
      />

      <div className="adm-plan">
        <div className="adm-plan-tag">{(profile.penName || profile.name || "작가")} 누적 학습</div>
        <div className="adm-plan-name">{learningStats.count}<em>건</em> · {learningStats.chars.toLocaleString()}자</div>
        <div className="adm-plan-meta">
          좋아함 {learningStats.counts.loved} · 피함 {learningStats.counts.rejected} · 디렉션 {learningStats.counts.direction} · 비유 {learningStats.counts.metaphor} — 마지막 추가 {learningStats.lastDate}
        </div>
        <div className="adm-plan-side">
          <div className="kv"><div className="kv-k">총 사용 횟수</div><div className="kv-v">{learningStats.count}회</div></div>
          <div className="kv"><div className="kv-k">최근 적용</div><div className="kv-v">{learningStats.lastDate}</div></div>
        </div>
        <Btn icon={I.download} onClick={downloadLearningMd}>다운로드 (.md)</Btn>
      </div>

      <div className="form-grid cols-1">
        <Field label="새 학습 추가 — 카테고리 선택" help={cur.hint}>
          <div className="adapt-chip-cloud">
            {SKILL_CATEGORIES.map(c => (
              <button
                key={c.id}
                className={"adapt-chip" + (skillCat === c.id ? " is-on" : "")}
                onClick={() => setSkillCat(c.id)}
                type="button"
              >
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label={`${cur.label} — 학습시킬 내용`}
          help="저장하면 누적본 끝에 [카테고리] 태그 + 오늘 날짜 헤더로 추가 (append만, 덮어쓰기 X)."
        >
          <textarea
            className="field-textarea"
            rows={4}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={
              skillCat === "loved" ? "예: 인물 첫 등장은 동작·물건으로 묘사 (외모 형용사 대신)" :
              skillCat === "rejected" ? "예: '~라고 할 수 있다' 같은 결론 자동화 표현 ✗" :
              skillCat === "direction" ? "예: 회상 신은 1인칭 일기체. 본 시점은 3인칭 제한." :
              skillCat === "metaphor" ? "예: 시간을 물·날씨·계절로 비유 (도시·기계 X)" :
              "예: 보조작가에게 이름 추천받을 때 — 항상 5개, 한국식 단정한 톤"
            }
          />
        </Field>
      </div>

      <div className="btn-row">
        <Btn kind="coral" icon={I.spark} onClick={onSaveLearning}>{cur.label}으로 학습</Btn>
        <Btn icon={I.write} onClick={showAllLearning}>전체 학습 보기</Btn>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-4)" }}>
          누적된 학습은 다음 작업부터 SUNNY가 자동 참고합니다 — {cur.label}만 골라서 적용 가능
        </span>
      </div>

      <div className="form-grid cols-1" style={{ marginTop: 16 }}>
        <Field label="최근 누적된 학습 (참조용)" help="이전 학습은 보존만, 수정·삭제 X.">
          <textarea
            className="field-textarea script"
            rows={6}
            readOnly
            value={learningHistory}
          />
        </Field>
      </div>

      <div className="stats" style={{ marginTop: 36 }}>
        <div className="stat">
          <div className="stat-label">완성 작품</div>
          <div className="stat-value">0<span className="unit">편</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">활동 기간</div>
          <div className="stat-value">0<span className="unit">년</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">SUNNY 사용</div>
          <div className="stat-value">0<span className="unit">회</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">총 작성</div>
          <div className="stat-value">0<span className="unit">p</span></div>
        </div>
      </div>
    </Fragment>
  );
}

function SystemTab() {
  const I = ICONS;
  const onManualLearn = () =>
    alert("자동 학습은 글로벌 launchd 작업으로 운영됩니다 — 다음 업데이트 예정");
  const onShowGlobalLog = () =>
    alert("전체 학습 로그는 lib/skills/learned.md 파일에서 관리됩니다 — 곧 출시");
  const onDownloadSkill = () =>
    alert("SKILL.md 다운로드는 다음 업데이트에서 제공됩니다.");
  const onChangePlan = () =>
    alert("플랜 변경은 결제 연동 이후 제공됩니다 — 곧 출시");
  const onExportData = () =>
    alert("데이터 내보내기는 다음 업데이트에서 제공됩니다.");
  const onDeleteAccount = () => {
    if (!confirm("정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    alert("계정 삭제는 결제 연동 이후 제공됩니다 — 곧 출시");
  };
  return (
    <Fragment>
      <SectionHead
        num={1}
        title="로컬에서 무료로 사용"
        sub="Claude Pro/Max 구독자라면 본인 PC에 Story Maker를 설치해서 API 비용 0원으로 사용할 수 있습니다."
      />
      <div className="adm-plan">
        <div className="adm-plan-tag">LOCAL VERSION</div>
        <div className="adm-plan-name">본인 PC에서 <em>무료</em></div>
        <div className="adm-plan-meta">Claude Pro $20/월 안에서 무제한 — Story Maker 추가 비용 없음</div>
        <div className="adm-plan-side">
          <div className="kv"><div className="kv-k">파일 크기</div><div className="kv-v">~290KB</div></div>
          <div className="kv"><div className="kv-k">셋업</div><div className="kv-v">5분</div></div>
        </div>
        <a href="/download" className="btn btn-coral" style={{ textDecoration: "none" }}>다운로드</a>
      </div>

      <SectionHead num={2} title="AI 설정" sub="SUNNY의 동작 방식." />
      <div className="form-grid">
        <Field label="AI 모델">
          <select className="field-select">
            <option>SUNNY Pro (Opus 4.7)</option>
            <option>SUNNY Lite (Haiku)</option>
          </select>
        </Field>
        <Field label="응답 속도">
          <select className="field-select">
            <option>일반 (균형)</option>
            <option>빠름 (간결)</option>
            <option>느림 (정밀)</option>
          </select>
        </Field>
        <Field label="기본 출력 길이">
          <select className="field-select">
            <option>표준 (~6,000자)</option>
            <option>짧게 (~3,000자)</option>
            <option>길게 (~10,000자)</option>
          </select>
        </Field>
        <Field label="자동 저장 간격">
          <select className="field-select">
            <option>1분</option>
            <option>5분</option>
            <option>수동</option>
          </select>
        </Field>
      </div>

      <SectionHead num={3} title="저장 · 내보내기" sub="기본 파일 포맷과 저장 위치." />
      <div className="form-grid">
        <Field label="기본 출력 포맷">
          <select className="field-select">
            <option>장르별 표준 (자동)</option>
            <option>한글(.hwp) 통일</option>
            <option>워드(.docx) 통일</option>
          </select>
        </Field>
        <Field label="파일명 패턴">
          <input className="field-input" defaultValue="{작품명}_{단계}_{날짜}" />
        </Field>
      </div>

      <SectionHead
        num={4}
        title="글로벌 자동 학습"
        sub="모든 작가 공용 노하우(SKILL.md)를 주기적으로 자동 업데이트 — 새 장르 매뉴얼·안티패턴 등."
      />

      <div className="adm-plan">
        <div className="adm-plan-tag">자동 학습 상태</div>
        <div className="adm-plan-name">주 <em>2회</em> · 월·목 새벽 4시</div>
        <div className="adm-plan-meta">서버 측 자동 학습 — 사용자 데이터와 무관</div>
        <div className="adm-plan-side">
          <div className="kv"><div className="kv-k">마지막 실행</div><div className="kv-v">—</div></div>
          <div className="kv"><div className="kv-k">다음 예정</div><div className="kv-v">—</div></div>
        </div>
        <Btn icon={I.spark} kind="coral" onClick={onManualLearn}>지금 수동 학습</Btn>
      </div>

      <div className="form-grid">
        <Field label="학습 주기" help="자동 학습이 돌 빈도. 주 2회가 권장값입니다.">
          <select className="field-select" defaultValue="weekly2">
            <option value="weekly2">주 2회 (월·목)</option>
            <option value="weekly1">주 1회 (월)</option>
            <option value="daily">매일</option>
            <option value="manual">수동 (자동 X)</option>
          </select>
        </Field>
        <Field label="실행 시각" help="새벽 시간 권장 — 토큰 사용 적은 시간대.">
          <select className="field-select" defaultValue="04">
            <option value="04">새벽 4시</option>
            <option value="03">새벽 3시</option>
            <option value="02">새벽 2시</option>
            <option value="00">자정</option>
          </select>
        </Field>
      </div>

      <div className="btn-row">
        <Btn icon={I.write} onClick={onShowGlobalLog}>전체 학습 로그 보기</Btn>
        <Btn icon={I.download} onClick={onDownloadSkill}>SKILL.md 다운로드</Btn>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-4)" }}>
          launchd 작업 — sunny-sori/auto_update.sh
        </span>
      </div>

      <SectionHead num={5} title="구독 · 결제" />
      <div className="adm-plan">
        <div className="adm-plan-tag">현재 플랜</div>
        <div className="adm-plan-name">SUNNY <em>Pro</em></div>
        <div className="adm-plan-meta">월 39,000원 · 무제한 의뢰 · 라이브러리 100GB</div>
        <div className="adm-plan-side">
          <div className="kv"><div className="kv-k">다음 결제일</div><div className="kv-v">—</div></div>
          <div className="kv"><div className="kv-k">이번 달 사용</div><div className="kv-v">0회</div></div>
        </div>
        <Btn onClick={onChangePlan}>플랜 변경</Btn>
      </div>

      <SectionHead num={6} title="계정" />
      <div className="form-grid">
        <Field label="이메일 알림">
          <select className="field-select">
            <option>모두 받기</option>
            <option>중요만</option>
            <option>받지 않음</option>
          </select>
        </Field>
        <Field label="언어">
          <select className="field-select">
            <option>한국어</option>
            <option>English</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
        <Btn icon={I.download} onClick={onExportData}>데이터 내보내기</Btn>
        <Btn icon={I.trash} kind="default" onClick={onDeleteAccount}>계정 삭제</Btn>
      </div>
    </Fragment>
  );
}
