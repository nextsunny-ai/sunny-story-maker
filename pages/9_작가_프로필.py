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

    # ---------- 활성 작가 카드 (상단) ----------
    if active:
        st.markdown(
            f"""
            <div style="background: var(--card-pure); border:1px solid var(--line);
                        border-left: 4px solid var(--coral); padding: 16px 20px;
                        border-radius: 10px; margin-bottom: 16px;">
              <div style="font-size: 11px; color: var(--ink-3); letter-spacing: 0.5px;
                          text-transform: uppercase; margin-bottom: 4px;">현재 활성</div>
              <div style="font-size: 22px; font-weight: 700; color: var(--ink);">{active['name']}</div>
              <div style="font-size: 13px; color: var(--ink-2); margin-top: 2px;">
                {active.get('tagline') or '한 줄 소개 없음'}
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.info("활성 작가가 없습니다. 아래에서 신규 등록하거나 작가를 활성화하세요.")

    # ---------- 액션 줄 (전환 / 새 작가) ----------
    action_l, action_r = st.columns([1, 1])
    with action_l:
        if st.button(
            "✏️ 내 정보 편집" if active else "👤 작가 정보 편집",
            use_container_width=True,
            disabled=not active,
        ):
            st.session_state.editing_profile = active["name"]
            st.session_state.show_form = True
            st.rerun()
    with action_r:
        if st.button("➕ 새 작가 등록", use_container_width=True):
            st.session_state.pop("editing_profile", None)
            st.session_state.show_form = True
            st.rerun()

    # ---------- 다른 작가로 전환 ----------
    if profiles and len(profiles) > 1:
        with st.expander(f"👥 등록된 작가 {len(profiles)}명 — 전환·관리", expanded=False):
            for p in profiles:
                is_active = active and p["name"] == active["name"]
                cols = st.columns([5, 1, 1, 1])
                with cols[0]:
                    badge = " 🟢" if is_active else ""
                    st.markdown(f"**{p['name']}**{badge}")
                    st.caption(
                        f"{p.get('tagline') or '소개 없음'} · "
                        f"마지막 사용: {p.get('last_used', '')[:10] or '-'}"
                    )
                with cols[1]:
                    if not is_active and st.button("활성화", key=f"act_{p['name']}"):
                        prof.set_active(p["name"])
                        st.rerun()
                with cols[2]:
                    if st.button("편집", key=f"edt_{p['name']}"):
                        st.session_state.editing_profile = p["name"]
                        st.session_state.show_form = True
                        st.rerun()
                with cols[3]:
                    if st.button("🗑", key=f"del_{p['name']}", help="삭제"):
                        prof.delete_profile(p["name"])
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
        target_profile = (
            prof.load_profile(st.session_state.editing_profile)
            if editing else prof.empty_profile()
        )

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

            col_save, col_act, col_cancel = st.columns(3)
            with col_save:
                saved = st.form_submit_button("💾 저장", type="primary")
            with col_act:
                save_and_activate = st.form_submit_button("💾 저장 + 활성화")
            with col_cancel:
                cancel = st.form_submit_button("취소")

            if (saved or save_and_activate) and name:
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
                    "last_modified": datetime.now().isoformat(),
                }
                if not new_profile.get("created_at"):
                    new_profile["created_at"] = datetime.now().isoformat()

                prof.save_profile(new_profile)
                if save_and_activate:
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

    # ---------- Claude 연결 상태 (한 줄) ----------
    if status["ready"]:
        st.success(f"✓ Claude 연결됨 — {status['label']}")
    else:
        st.warning(f"⚠ Claude 미연결 — {status['label']}")
    st.caption(status["detail"])

    # ---------- Supabase (영구 저장) 진단 ----------
    sb_diag = ssm_db.diagnose()
    if sb_diag["client_created"]:
        st.success("✓ Supabase 연결됨 — 작품·프로필·채팅 영구 저장 활성화")
    else:
        st.error("⚠ Supabase 미연결 — 데이터가 임시 저장됨 (재배포 시 사라짐)")
        with st.expander("🛠 Supabase 진단 정보 (왜 안 되는지 보기)", expanded=True):
            st.json(sb_diag)
            st.caption(
                "원인:\n"
                "- supabase_module_imported = False → requirements.txt에 supabase 없음 (재배포 필요)\n"
                "- url_set 또는 key_set = False → Streamlit Cloud Secrets에 SUPABASE_URL/KEY 입력 누락\n"
                "- is_enabled = True인데 client_created = False → URL/KEY 값이 잘못됐거나 네트워크 오류"
            )

    with st.expander("❓ Claude 연결 방법", expanded=not status["ready"]):
        st.markdown(
            """
**방법 1 — Claude 앱 (권장, 작가 추가 설정 0)**
1. [claude.ai](https://claude.ai) 가입 + Pro/Max 구독 ($20/월)
2. [Claude Desktop 앱](https://claude.ai/download) 설치 + 로그인
3. 자동 감지됨

**방법 2 — API 키 직접 (사용량 청구)**
1. [console.anthropic.com](https://console.anthropic.com) 가입
2. 결제수단 등록 → API 키 발급
3. 아래에 붙여넣기 (작품 1편당 약 $0.5~$2)
            """
        )

    # ---------- 핵심 설정 ----------
    st.markdown("### 설정")

    api_key = st.text_input(
        "API 키 (방법 2 사용 시만)",
        value=env.get("ANTHROPIC_API_KEY", ""),
        type="password",
        placeholder="sk-ant-... · 비워두면 Claude 앱(방법 1) 자동 사용",
    )

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
        help="보조작가 채팅은 항상 Haiku 사용. 그 외 모드 기본값을 여기서.",
    )

    drive_dir = st.text_input(
        "외부 동기화 폴더 (선택)",
        value=env.get("DRIVE_OUTPUT_DIR", ""),
        placeholder="예: G:/내 드라이브/내 작품 (비워두면 로컬만)",
    )

    if st.button("💾 설정 저장", type="primary", use_container_width=True):
        write_env({
            "ANTHROPIC_API_KEY": api_key,
            "DEFAULT_MODEL": model,
            "DRIVE_OUTPUT_DIR": drive_dir,
            "SORI_SKILL_DIR": env.get("SORI_SKILL_DIR", ""),
        })
        st.success("✓ 저장. 페이지 새로고침 시 적용.")

    # ---------- 고급 / 진단 (접어둠) ----------
    with st.expander("🛠 고급 — 노하우 폴더 / 진단"):
        st.markdown("**외부 노하우 폴더** (거의 안 씀, 비워두면 내장 사용)")
        sori_skill_dir = st.text_input(
            "노하우 폴더 경로",
            value=env.get("SORI_SKILL_DIR", ""),
            placeholder="(비워두면 내장 자동 사용)",
            label_visibility="collapsed",
        )
        if sori_skill_dir != env.get("SORI_SKILL_DIR", ""):
            if st.button("저장", key="save_skill_dir"):
                write_env({
                    "ANTHROPIC_API_KEY": api_key,
                    "DEFAULT_MODEL": model,
                    "DRIVE_OUTPUT_DIR": drive_dir,
                    "SORI_SKILL_DIR": sori_skill_dir,
                })
                st.success("✓ 저장")

        st.markdown("---")
        st.markdown("**진단 정보**")
        st.code(
            f"""인증 모드:     {auth.get_auth_mode()}
Claude 앱 감지: {auth.detect_claude_code()}
API 키 등록:   {auth.has_api_key()}
저장 폴더:     {drive_dir or '(로컬만)'}
노하우 폴더:   {sori_skill_dir or '(내장)'}"""
        )

        st.markdown("---")
        st.markdown("**본문 폰트**")
        st.caption(
            "메뉴/UI 폰트: Pretendard 고정. "
            "본문(대본 입력)은 위 작가 프로필에서 8종 중 선택."
        )
