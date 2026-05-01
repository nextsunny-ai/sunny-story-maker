"""어드민 — 작가 프로필 + 시스템 설정 통합 (우측 상단 ADMIN pill 진입점)
- 작가 프로필: 스타일/선호/노하우/안티패턴 (모든 모드에 자동 반영)
- 시스템 설정: Claude 연결 / API 키 / 저장 폴더 / 노하우 폴더 / 폰트 / 진단
"""

import streamlit as st
from pathlib import Path
from datetime import datetime
from modules.page_init import init_page
init_page("어드민 — SUNNY Story Maker")

from modules import profile as prof, auth
from modules.genres import list_genre_names
from modules.workflows import SCRIPT_FONTS

st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">⚙️</span>어드민</div>
        <div class="app-header-version">작가 프로필 · 시스템 설정</div>
    </div>
    """,
    unsafe_allow_html=True,
)

# ============================================================
# 최상위 탭 — 작가 프로필 / 시스템 설정
# ============================================================
top_profile, top_system = st.tabs(["👤 작가 프로필", "⚙️ 시스템 설정"])


# ============================================================
# 👤 작가 프로필
# ============================================================
with top_profile:
    st.markdown(
        """
        <div class="page-intro">
        <strong>왜 프로필?</strong>
        한번 등록하면 모든 모드(AI 기획 / 집필 / 각색 / 리뷰)에서 자동으로 작가 스타일이 반영됩니다.
        선호 장르·톤·비유 체계·안티패턴까지 다 기억해서 매번 입력 안 해도 돼요.
        </div>
        """,
        unsafe_allow_html=True,
    )

    tab1, tab2, tab3 = st.tabs(["🟢 활성 프로필", "📋 등록된 프로필", "➕ 신규 등록"])

    # ---------- Tab 1: 활성 프로필 ----------
    with tab1:
        active = prof.get_active()
        if active:
            st.success(f"현재 활성: **{active['name']}**")
            st.markdown(f"_{active.get('tagline', '')}_")

            col_a, col_b = st.columns(2)
            with col_a:
                st.markdown("##### 기본 정보")
                if active.get("career"): st.markdown(f"- **경력**: {active['career']}")
                if active.get("preferred_genres"): st.markdown(f"- **선호 장르**: {', '.join(active['preferred_genres'])}")
                if active.get("preferred_tone"): st.markdown(f"- **선호 톤**: {active['preferred_tone']}")
                if active.get("favorite_authors"): st.markdown(f"- **좋아하는 작가**: {active['favorite_authors']}")
            with col_b:
                st.markdown("##### 작업 노하우")
                if active.get("writing_style"): st.markdown(f"- **스타일**: {active['writing_style']}")
                if active.get("preferred_metaphor_systems"):
                    st.markdown(f"- **비유 체계**: {', '.join(active['preferred_metaphor_systems'])}")
                if active.get("preferred_font"): st.markdown(f"- **선호 폰트**: {active['preferred_font']}")

            if active.get("personal_anti_patterns"):
                with st.expander("🚫 개인 안티패턴"):
                    for p in active["personal_anti_patterns"]:
                        st.markdown(f"- {p}")
            if active.get("notes"):
                with st.expander("📝 추가 노트"):
                    st.markdown(active["notes"])

            st.markdown("---")
            if st.button("✏️ 활성 프로필 편집"):
                st.session_state.editing_profile = active["name"]
                st.rerun()
        else:
            st.info("활성 프로필이 없습니다. **신규 등록** 또는 **등록된 프로필**에서 활성화하세요.")

    # ---------- Tab 2: 등록된 프로필 ----------
    with tab2:
        profiles = prof.list_profiles()
        if not profiles:
            st.info("등록된 프로필이 없습니다.")
        else:
            st.markdown(f"### 총 {len(profiles)}명")
            for p in profiles:
                cols = st.columns([3, 1, 1, 1])
                with cols[0]:
                    st.markdown(f"**{p['name']}** — {p.get('tagline', '')}")
                    st.caption(
                        f"선호 장르: {', '.join(p.get('preferred_genres', []) or ['미지정'])} · "
                        f"마지막 사용: {p.get('last_used', '')[:10] or '-'}"
                    )
                with cols[1]:
                    if st.button("활성화", key=f"act_{p['name']}"):
                        prof.set_active(p["name"])
                        st.success(f"✓ {p['name']} 활성화")
                        st.rerun()
                with cols[2]:
                    if st.button("편집", key=f"edt_{p['name']}"):
                        st.session_state.editing_profile = p["name"]
                        st.rerun()
                with cols[3]:
                    if st.button("삭제", key=f"del_{p['name']}"):
                        prof.delete_profile(p["name"])
                        st.rerun()
                st.markdown("---")

    # ---------- Tab 3: 신규 등록 / 편집 ----------
    with tab3:
        editing = "editing_profile" in st.session_state
        target_profile = prof.load_profile(st.session_state.editing_profile) if editing else prof.empty_profile()

        if editing:
            st.info(f"✏️ 편집 모드: {target_profile['name']}")

        with st.form("profile_form"):
            st.markdown("### 기본 정보")
            col1, col2 = st.columns(2)
            with col1:
                name = st.text_input("작가명 (필수)", value=target_profile.get("name", ""), placeholder="필명 또는 본명")
                tagline = st.text_input("한 줄 소개", value=target_profile.get("tagline", ""), placeholder="예: 미스터리·SF 전문 / 10년차 드라마 작가")
            with col2:
                career = st.text_input("경력 (선택)", value=target_profile.get("career", ""), placeholder="예: 영화 시나리오 8년 / 데뷔 2018")
                favorite_authors = st.text_input(
                    "좋아하는 작가/감독",
                    value=target_profile.get("favorite_authors", ""),
                    placeholder="예: 박찬욱, 김은희, 박완서, McKee",
                )

            st.markdown("### 선호 작업 영역")
            preferred_genres = st.multiselect(
                "선호 장르 (복수 선택 가능)",
                list_genre_names(),
                default=target_profile.get("preferred_genres", []),
            )
            preferred_tone = st.text_input(
                "선호 톤",
                value=target_profile.get("preferred_tone", ""),
                placeholder="예: 다크하고 절제된 / 따뜻하고 일상적 / 시네마틱",
            )

            st.markdown("### 작업 스타일 / 노하우")
            writing_style = st.text_area(
                "내 스타일 (자유 서술)",
                value=target_profile.get("writing_style", ""),
                height=100,
                placeholder=(
                    "예) 서브텍스트 중시. 대사보다 행동/소품으로 보여주는 편.\n"
                    "회차 후크는 감정형 클리프행어 선호. 반전보다는 누적된 의미가 터지는 구조."
                ),
            )
            metaphor_systems_str = st.text_area(
                "자주 쓰는 캐릭터 비유 체계 (한 줄에 하나)",
                value="\n".join(target_profile.get("preferred_metaphor_systems", [])),
                height=80,
                placeholder=(
                    "예)\n야구 — 승부/시즌/타석 비유\n"
                    "건축 — 설계/구조/하중 비유\n"
                    "요리 — 재료/불/시간 비유"
                ),
            )
            anti_patterns_str = st.text_area(
                "🚫 절대 안 쓰는 패턴 (개인 안티패턴, 한 줄에 하나)",
                value="\n".join(target_profile.get("personal_anti_patterns", [])),
                height=80,
                placeholder=(
                    "예)\n격언체 대사 (\"인생은 ~다\")\n"
                    "회상 씬 남용\n"
                    "신파 클리셰\n"
                    "특정 단어 — 영혼, 운명, 진정한"
                ),
            )

            st.markdown("### 출력 선호")
            col_f, col_t = st.columns(2)
            with col_f:
                font_options = [f["css"] for f in SCRIPT_FONTS]
                current_font = target_profile.get("preferred_font", "Hahmlet")
                font_idx = font_options.index(current_font) if current_font in font_options else 0
                preferred_font = st.selectbox(
                    "선호 본문 폰트",
                    font_options,
                    index=font_idx,
                    format_func=lambda c: next((f["name"] for f in SCRIPT_FONTS if f["css"] == c), c),
                )
            with col_t:
                preferred_targets_str = st.text_input(
                    "주력 타겟층 (쉼표 구분)",
                    value=", ".join(target_profile.get("preferred_targets", [])),
                    placeholder="예: 30대 도시 여성, 40~50대 가족",
                )

            notes = st.text_area(
                "추가 노트 (자유)",
                value=target_profile.get("notes", ""),
                height=80,
                placeholder="기타 모든 작업에 반영되었으면 하는 것",
            )

            col_save, col_activate, col_cancel = st.columns(3)
            with col_save:
                saved = st.form_submit_button("💾 저장", type="primary")
            with col_activate:
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
                    "preferred_metaphor_systems": [s.strip() for s in metaphor_systems_str.splitlines() if s.strip()],
                    "personal_anti_patterns": [s.strip() for s in anti_patterns_str.splitlines() if s.strip()],
                    "preferred_font": preferred_font,
                    "preferred_targets": [s.strip() for s in preferred_targets_str.split(",") if s.strip()],
                    "notes": notes,
                    "last_modified": datetime.now().isoformat(),
                }
                if not new_profile.get("created_at"):
                    new_profile["created_at"] = datetime.now().isoformat()

                prof.save_profile(new_profile)
                if save_and_activate:
                    prof.set_active(name)
                if "editing_profile" in st.session_state:
                    del st.session_state.editing_profile
                st.success(f"✓ {name} 저장 완료")
                st.rerun()

            if cancel:
                if "editing_profile" in st.session_state:
                    del st.session_state.editing_profile
                st.rerun()


# ============================================================
# ⚙️ 시스템 설정
# ============================================================
with top_system:
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
        lines = []
        for k, v in values.items():
            if v is not None:
                lines.append(f"{k}={v}")
        env_path.write_text("\n".join(lines), encoding="utf-8")

    env = read_env()
    status = auth.get_status_for_writer()

    # ---------- 1. AI 작가 연결 ----------
    st.markdown("### 1. AI 작가 (Claude) 연결")
    if status["ready"]:
        st.success(status["label"])
        st.caption(status["detail"])
    else:
        st.warning(status["label"])
        st.caption(status["detail"])

    with st.expander("❓ Claude 연결 방법 (안 됐으면 펼쳐보기)", expanded=not status["ready"]):
        st.markdown(
            """
            **방법 1. Claude 앱으로 (★ 권장)**
            - [claude.ai](https://claude.ai) 가입 + 월 $20 Pro/Max 구독
            - [Claude Desktop 앱](https://claude.ai/download) 설치 + 로그인
            - 우리 프로그램이 **자동 감지** → 작가는 추가 설정 0

            **방법 2. API 키 직접**
            - [console.anthropic.com](https://console.anthropic.com) (Claude.ai와 다른 계정)
            - 결제수단 등록 → API 키 발급 (sk-ant-... 로 시작)
            - 아래 입력란에 붙여넣기
            - 사용량 청구 (작품 1편당 약 $0.5~$2)

            **잘 모르겠으면** 방법 1. 거의 모든 작가는 방법 1로 충분.
            """
        )

    # ---------- 2. API 키 ----------
    st.markdown("---")
    st.markdown("### 2. API 키 (방법 2 사용 시만)")
    st.caption("방법 1로 사용하시는 분은 비워두세요. 방법 1이 자동으로 쓰입니다.")

    api_key = st.text_input(
        "Anthropic API 키",
        value=env.get("ANTHROPIC_API_KEY", ""),
        type="password",
        placeholder="sk-ant-... (없으면 비워두세요)",
        help="Anthropic 콘솔에서 발급받은 API 키. 작가는 보통 비워둬도 됩니다.",
    )

    model = st.selectbox(
        "응답 품질 (모델)",
        ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
        index=0,
        format_func=lambda m: {
            "claude-opus-4-7": "최고 품질 (느리지만 가장 좋음 — 권장)",
            "claude-sonnet-4-6": "균형 (적당히 빠르고 좋음)",
            "claude-haiku-4-5-20251001": "빠른 속도 (간단한 작업용)",
        }.get(m, m),
        help="Opus = 시나리오용 권장. Haiku = 자잘한 캐릭터 이름 추천 같은 거에 쓰면 빨라요.",
    )

    # ---------- 3. 작품 저장 위치 ----------
    st.markdown("---")
    st.markdown("### 3. 작품 저장 위치")
    st.caption("기본은 이 프로그램 폴더 안 (output/). Drive/원드라이브와 자동 동기화하려면 그 폴더 경로 입력.")

    drive_dir = st.text_input(
        "외부 동기화 폴더 (선택)",
        value=env.get("DRIVE_OUTPUT_DIR", ""),
        placeholder="예: G:/내 드라이브/내 작품 (비워두면 로컬만 저장)",
        help="Google Drive / OneDrive / Dropbox 폴더 경로를 넣으면 작품 저장 시 자동으로 백업됩니다.",
    )

    # ---------- 4. 노하우 폴더 (고급) ----------
    st.markdown("---")
    with st.expander("📚 고급 — 외부 노하우 폴더 (선택)"):
        st.markdown(
            """
            **이게 뭔가요?**
            본인이 직접 만든 작가 노하우 문서(SKILL.md)가 있다면, 그 폴더를 연결하면
            AI 작가가 작업할 때 그걸 참고합니다.

            **거의 모든 작가는 비워두시면 됩니다.** 비워두면 프로그램 내장 노하우
            (humanizer 6패턴, 13장르 매뉴얼, 한국 실무 양식 등)를 자동으로 사용합니다.
            """
        )
        sori_skill_dir = st.text_input(
            "노하우 폴더 경로",
            value=env.get("SORI_SKILL_DIR", ""),
            placeholder="(비워두면 내장 노하우 자동 사용)",
        )

    # ---------- 저장 ----------
    st.markdown("---")
    if st.button("💾 시스템 설정 저장", type="primary", use_container_width=True):
        write_env({
            "ANTHROPIC_API_KEY": api_key,
            "DEFAULT_MODEL": model,
            "DRIVE_OUTPUT_DIR": drive_dir,
            "SORI_SKILL_DIR": sori_skill_dir,
        })
        st.success("✓ 저장 완료. 페이지 새로고침 시 적용됩니다.")

    # ---------- 5. 폰트 안내 ----------
    st.markdown("---")
    st.markdown("### 4. 본문 폰트")
    st.info(
        "**메뉴/UI 폰트**: Pretendard (변경 불가)\n\n"
        "**본문(대본 입력 영역)**: 위 작가 프로필에서 8종 중 선택 — "
        "함초롬바탕 / 나눔명조 / 본명조 / 마루부리 / KoPub바탕 / 고운바탕 / 나눔바른고딕 / 본고딕"
    )

    # ---------- 6. 진단 ----------
    st.markdown("---")
    with st.expander("🛠 진단 정보 (문제 있을 때만 보세요)"):
        st.code(
            f"""인증 모드: {auth.get_auth_mode()}
Claude 앱 감지: {auth.detect_claude_code()}
API 키 등록: {auth.has_api_key()}
저장 폴더: {drive_dir or '(로컬만)'}
노하우 폴더: {sori_skill_dir or '(내장 사용)'}"""
        )
