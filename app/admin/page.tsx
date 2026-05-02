"use client";

import { Fragment, useState } from "react";
import { ICONS } from "@/lib/icons";
import { AppShell } from "@/components/AppShell";
import { Topbar } from "@/components/Topbar";
import { SectionHead } from "@/components/SectionHead";
import { Field, Btn } from "@/components/ui";

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

function WriterTab() {
  const I = ICONS;
  const [skillCat, setSkillCat] = useState<string>("loved");
  const cur = SKILL_CATEGORIES.find(c => c.id === skillCat) || SKILL_CATEGORIES[0];
  return (
    <Fragment>
      <div className="adm-profile">
        <div className="adm-profile-avatar">
          <span>유</span>
        </div>
        <div className="adm-profile-text">
          <div className="adm-profile-eyebrow">내 프로필</div>
          <div className="adm-profile-name">유희정</div>
          <div className="adm-profile-role">작가 · 감독</div>
          <div className="adm-profile-bio">현대 드라마 · 멜로 중심. SBS 단막극 1편. KBS 드라마 스페셜 작가 데뷔. OTT 12부작 진행 중.</div>
        </div>
        <div className="adm-profile-side">
          <Btn kind="primary" icon={I.write}>편집</Btn>
        </div>
      </div>

      <SectionHead num={1} title="기본 정보" sub="작품 저장 시 자동으로 들어갑니다." />

      <div className="form-grid">
        <Field label="이름" required>
          <input className="field-input" defaultValue="유희정" />
        </Field>
        <Field label="작가명 / 필명">
          <input className="field-input" defaultValue="유희정" />
        </Field>
        <Field label="역할">
          <select className="field-select">
            <option>작가 · 감독</option>
            <option>작가</option>
            <option>감독</option>
            <option>기획자</option>
          </select>
        </Field>
        <Field label="이메일" help="공모전 제출용 연락처">
          <input className="field-input" defaultValue="nextsunny@gmail.com" />
        </Field>
      </div>

      <SectionHead num={2} title="활동 정보" sub="SUNNY가 작가의 톤과 경험치에 맞춰 결과물을 조정합니다." />

      <div className="form-grid">
        <Field label="주력 장르" help="3개까지 선택">
          <select className="field-select"><option>TV 드라마, 영화, 웹소설</option></select>
        </Field>
        <Field label="경력 연차">
          <select className="field-select">
            <option>5~10년</option>
            <option>1~5년</option>
            <option>10년 이상</option>
            <option>지망생</option>
          </select>
        </Field>
        <Field label="대표 작품" span={2}>
          <textarea className="field-textarea" rows={3} defaultValue="단막 「봄밤의 메일」 (SBS, 2021) / 미니시리즈 「작은 빛으로」 (KBS, 2023, 4부작) / OTT 「트랑로제」 (제작 중, 16부작)" />
        </Field>
      </div>

      <SectionHead num={3} title="작가의 선호" sub="SUNNY가 도움말을 줄 때 참고합니다." />

      <div className="form-grid cols-1">
        <Field label="피하고 싶은 표현 · 스타일" help="AI투, 클리셰, 어휘 등 자유롭게.">
          <textarea className="field-textarea" rows={3} defaultValue="격언체 대사 ✗ / 영어 번역체 ✗ / '당신' 호명 ✗ / 대사로 감정 직접 설명 ✗" />
        </Field>
        <Field label="좋아하는 작가 · 작품" help="레퍼런스로 톤을 맞춥니다.">
          <textarea className="field-textarea" rows={3} defaultValue="박해영 작가 (나의 아저씨), 노희경 작가 (디어 마이 프렌즈), 김영하 (살인자의 기억법). 차분하고 깊은 인물 내면." />
        </Field>
      </div>

      <SectionHead
        num={4}
        title="내 학습 노하우"
        sub="작가마다 스타일이 다릅니다. 본인만의 표현·룰을 누적하면 모든 작업에 자동 반영 — 다른 작가에겐 적용 X."
      />

      <div className="adm-plan">
        <div className="adm-plan-tag">유희정 작가의 누적 학습</div>
        <div className="adm-plan-name">42<em>건</em> · 1,820자</div>
        <div className="adm-plan-meta">좋아함 16 · 피함 12 · 디렉션 9 · 비유 5 — 마지막 추가 4일 전</div>
        <div className="adm-plan-side">
          <div className="kv"><div className="kv-k">총 사용 횟수</div><div className="kv-v">128회</div></div>
          <div className="kv"><div className="kv-k">최근 적용</div><div className="kv-v">방금</div></div>
        </div>
        <Btn icon={I.download}>다운로드 (.md)</Btn>
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
        <Btn kind="coral" icon={I.spark}>{cur.label}으로 학습</Btn>
        <Btn icon={I.write}>전체 학습 보기</Btn>
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
            defaultValue={`## 2026-04-28
[좋아함] 결혼식 신은 5분 안에 1차 갈등 트리거. 배경 묘사 길게 X.
[피함] "당신" 호명 안 씀. 이름 / 직책 / 호칭 (선배·언니·과장님) 으로 부름.

## 2026-04-22
[디렉션] 회상 시퀀스는 1인칭 일기체. 본 시점은 3인칭 제한.

## 2026-04-15
[비유] 미드포인트는 "물리적 거리가 가까워지는 순간"으로 설계.`}
          />
        </Field>
      </div>

      <div className="stats" style={{ marginTop: 36 }}>
        <div className="stat">
          <div className="stat-label">완성 작품</div>
          <div className="stat-value">12<span className="unit">편</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">활동 기간</div>
          <div className="stat-value">8<span className="unit">년</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">SUNNY 사용</div>
          <div className="stat-value">128<span className="unit">회</span></div>
        </div>
        <div className="stat">
          <div className="stat-label">총 작성</div>
          <div className="stat-value">847<span className="unit">p</span></div>
        </div>
      </div>
    </Fragment>
  );
}

