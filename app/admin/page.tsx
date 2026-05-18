"use client";

import { Fragment, useState, type FormEvent } from "react";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Btn } from "@/components/ui";
import { KEY, usePersistedState } from "@/lib/persist";
import { WORKFLOWS, WORKFLOW_LETTERS } from "@/lib/workflows";
import { DEFAULT_MODEL_PREFS, MODEL_LABELS, type ModelPrefs, type ModelChoice } from "@/lib/storymaker/model-prefs";
import { createClient } from "@/lib/supabase/client";

/** ★ 비밀번호 변경 모달 — 사장님 명시 2026-05-04: 작가 비번 까먹어도 = 로그인 후 = 직접 변경 가능 */
function PasswordChangeModal({ onClose }: { onClose: () => void }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (newPw.length < 6) {
      setMsg({ kind: "err", text: "새 비밀번호는 6자 이상이어야 합니다." });
      return;
    }
    if (newPw !== confirmPw) {
      setMsg({ kind: "err", text: "새 비밀번호 확인이 일치하지 않습니다." });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    // 옛 비번 검증 (= reauth) — 옛 비번 박지 않으면 = 그냥 update
    if (oldPw) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPw,
        });
        if (signInErr) {
          setMsg({ kind: "err", text: "현재 비밀번호가 올바르지 않습니다." });
          setLoading(false);
          return;
        }
      }
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setMsg({ kind: "err", text: error.message });
      setLoading(false);
      return;
    }
    setMsg({ kind: "ok", text: "비밀번호 변경 완료. 잠시 후 닫힙니다." });
    setTimeout(() => onClose(), 1500);
  }

  return (
    <div role="dialog" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          maxWidth: 420, width: "100%",
          background: "var(--card)", borderRadius: 14, padding: 24,
          border: "1px solid var(--line)",
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>비밀번호 변경</div>
          <button type="button" onClick={onClose} style={{
            background: "transparent", border: "1px solid var(--line)", borderRadius: 6,
            padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "var(--ink-3)",
          }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-4)", lineHeight: 1.5, marginBottom: 4 }}>
          새 비밀번호는 6자 이상. 현재 비번 빈칸 = 검증 X (옛 비번 까먹은 경우).
        </div>

        <div className="login-field">
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>현재 비밀번호 <span style={{ color: "var(--ink-5)", fontSize: 11 }}>(선택)</span></span>
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--ink-4)", fontWeight: 600, padding: 0 }}>
              {showPw ? "🙈 가리기" : "👁 보기"}
            </button>
          </label>
          <input className="field-input" type={showPw ? "text" : "password"}
            value={oldPw} onChange={e => setOldPw(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="login-field">
          <label>새 비밀번호</label>
          <input className="field-input" type={showPw ? "text" : "password"}
            value={newPw} onChange={e => setNewPw(e.target.value)}
            autoComplete="new-password" required minLength={6}
          />
        </div>

        <div className="login-field">
          <label>새 비밀번호 확인</label>
          <input className="field-input" type={showPw ? "text" : "password"}
            value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            autoComplete="new-password" required
          />
        </div>

        {msg && (
          <div style={{
            padding: "8px 10px",
            background: msg.kind === "ok" ? "rgba(64, 200, 130, 0.08)" : "rgba(255, 90, 90, 0.08)",
            border: `1px solid ${msg.kind === "ok" ? "rgba(64, 200, 130, 0.35)" : "rgba(255, 90, 90, 0.35)"}`,
            borderRadius: 6, fontSize: 12,
            color: msg.kind === "ok" ? "rgb(64, 160, 100)" : "var(--coral, #ff6b6b)",
          }}>{msg.text}</div>
        )}

        <button type="submit" disabled={loading} style={{
          marginTop: 4, padding: "10px 14px", fontSize: 13, fontWeight: 700,
          background: "var(--coral)", color: "#fff",
          border: "1px solid var(--coral)", borderRadius: 8,
          cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
        }}>
          {loading ? "변경 중…" : "비밀번호 변경"}
        </button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AppShell>
      <AdminMain />
    </AppShell>
  );
}

