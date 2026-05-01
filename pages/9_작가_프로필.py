"""어드민 — 작가 + 시스템 설정 (우측 상단 ADMIN pill 진입점)
복잡한 중첩 탭 폐기. 두 개 탭만:
  1) 👤 작가  — 현재 활성 + 전환 + 편집/추가 (한 화면)
  2) ⚙️ 시스템 — Claude 연결 + 저장 + 진단 (한 화면)
"""

import streamlit as st
from pathlib import Path
from datetime import datetime
from modules.page_init import init_page
init_page("어드민 — SUNNY Story Maker")

from modules import profile as prof, auth, db as ssm_db
from modules.genres import list_genre_names
from modules.workflows import SCRIPT_FONTS

st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">⚙️</span>어드민</div>
        <div class="app-header-version">작가 · 시스템 설정</div>
    </div>
    """,
    unsafe_allow_html=True,
)

tab_writer, tab_system = st.tabs(["👤 작가", "⚙️ 시스템"])


# ============================================================
# 👤 작가 — 활성 + 전환 + 편집 (한 화면)
# ============================================================
with tab_writer:
    profiles = prof.list_profiles()
    active = prof.get_active()

    # ---------- 자동 활성화: 활성 없는데 등록된 작가 있으면 가장 최근 자동 활성화 ----------
    if not active and profiles:
        prof.set_active(profiles[0]["name"])
        active = prof.get_active()

    # ---------- 첫 사용자 (등록된 작가 0명) — 인라인 입력 안내 ----------
    if not active and not profiles:
        st.info(
            "**처음 오셨네요.** 아래 폼에 본인 정보를 입력하고 저장하시면 됩니다. "
            "한 번만 입력하면 모든 모드(집필/리뷰/각색/보조작가)에 자동 반영돼요."
        )
        # 자동으로 폼 열어주기
        st.session_state.show_form = True

    # ---------- 활성 작가 카드 (상단) ----------
    if active:
        st.markdown(
            f"""
            <div style="background: var(--card-pure); border:1px solid var(--line);
                        border-left: 4px solid var(--coral); padding: 16px 20px;
                        border-radius: 10px; margin-bottom: 16px;">
              <div style="font-size: 11px; color: var(--ink-3); letter-spacing: 0.5px;
                          text-transform: uppercase; margin-bottom: 4px;">내 프로필</div>
              <div style="font-size: 22px; font-weight: 700; color: var(--ink);">{active['name']}</div>
              <div style="font-size: 13px; color: var(--ink-2); margin-top: 2px;">
                {active.get('tagline') or '한 줄 소개 없음'}
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # ---------- 액션 줄 — 편집 버튼 하나만 ----------
    if active:
        if st.button(
            "✏️ 내 정보 편집",
            use_container_width=True,
            type="primary" if not st.session_state.get("show_form") else "secondary",
        ):
            st.session_state.editing_profile = active["name"]
            st.session_state.show_form = True
            st.rerun()

    # ---------- 활성 정보 표시 (편집폼이 닫혀 있을 때) ----------
    if active and not st.session_state.get("show_form"):
        with st.expander("📋 활성 작가 상세 정보", expanded=False):
            col_a, col_b = st.columns(2)
            with col_a:
                st.markdown("##### 기본")
                if active.get("career"):
                    st.markdown(f"- 경력: {active['career']}")
                if active.get("preferred_genres"):
                    st.markdown(f"- 선호 장르: {', '.join(active['preferred_genres'])}")
                if active.get("preferred_tone"):
                    st.markdown(f"- 선호 톤: {active['preferred_tone']}")
                if active.get("favorite_authors"):
                    st.markdown(f"- 좋아하는 작가: {active['favorite_authors']}")
            with col_b:
                st.markdown("##### 스타일")
                if active.get("writing_style"):
                    st.markdown(f"- {active['writing_style']}")
                if active.get("preferred_metaphor_systems"):
                    st.markdown(f"- 비유 체계: {', '.join(active['preferred_metaphor_systems'])}")
                if active.get("preferred_font"):
                    st.markdown(f"- 폰트: {active['preferred_font']}")
            if active.get("personal_anti_patterns"):
                st.markdown("##### 🚫 안티패턴")
                for p in active["personal_anti_patterns"]:
                    st.markdown(f"- {p}")
            if active.get("notes"):
                st.markdown("##### 📝 추가 노트")
                st.markdown(active["notes"])

    # ---------- 편집/신규 폼 (show_form일 때만) ----------
    if st.session_state.get("show_form"):
        editing = "editing_profile" in st.session_state
        if editing:
            loaded = prof.load_profile(st.session_state.editing_profile)
            if loaded is None:
                # Supabase에 있는데 못 불러왔으면 빈 폼 + 이름 채워줌
                loaded = prof.empty_profile()
                loaded["name"] = st.session_state.editing_profile
                st.warning(
                    f"⚠ '{st.session_state.editing_profile}' 프로필을 불러오지 못했습니다. "
                    "이름만 채워둔 빈 폼을 띄웠어요. 정보 채우고 다시 저장하세요."
                )
            target_profile = loaded
        else:
            target_profile = prof.empty_profile()

        st.markdown("---")
        st.markdown(
            f"### {'✏️ 편집' if editing else '➕ 새 작가 등록'}"
            f"{(' — ' + target_profile['name']) if editing else ''}"
        )

        st.caption(
            "💡 입력한 내용은 모든 작업(기획·집필·각색·리뷰·보조작가)에 자동 반영됩니다. "
            "정확할수록 AI가 작가 스타일을 따라옵니다. **빈칸 OK** — 나중에 채워도 됩니다."
        )

        with st.form("profile_form"):
            # 1. 기본
            col1, col2 = st.columns(2)
            with col1:
                name = st.text_input(
                    "작가명 *",
                    value=target_profile.get("name", ""),
                    placeholder="예: 김선희 / 필명 RIAN",
                    help="저장 폴더와 채팅 기록이 이 이름으로 분리됩니다.",
                )
                career = st.text_input(
                    "경력",
                    value=target_profile.get("career", ""),
                    placeholder="예: 영화 시나리오 8년차 · 2018년 단편으로 데뷔",
                )
            with col2:
                tagline = st.text_input(
                    "한 줄 소개",
                    value=target_profile.get("tagline", ""),
                    placeholder="예: 도시 미스터리 + 여성 서사 전문",
                )
                favorite_authors = st.text_input(
                    "좋아하는 작가/감독",
                    value=target_profile.get("favorite_authors", ""),
                    placeholder="예: 박찬욱, 김은희, 봉준호, 박완서",
                )

            # 2. 선호
            preferred_genres = st.multiselect(
                "선호 장르",
                list_genre_names(),
                default=target_profile.get("preferred_genres", []),
                help="작품 의뢰가 들어왔을 때 자동으로 추천 우선순위가 됩니다.",
            )
            preferred_tone = st.text_input(
                "선호 톤",
                value=target_profile.get("preferred_tone", ""),
                placeholder="예: 다크하지만 따뜻한 / 절제된 미니멀 / 시네마틱하고 압축적",
            )

            # 3. 스타일
            writing_style = st.text_area(
                "내 스타일 (자유 서술)",
                value=target_profile.get("writing_style", ""),
                height=110,
                placeholder=(
                    "예시:\n"
                    "- 대사보다 행동/소품으로 보여주는 편. 서브텍스트 중시.\n"
                    "- 회차 후크는 감정형 클리프행어 선호 (사건 반전보다는 감정의 누적).\n"
                    "- 첫 5분 안에 주인공의 결핍을 시각적으로 던진다.\n"
                    "- 멜로보다 인물 변화에 집중. 로맨스는 부산물처럼 따라붙게."
                ),
            )
            metaphor_systems_str = st.text_area(
                "자주 쓰는 비유 체계 — 한 줄에 하나",
                value="\n".join(target_profile.get("preferred_metaphor_systems", [])),
                height=90,
                placeholder=(
                    "예시:\n"
                    "야구 — 승부 / 시즌 / 타석 / 마운드\n"
                    "건축 — 설계 / 하중 / 균열\n"
                    "요리 — 재료 / 불 / 시간\n"
                    "바둑 — 포석 / 사석 / 중반전"
                ),
                help="작가별 고유 비유. 등장인물별로 비유체계가 다르면 보조작가에 따로 메모하세요.",
            )
            anti_patterns_str = st.text_area(
                "🚫 절대 안 쓰는 표현 — 한 줄에 하나",
                value="\n".join(target_profile.get("personal_anti_patterns", [])),
                height=110,
                placeholder=(
                    "예시:\n"
                    "격언체 대사 (\"인생은 ~다\")\n"
                    "회상 씬 남용\n"
                    "내레이션으로 감정 설명\n"
                    "신파 결말 / 가족 화해 클리셰\n"
                    "특정 단어 — 영혼, 운명, 진정한, 가슴이 뜨거워지는"
                ),
                help="AI가 이 패턴들을 회피합니다. 리뷰 시에도 검출 대상이 돼요.",
            )

            # 4. 출력
            col_f, col_t = st.columns(2)
            with col_f:
                font_options = [f["css"] for f in SCRIPT_FONTS]
                current_font = target_profile.get("preferred_font", "Hahmlet")
                font_idx = font_options.index(current_font) if current_font in font_options else 0
                preferred_font = st.selectbox(
                    "선호 본문 폰트",
                    font_options,
                    index=font_idx,
                    format_func=lambda c: next(
                        (f["name"] for f in SCRIPT_FONTS if f["css"] == c), c
                    ),
                )
            with col_t:
                preferred_targets_str = st.text_input(
                    "주력 타겟층 (쉼표 구분)",
                    value=", ".join(target_profile.get("preferred_targets", [])),
                    placeholder="예: 30대 도시 직장인 여성, 40~50대 가족 시청자, 글로벌 한류팬",
                )

            notes = st.text_area(
                "추가 노트 (자유)",
                value=target_profile.get("notes", ""),
                height=80,
                placeholder=(
                    "예시:\n"
                    "- 영문 고유명사는 한글로 표기 (스타벅스 X → 별다방 O 같은 룰)\n"
                    "- 욕설은 ⓒ로 검열 표기\n"
                    "- 회차당 분량 60분 ±5분 엄수"
                ),
            )

            # ---------- 학습 MD (추가 전용) ----------
            st.markdown("##### 📚 추가 학습 자료 (MD)")
            existing_md = target_profile.get("skill_md", "") or ""
            if existing_md.strip():
                st.caption("이미 누적된 학습 내용 (지울 수 없음, 참조용)")
                with st.expander(f"📖 기존 학습 보기 ({len(existing_md):,}자)", expanded=False):
                    st.markdown(existing_md)
            else:
                st.caption("아직 누적된 학습 내용이 없습니다. 아래에 입력하시면 시작됩니다.")

            new_md_addition = st.text_area(
                "✍ 새로 추가할 내용 (저장 시 위에 누적됨)",
                value="",
                height=180,
                placeholder=(
                    "예시 — 시나리오 노하우/표현 가이드 등 자유롭게:\n\n"
                    "## 좋은 첫 장면 패턴\n"
                    "- 일상의 사소한 동작에서 시작 (커피 따르기, 신발 벗기 등)\n"
                    "- 캐릭터 설명 X, 행동만으로 보여주기\n\n"
                    "## 안 쓰는 표현\n"
                    "- '운명이었다' '그렇게 시간이 흘렀다'\n"
                    "- 갑작스러운 회상 씬\n"
                ),
                help="새 내용은 기존 학습 끝에 추가됩니다. 기존 내용은 지워지지 않습니다.",
            )

            col_save, col_cancel = st.columns([3, 1])
            with col_save:
                saved = st.form_submit_button("💾 저장", type="primary", use_container_width=True)
            with col_cancel:
                cancel = st.form_submit_button("취소", use_container_width=True)

            if saved and name:
                # 학습 MD: 기존 + 새 추가 (덮어쓰기 X, append만)
                new_skill_md = existing_md
                if new_md_addition.strip():
                    today = datetime.now().strftime("%Y-%m-%d %H:%M")
                    if new_skill_md:
                        new_skill_md = (
                            new_skill_md.rstrip()
                            + f"\n\n---\n## {today} 추가\n\n"
                            + new_md_addition.strip()
                        )
                    else:
                        new_skill_md = f"## {today}\n\n" + new_md_addition.strip()

                new_profile = {
                    **target_profile,
                    "name": name,
                    "tagline": tagline,
                    "career": career,
                    "favorite_authors": favorite_authors,
                    "preferred_genres": preferred_genres,
                    "preferred_tone": preferred_tone,
                    "writing_style": writing_style,
                    "preferred_metaphor_systems": [
                        s.strip() for s in metaphor_systems_str.splitlines() if s.strip()
                    ],
                    "personal_anti_patterns": [
                        s.strip() for s in anti_patterns_str.splitlines() if s.strip()
                    ],
                    "preferred_font": preferred_font,
                    "preferred_targets": [
                        s.strip() for s in preferred_targets_str.split(",") if s.strip()
                    ],
                    "notes": notes,
                    "skill_md": new_skill_md,
                    "last_modified": datetime.now().isoformat(),
                }
                if not new_profile.get("created_at"):
                    new_profile["created_at"] = datetime.now().isoformat()

                prof.save_profile(new_profile)
                # 항상 자동 활성화 (등록 = 내 프로필 = 활성)
                prof.set_active(name)
                st.session_state.pop("editing_profile", None)
                st.session_state.show_form = False
                st.success(f"✓ {name} 저장 완료")
                st.rerun()

            if cancel:
                st.session_state.pop("editing_profile", None)
                st.session_state.show_form = False
                st.rerun()