function SystemTab() {
  const I = ICONS;
  return (
    <Fragment>
      <SectionHead num={1} title="AI 설정" sub="SUNNY의 동작 방식." />
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

      <SectionHead num={2} title="저장 · 내보내기" sub="기본 파일 포맷과 저장 위치." />
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
        num={3}
        title="글로벌 자동 학습"
        sub="모든 작가 공용 노하우(SKILL.md)를 주기적으로 자동 업데이트 — 새 장르 매뉴얼·안티패턴 등."
      />

      <div className="adm-plan">
        <div className="adm-plan-tag">자동 학습 상태</div>
        <div className="adm-plan-name">주 <em>2회</em> · 월·목 새벽 4시</div>
        <div className="adm-plan-meta">최근 추가 — 12개 항목 · 4월 25일 21:32</div>
        <div className="adm-plan-side">
          <div className="kv"><div className="kv-k">마지막 실행</div><div className="kv-v">3일 전</div></div>
          <div className="kv"><div className="kv-k">다음 예정</div><div className="kv-v">5월 5일 04:00</div></div>
        </div>
        <Btn icon={I.spark} kind="coral">지금 수동 학습</Btn>
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

      <div className="form-grid cols-1">
        <Field label="이번 회차에 추가된 학습 (요약)" help="lib/skills/learned.md에 누적된 최근 12건. 클릭하면 전체 보기.">
          <textarea
            className="field-textarea script"
            rows={5}
            readOnly
            defaultValue={`## 2026-04-25 (자동 학습 추가)
- 웹툰 장르: 컷 단위 호흡은 평균 1.5초. 첫 컷·마지막 컷에 하이라이트.
- 숏드라마: 회당 후크는 마지막 5초에 SNS·전화·만남 트리거 중 하나.
- 다큐 큐시트: 인터뷰 컷은 한 사람 평균 18초.

## 2026-04-22 (자동 학습 추가)
- 미드포인트 정의 — 주인공의 욕망이 뒤집히는 순간 (이전 클로드 정리).
- 안티패턴 #25: "마침내 깨달았다" 같은 결론 자동화 표현.`}
          />
        </Field>
      </div>

      <div className="btn-row">
        <Btn icon={I.write}>전체 학습 로그 보기</Btn>
        <Btn icon={I.download}>SKILL.md 다운로드</Btn>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-4)" }}>
          launchd 작업 — sunny-sori/auto_update.sh
        </span>
      </div>

      <SectionHead num={4} title="구독 · 결제" />
      <div className="adm-plan">
        <div className="adm-plan-tag">현재 플랜</div>
        <div className="adm-plan-name">SUNNY <em>Pro</em></div>
        <div className="adm-plan-meta">월 39,000원 · 무제한 의뢰 · 라이브러리 100GB</div>
        <div className="adm-plan-side">
          <div className="kv"><div className="kv-k">다음 결제일</div><div className="kv-v">2026.05.28</div></div>
          <div className="kv"><div className="kv-k">이번 달 사용</div><div className="kv-v">128회</div></div>
        </div>
        <Btn>플랜 변경</Btn>
      </div>

      <SectionHead num={5} title="계정" />
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
        <Btn icon={I.download}>데이터 내보내기</Btn>
        <Btn icon={I.trash} kind="default">계정 삭제</Btn>
      </div>
    </Fragment>
  );
}