function AdminMain() {
  const [tab, setTab] = useState<"writer" | "system">("writer");
  const [pwModalOpen, setPwModalOpen] = useState(false); // ★ 비밀번호 변경 모달

  return (
    <main className="main">
      <Topbar
        eyebrow="ADMIN"
        title='어드민<span class="dot">.</span>'
        sub="작가 프로필과 시스템 설정. SUNNY가 더 잘 도울 수 있도록 본인의 정보를 알려주세요."
      />

      {/* ★ 비밀번호 변경 버튼 — 사장님 명시 2026-05-04: 작가 = 까먹어도 = 직접 변경 가능 */}
      <div style={{
        display: "flex", justifyContent: "flex-end",
        marginBottom: 16,
      }}>
        <button
          type="button"
          onClick={() => setPwModalOpen(true)}
          style={{
            padding: "8px 14px", fontSize: 12, fontWeight: 600,
            background: "transparent", color: "var(--ink-2)",
            border: "1px solid var(--line)", borderRadius: 6,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
          title="비밀번호 변경 (현재 비번 기억 안 나도 OK — 로그인된 상태면 변경 가능)"
        >
          🔒 비밀번호 변경
        </button>
      </div>

      {pwModalOpen && <PasswordChangeModal onClose={() => setPwModalOpen(false)} />}

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
  // 주력 매체 — 홈/write 어댑티브의 기본값
  const [primaryMedium, setPrimaryMedium] = usePersistedState<string>(KEY.adminPrimaryMedium, "A");
  // 보조작가 이름 — chat 페이지 default 호칭 (사용자 정의)
  const [assistantName, setAssistantName] = usePersistedState<string>(KEY.adminAssistantName, "소리");
  // 작업별 AI 모델 — 작가가 선택 (default: 집필/각색=Opus, 리뷰/OSMU/채팅=Haiku)
  const [modelPrefs, setModelPrefs] = usePersistedState<ModelPrefs>(KEY.adminModelPrefs, DEFAULT_MODEL_PREFS);
  const updateModel = (kind: keyof ModelPrefs, value: ModelChoice) =>
    setModelPrefs(prev => ({ ...prev, [kind]: value }));

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
        <Field
          label="주력 매체"
          help="홈에서 시작하는 작업의 매체. 카드로 즉시 다른 매체로 전환 가능."
        >
          <select
            className="field-select"
            value={primaryMedium}
            onChange={e => setPrimaryMedium(e.target.value)}
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
        </Field>

        <Field
          label="보조작가 이름"
          help="채팅(아이디어/자료조사)에서 작가님을 돕는 보조작가의 호칭. 기본 '소리'."
        >
          <input
            className="field-input"
            value={assistantName}
            onChange={e => setAssistantName(e.target.value)}
            placeholder="소리"
            maxLength={20}
          />
        </Field>
      </div>

      <SectionHead num={3} title="AI 모델 설정" sub="작업별 모델 선택. Opus = 깊이/퀄리티 / Haiku = 빠름/토큰 절약." />

      <div className="form-grid">
        <Field label="집필 (logline · treatment · synopsis · script)" help="진짜 창작. 기본 Opus 권장.">
          <select className="field-select" value={modelPrefs.write} onChange={e => updateModel("write", e.target.value as ModelChoice)}>
            <option value="opus">{MODEL_LABELS.opus}</option>
            <option value="haiku">{MODEL_LABELS.haiku}</option>
          </select>
        </Field>
        <Field label="각색 (revise · adapt-cross)" help="본문 변환. 기본 Opus 권장.">
          <select className="field-select" value={modelPrefs.adapt} onChange={e => updateModel("adapt", e.target.value as ModelChoice)}>
            <option value="opus">{MODEL_LABELS.opus}</option>
            <option value="haiku">{MODEL_LABELS.haiku}</option>
          </select>
        </Field>
        <Field label="리뷰 (다중 타겟 12문항)" help="구조화된 응답. 기본 Haiku로 충분.">
          <select className="field-select" value={modelPrefs.review} onChange={e => updateModel("review", e.target.value as ModelChoice)}>
            <option value="haiku">{MODEL_LABELS.haiku}</option>
            <option value="opus">{MODEL_LABELS.opus}</option>
          </select>
        </Field>
        <Field label="OSMU (12매체 매트릭스)" help="짧은 분석 12개. 기본 Haiku.">
          <select className="field-select" value={modelPrefs.osmu} onChange={e => updateModel("osmu", e.target.value as ModelChoice)}>
            <option value="haiku">{MODEL_LABELS.haiku}</option>
            <option value="opus">{MODEL_LABELS.opus}</option>
          </select>
        </Field>
        <Field label="보조작가 채팅" help="빠른 대화·자료조사. 기본 Haiku.">
          <select className="field-select" value={modelPrefs.chat} onChange={e => updateModel("chat", e.target.value as ModelChoice)}>
            <option value="haiku">{MODEL_LABELS.haiku}</option>
            <option value="opus">{MODEL_LABELS.opus}</option>
          </select>
        </Field>
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

      {/* ★ 자동 반영 작동 표시 — 작가가 = 박은 학습이 진짜 작동하는지 시각 피드백 */}
      <div style={{
        padding: "10px 14px",
        marginBottom: 14,
        background: learning.length > 0 ? "rgba(64, 200, 130, 0.08)" : "rgba(180, 180, 180, 0.08)",
        border: `1px solid ${learning.length > 0 ? "rgba(64, 200, 130, 0.35)" : "rgba(180, 180, 180, 0.3)"}`,
        borderRadius: 8,
        fontSize: 12.5,
        color: "var(--ink-2)",
        lineHeight: 1.6,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        {learning.length > 0 ? (
          <>
            <span style={{ color: "rgb(64, 160, 100)", fontWeight: 700 }}>✓ 자동 반영 중</span>
            <span style={{ color: "var(--ink-3)" }}>
              ({learning.length}건) — 모든 페이지(develop·write·chat·adapt·review·osmu·package)의 AI 호출에 자동 박힙니다.
            </span>
          </>
        ) : (
          <>
            <span style={{ color: "var(--ink-4)", fontWeight: 700 }}>· 학습 없음</span>
            <span style={{ color: "var(--ink-4)" }}>
              — 아래에서 좋아함/피함/디렉션/비유 1개씩 추가하면 = 다음 호출부터 즉시 반영됩니다.
            </span>
          </>
        )}
      </div>

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
  const BETA_NOTICE = "베타 기간 동안은 미지원 기능입니다.\n정식 오픈 시 제공 예정입니다.";
  const onManualLearn = () => alert("자동 학습은 글로벌 작업으로 자동 운영됩니다.\n수동 트리거는 정식 오픈 시 제공 예정입니다.");
  const onShowGlobalLog = () => alert(BETA_NOTICE);
  const onDownloadSkill = () => alert(BETA_NOTICE);
  const onChangePlan = () => alert(BETA_NOTICE);
  const onExportData = () => alert(BETA_NOTICE);
  const onDeleteAccount = () => {
    if (!confirm("정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    alert(BETA_NOTICE + "\n\n계정 삭제 요청은 작가님께 직접 연락 부탁드립니다.");
  };
  return (
    <Fragment>
      {/* 현재 인증 상태 — 작가가 매번 .env 까보지 않아도 보이게 */}
      <div style={{
        marginBottom: 22, padding: "14px 18px",
        background: "var(--card-soft)", border: "1px solid var(--line)",
        borderRadius: 12,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: "#10b981", flexShrink: 0,
          boxShadow: "0 0 0 3px rgba(16,185,129,0.15)",
        }}></span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 2 }}>
            Claude Pro/Max OAuth · API 비용 0원
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
            본인 구독 그대로 사용 · 토큰 차감 X · 분당 rate limit만 주의
          </div>
        </div>
        <div style={{
          fontSize: 10.5, color: "var(--ink-5)", fontFamily: "ui-monospace, monospace",
          padding: "4px 8px", background: "var(--bg)",
          border: "1px solid var(--line)", borderRadius: 6,
        }}>
          USE_CLAUDE_CODE=true
        </div>
      </div>

      <SectionHead
        num={1}
        title="두 가지 사용 방법"
        sub="본인 상황에 맞는 방식 선택. 둘 다 같은 Story Maker — 어디서 돌리고 누가 비용 내는지만 다릅니다."
      />

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr" }}>
        {/* ============ 방식 A — LOCAL ============ */}
        <div style={{
          padding: "20px 22px",
          border: "2px solid var(--coral)",
          borderRadius: 14,
          background: "var(--card-soft)",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
              color: "var(--coral)",
            }}>방식 A · 로컬</span>
            <span style={{
              fontSize: 10, padding: "2px 8px",
              background: "var(--coral)", color: "#fff",
              borderRadius: 999, fontWeight: 700,
            }}>추천</span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
            본인 PC + Claude 구독으로<br/>
            <em style={{ fontStyle: "italic", color: "var(--coral)" }}>API 비용 0원</em>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.6 }}>
            Claude Pro($20/월) 또는 Max($100/월) 구독자라면 = 본인 PC에 Story Maker 한 번 설치 + Claude CLI 로그인 한 번 = 끝. 추가 결제 X.
          </div>

          <div style={{
            padding: "12px 14px", background: "var(--bg)",
            border: "1px solid var(--line)", borderRadius: 10,
            fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.75,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", marginBottom: 6, letterSpacing: "0.08em" }}>
              아주 쉬운 4단계
            </div>
            <ol style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 4 }}>
              <li><strong>Claude Pro/Max 구독</strong> (이미 있으면 통과)<br/>
                <span style={{ fontSize: 11, color: "var(--ink-4)" }}>→ claude.ai 가서 결제</span>
              </li>
              <li><strong>Claude CLI 설치</strong><br/>
                <code style={{ fontSize: 11, color: "var(--coral-deep)", background: "var(--card-soft)", padding: "1px 6px", borderRadius: 4 }}>
                  npm install -g @anthropic-ai/claude-code
                </code>
              </li>
              <li><strong>한 번만 로그인</strong><br/>
                <code style={{ fontSize: 11, color: "var(--coral-deep)", background: "var(--card-soft)", padding: "1px 6px", borderRadius: 4 }}>
                  claude /login
                </code>
                <span style={{ fontSize: 11, color: "var(--ink-4)" }}> → 브라우저로 OAuth 인증</span>
              </li>
              <li><strong>Story Maker 다운로드 + 실행</strong> (5분)<br/>
                <span style={{ fontSize: 11, color: "var(--ink-4)" }}>→ 아래 「다운로드」 버튼</span>
              </li>
            </ol>
          </div>

          <div className="adm-plan-side" style={{ marginTop: 0 }}>
            <div className="kv"><div className="kv-k">월 비용</div><div className="kv-v">0원 (구독에 포함)</div></div>
            <div className="kv"><div className="kv-k">사용량 제한</div><div className="kv-v">분당 토큰 한도만</div></div>
            <div className="kv"><div className="kv-k">데이터</div><div className="kv-v">본인 PC localStorage</div></div>
          </div>

          <a href="/download" className="btn btn-coral" style={{ textDecoration: "none", marginTop: "auto" }}>
            로컬 다운로드 →
          </a>
        </div>

        {/* ============ 방식 B — 웹 (story.sunnytoon.com) ============ */}
        <div style={{
          padding: "20px 22px",
          border: "1px solid var(--line)",
          borderRadius: 14,
          background: "var(--card-soft)",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
              color: "var(--ink-3)",
            }}>방식 B · 웹</span>
            <span style={{
              fontSize: 10, padding: "2px 8px",
              background: "var(--ink-5)", color: "#fff",
              borderRadius: 999, fontWeight: 700,
            }}>설치 X</span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
            <code style={{ fontSize: 16, color: "var(--coral)", fontFamily: "inherit" }}>story.sunnytoon.com</code><br/>
            <span style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 500 }}>
              회원가입 · 데스크탑 버전 다운로드
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.6 }}>
            웹사이트는 회원가입과 데스크탑 버전 다운로드 창구입니다. 실제 글쓰기 작업은 데스크탑 앱(방식 A)에서 — Claude 구독으로 추가 비용 없이 사용합니다.
          </div>

          <div style={{
            padding: "12px 14px", background: "var(--bg)",
            border: "1px solid var(--line)", borderRadius: 10,
            fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.75,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", marginBottom: 6, letterSpacing: "0.08em" }}>
              아주 쉬운 3단계
            </div>
            <ol style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 4 }}>
              <li><strong>웹 접속 + 가입</strong><br/>
                <span style={{ fontSize: 11, color: "var(--ink-4)" }}>→ story.sunnytoon.com 가서 회원가입 (초대 코드 필요)</span>
              </li>
              <li><strong>데스크탑 버전 다운로드</strong><br/>
                <span style={{ fontSize: 11, color: "var(--ink-4)" }}>→ 로그인 후 「다운로드」 페이지</span>
              </li>
              <li><strong>방식 A 4단계로 설치</strong><br/>
                <span style={{ fontSize: 11, color: "var(--ink-4)" }}>→ Claude 구독 + CLI 로그인 한 번 = 끝</span>
              </li>
            </ol>
          </div>

          <div className="adm-plan-side" style={{ marginTop: 0 }}>
            <div className="kv"><div className="kv-k">월 비용</div><div className="kv-v">0원 (Claude 구독에 포함)</div></div>
            <div className="kv"><div className="kv-k">설치</div><div className="kv-v">데스크탑 앱 1회</div></div>
            <div className="kv"><div className="kv-k">데이터</div><div className="kv-v">본인 PC + 서버 동기화</div></div>
          </div>

          <a
            href="https://story.sunnytoon.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{
              textDecoration: "none", marginTop: "auto",
              background: "transparent",
              border: "1px solid var(--coral)",
              color: "var(--coral-deep)",
            }}
          >
            story.sunnytoon.com →
          </a>
        </div>
      </div>

      {/* 비교 한눈에 */}
      <div style={{
        marginTop: 14, padding: "12px 16px",
        background: "var(--bg)",
        border: "1px dashed var(--line)",
        borderRadius: 10,
        fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.65,
      }}>
        <strong style={{ color: "var(--ink-1)" }}>한 줄 비교 —</strong>
        <span style={{ marginLeft: 6 }}>
          <strong style={{ color: "var(--coral)" }}>로컬</strong>은 = Claude 구독 있고 본인 PC에서만 쓸 거면 <em>비용 0원</em>.
          <strong style={{ color: "var(--ink-1)", marginLeft: 4 }}>웹</strong>은 = 어디서든 접속 + 작가팀과 공유 + 사용한 만큼만 결제.
          <strong style={{ marginLeft: 4 }}>둘 다 같은 Story Maker.</strong> 의뢰 응답·매체별 양식·다운로드 다 동일.
        </span>
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