# ============================================================
# ⚙️ 시스템 — Claude 연결 + 저장 + 진단 (간결)
# ============================================================
with tab_system:
    env_path = Path(__file__).parent.parent / ".env"

    def read_env() -> dict:
        if not env_path.exists():
            return {}
        result = {}
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                result[k.strip()] = v.strip()
        return result

    def write_env(values: dict):
        lines = [f"{k}={v}" for k, v in values.items() if v is not None]
        env_path.write_text("\n".join(lines), encoding="utf-8")

    env = read_env()
    status = auth.get_status_for_writer()
    sb_diag = ssm_db.diagnose()

    # 문제 있을 때만 빨간 경고 띄움 (정상이면 화면 깨끗)
    if not status["ready"]:
        st.warning(f"⚠ Claude 미연결 — {status['label']}")
    if not sb_diag["client_created"]:
        st.error("⚠ Supabase 미연결 — 데이터가 임시 저장됨 (재배포 시 사라짐)")

    # ---------- 모든 설정 / 진단 / 안내를 한 expander 안으로 ----------
    with st.expander("🛠 고급 설정 / 진단 (보통 안 봐도 됨)", expanded=False):

        # 연결 상태
        st.markdown("##### 연결 상태")
        col_a, col_b = st.columns(2)
        with col_a:
            if status["ready"]:
                st.success("✓ Claude 연결됨")
            else:
                st.warning(f"⚠ {status['label']}")
        with col_b:
            if sb_diag["client_created"]:
                st.success("✓ Supabase 연결됨")
            else:
                st.error("⚠ Supabase 미연결")

        st.markdown("---")
        st.markdown("##### 모델 변경")
        model = st.selectbox(
            "기본 응답 품질",
            ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
            index=["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"].index(
                env.get("DEFAULT_MODEL", "claude-opus-4-7")
            ) if env.get("DEFAULT_MODEL") in ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] else 0,
            format_func=lambda m: {
                "claude-opus-4-7": "Opus — 최고 품질 (시나리오 권장)",
                "claude-sonnet-4-6": "Sonnet — 균형",
                "claude-haiku-4-5-20251001": "Haiku — 빠름 (보조작가 채팅 전용)",
            }.get(m, m),
            label_visibility="collapsed",
            help="보조작가 채팅은 항상 Haiku 사용. 그 외 모드 기본값을 여기서.",
        )

        st.markdown("---")
        st.markdown("##### 자체 API 키 (선택)")
        api_key = st.text_input(
            "API 키",
            value=env.get("ANTHROPIC_API_KEY", ""),
            type="password",
            placeholder="비워두면 자동 연결 사용",
            label_visibility="collapsed",
        )

        st.markdown("---")
        st.markdown("##### 외부 노하우 폴더 (거의 안 씀)")
        sori_skill_dir = st.text_input(
            "노하우 폴더 경로",
            value=env.get("SORI_SKILL_DIR", ""),
            placeholder="비워두면 내장 자동 사용",
            label_visibility="collapsed",
        )

        if st.button("💾 설정 저장", type="primary", use_container_width=True):
            write_env({
                "ANTHROPIC_API_KEY": api_key,
                "DEFAULT_MODEL": model,
                "DRIVE_OUTPUT_DIR": "",
                "SORI_SKILL_DIR": sori_skill_dir,
            })
            st.success("✓ 저장. 페이지 새로고침 시 적용.")

        st.markdown("---")
        st.markdown("##### 진단 정보 (문제 생겼을 때 참고)")
        st.code(
            f"""인증 모드:        {auth.get_auth_mode()}
Claude 앱 감지:    {auth.detect_claude_code()}
API 키 등록:      {auth.has_api_key()}
Supabase 모듈:    {sb_diag['supabase_module_imported']}
Supabase URL:    {sb_diag['url_set']}
Supabase KEY:    {sb_diag['key_set']}
Supabase 클라이언트: {sb_diag['client_created']}
노하우 폴더:       {sori_skill_dir or '(내장)'}"""
        )

        st.markdown("---")
        st.markdown("##### 폰트 안내")
        st.caption(
            "메뉴/UI 폰트: Pretendard 고정. "
            "본문(대본 입력)은 위 작가 프로필에서 8종 중 선택."
        )
