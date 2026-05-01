"""기획 패키지 — 한 줄 아이디어로 8개 산출물 자동 생성
로그라인 / 시놉시스 / 트리트먼트 / 캐릭터시트 / 세계관 / 회차구성표 / 기획안 / 대본 샘플
모두 작품 폴더(output/<작품명>/artifacts/)에 자동 저장."""

import os
import sys
import subprocess
import streamlit as st
from modules.page_init import init_page
init_page("기획 패키지 — SUNNY Story Maker")

from modules import sori_client, storage
from modules.genres import GENRES, list_genre_names, parse_genre_choice
from modules.workflows import get_workflow


def open_folder_in_explorer(path) -> bool:
    """OS별 파일 탐색기로 폴더 열기. 클라우드 환경은 무시."""
    try:
        path = str(path)
        if sys.platform == "win32":
            os.startfile(path)
        elif sys.platform == "darwin":
            subprocess.run(["open", path], check=False)
        else:
            subprocess.run(["xdg-open", path], check=False)
        return True
    except Exception:
        return False


def is_local_run() -> bool:
    """Streamlit Cloud가 아닌 로컬 실행인지."""
    return not bool(os.environ.get("STREAMLIT_SERVER_PORT") and os.environ.get("STREAMLIT_RUNTIME_ENV") == "cloud")
st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">📦</span>기획 패키지</div>
        <div class="app-header-version">한 번에 8개 산출물 자동 생성</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background: var(--rust-soft, #FEF1E8); padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
    <strong style="color: #C2410C;">한꺼번에 풀 패키지</strong>
    한 줄 아이디어 + 매체만 정해주세요. AI 작가가 로그라인 → 시놉시스 → 트리트먼트 → 캐릭터 시트 →
    세계관 → 회차 구성표 → 기획안 → 대본 샘플까지 한 번에 만들어 작품 폴더에 자동 저장합니다.
    </div>
    """,
    unsafe_allow_html=True,
)


# ========== 1. 작품 정보 ==========
st.markdown("## 1. 작품 정보")
col1, col2 = st.columns([2, 1])
with col1:
    project_name = st.text_input(
        "작품명",
        value=st.session_state.get("pkg_project_name", ""),
        placeholder="예: 시골카페 일기",
    )
with col2:
    genre_choice = st.selectbox(
        "매체",
        list_genre_names(),
        index=list(GENRES.keys()).index(st.session_state.get("pkg_genre_letter", "A"))
        if st.session_state.get("pkg_genre_letter") in GENRES else 0,
    )
    genre_letter = parse_genre_choice(genre_choice)
    genre = GENRES[genre_letter]

idea = st.text_area(
    "한 줄 아이디어",
    value=st.session_state.get("pkg_idea", ""),
    height=80,
    placeholder="예) 번아웃으로 퇴사한 30대 직장인이 시골 마을 작은 카페를 인수하면서 벌어지는 일",
)

# 1번 섹션 안에서 누락 항목 안내
_sec1_missing = []
if not project_name:
    _sec1_missing.append("작품명")
if not idea:
    _sec1_missing.append("한 줄 아이디어")
if _sec1_missing:
    st.warning(f"⚠ 다음 항목이 비어있습니다: {' · '.join(_sec1_missing)}")


# ========== 2. 매체 분량 + 추가 정보 ==========
workflow = get_workflow(genre_letter)
user_input = {}

# 분량 필드는 밖으로 빼서 무조건 노출 — "분량/회차/러닝타임/면적" 등 매체별 규모 필드
LENGTH_KEYS = {
    "episodes",        # A 드라마 회차 수
    "runtime",         # B 영화 러닝타임
    "total_episodes",  # C 숏드라마 / H 웹소설
    "ep_length",       # E 애니 / M 예능 1편 분량
    "ep_count",        # E 애니 시즌당 화수
    "length_target",   # F 웹툰
    "duration",        # G 다큐 / I 뮤지컬
    "chars_per_ep",    # H 웹소설 회당 글자수
    "length_type",     # J 유튜브
    "area",            # K 전시 면적
    "zone_count",      # K 존 구성
}
# custom 자식 필드: 부모 select가 '기타' 류일 때 같이 나타나는 직접입력 필드
# 규칙: 이름이 "{parent}_custom"이면 자동으로 부모와 페어링
all_fields = workflow.get("fields", [])
all_keys = {f["key"] for f in all_fields}

CUSTOM_KEYS = {k for k in all_keys if k.endswith("_custom") and k[:-7] in all_keys}
CUSTOM_PARENT = {k: k[:-7] for k in CUSTOM_KEYS}

length_fields = [f for f in all_fields if f["key"] in LENGTH_KEYS]
custom_fields_by_parent = {f["key"]: f for f in all_fields if f["key"] in CUSTOM_KEYS}
detail_fields = [
    f for f in all_fields
    if f["key"] not in LENGTH_KEYS and f["key"] not in CUSTOM_KEYS
]


def _render_with_custom(field: dict):
    """select + 그 자식 _custom 필드를 짝으로. '기타' 선택 시만 자식 노출."""
    _render_field(field)
    child_key = f"{field['key']}_custom"
    if child_key in custom_fields_by_parent:
        parent_val = user_input.get(field["key"], "")
        if isinstance(parent_val, str) and "기타" in parent_val:
            child = dict(custom_fields_by_parent[child_key])
            if not child.get("label", "").startswith("↪"):
                child["label"] = "↪ 직접 입력"
            _render_field(child)
        else:
            user_input[child_key] = ""


def _render_field(field: dict):
    key = field["key"]
    f_type = field["type"]
    label = field["label"]
    if f_type == "select":
        opts = field["options"]
        default = field.get("default")
        idx = opts.index(default) if default in opts else 0
        user_input[key] = st.selectbox(label, opts, index=idx, key=f"pkg_{key}")
    elif f_type == "multiselect":
        user_input[key] = st.multiselect(label, field["options"], key=f"pkg_{key}")
    elif f_type == "textarea":
        user_input[key] = st.text_area(label, placeholder=field.get("placeholder", ""), key=f"pkg_{key}")
    elif f_type == "number":
        user_input[key] = st.number_input(
            label,
            min_value=field.get("min", 0),
            max_value=field.get("max", 100),
            value=field.get("default", field.get("min", 0)),
            key=f"pkg_{key}",
        )
    else:
        user_input[key] = st.text_input(label, placeholder=field.get("placeholder", ""), key=f"pkg_{key}")


# ---- 분량 필드 (항상 보이게) ----
if length_fields:
    st.markdown(f"##### 📏 {genre['name']} 분량 / 규모")
    cols_len = st.columns(min(len(length_fields), 2))
    for i, field in enumerate(length_fields):
        with cols_len[i % len(cols_len)]:
            _render_with_custom(field)

# ---- 추가 정보 (선택, expander) ----
common_detail_keys = ["sub_genre", "tone", "target_audience", "protagonist_count",
                       "pov", "era", "space", "structure"]
filtered_detail = [f for f in detail_fields if f["key"] in common_detail_keys]

if filtered_detail:
    with st.expander("📝 추가 정보 (선택 — 더 정확한 결과 위해)", expanded=False):
        cols = st.columns(2)
        for i, field in enumerate(filtered_detail):
            with cols[i % 2]:
                _render_with_custom(field)


# ========== 3. 산출물 선택 ==========
st.markdown("## 2. 만들 산출물 (8종)")
st.caption("필요한 것만 체크. 1개당 약 1분 소요.")

artifacts_to_make = {}
art_cols = st.columns(2)

ARTIFACT_INFO = [
    ("logline",     "🎯 로그라인",       "1줄 — 피칭/투자용 (3안)",                            True),
    ("synopsis",    "📄 시놉시스",       "A4 1쪽 — 1차 검토용",                                True),
    ("treatment",   "📝 트리트먼트",     "A4 3~5쪽 — 2차 검토용",                              True),
    ("characters",  "👥 캐릭터 시트",    "메인 3~5명 — Want/Need/Backstory/비유 체계",         True),
    ("worldview",   "🌐 세계관 정리서",  "시대·공간·룰·연표·핵심 장소",                        True),
    ("episodes",    "📺 회차 구성표",    "회차별 사건/턴/엔딩 (시리즈만)",                     genre_letter in ("A", "C", "E", "F", "H")),
    ("proposal",    "📑 기획안",         "제작사/공모전 제출용 — 한국 표준 양식",              True),
    ("script",      "🎬 대본 샘플",      "EP01 첫 부분 (5~10페이지) — 매체 양식",              True),
]

for i, (key, label, desc, default) in enumerate(ARTIFACT_INFO):
    col = art_cols[i % 2]
    with col:
        # 시리즈물 아닌데 회차구성 → 비활성
        if key == "episodes" and not default:
            st.checkbox(f"{label} — *이 매체에 안 맞음*", value=False, disabled=True, key=f"art_{key}")
            artifacts_to_make[key] = False
        else:
            artifacts_to_make[key] = st.checkbox(f"{label} — {desc}", value=default, key=f"art_{key}")

selected_count = sum(1 for v in artifacts_to_make.values() if v)
st.caption(f"선택: **{selected_count}개** · 예상 소요시간: 약 {selected_count}분")

if selected_count == 0:
    st.warning("⚠ 산출물을 1개 이상 체크해주세요.")


# ========== 4. 실행 ==========
st.markdown("## 3. 패키지 생성")

ready = bool(project_name and idea and selected_count > 0)

if ready:
    st.info(
        f"⏱ 약 {selected_count}분 소요. **이 화면에서 기다려주세요.** "
        "다른 페이지로 이동하거나 새로고침하면 생성이 중단됩니다. "
        f"단, 한 개 끝날 때마다 `output/{project_name}/artifacts/`에 즉시 저장되어, "
        "중단되더라도 거기까지 만든 산출물은 그대로 남아있어 다시 이어 만들면 됩니다."
    )

if st.button(
    "📦 패키지 생성 시작",
    type="primary",
    use_container_width=True,
    disabled=not ready,
):
    if ready:
        # 메타데이터 미리 저장
        st.session_state.pkg_project_name = project_name
        st.session_state.pkg_genre_letter = genre_letter
        st.session_state.pkg_idea = idea

        # 의존성 순서: 로그라인 → 시놉시스 → 캐릭터 → 세계관 → 트리트먼트 → 회차 → 기획안 → 대본
        order = ["logline", "synopsis", "characters", "worldview",
                 "treatment", "episodes", "proposal", "script"]
        builders = {
            "logline":    sori_client.build_logline_prompt,
            "synopsis":   sori_client.build_synopsis_prompt,
            "treatment":  sori_client.build_treatment_prompt,
            "characters": sori_client.build_characters_prompt,
            "worldview":  sori_client.build_worldview_prompt,
            "episodes":   sori_client.build_episodes_prompt,
            "proposal":   sori_client.build_proposal_prompt,
            "script":     sori_client.build_script_prompt,
        }
        max_tokens_map = {
            "logline": 1500, "synopsis": 3000, "treatment": 6000,
            "characters": 5000, "worldview": 4000, "episodes": 7000,
            "proposal": 5000, "script": 6000,
        }

        selected_keys = [k for k in order if artifacts_to_make.get(k)]
        total = len(selected_keys)
        results = {}
        errors = []
        completed_files = []

        # ---- 진행 표시 (간단하게: 현재 작업 + 글자 흐름만) ----
        st.markdown("### 🛠 작업 중")
        progress = st.progress(0, text=f"0 / {total} 시작 중...")
        live_box = st.empty()  # 현재 작업 하나만 표시

        for i, key in enumerate(selected_keys):
            artifact_name = next(
                (label for k2, label, _, _ in ARTIFACT_INFO if k2 == key), key
            )
            progress.progress(i / total, text=f"{i+1} / {total} · {artifact_name} 작성 중...")

            builder = builders[key]
            prior = {
                next((label for k2, label, _, _ in ARTIFACT_INFO if k2 == k), k): v
                for k, v in results.items()
            }

            try:
                if key == "logline":
                    prompt = builder(idea, genre, user_input)
                else:
                    prompt = builder(idea, genre, user_input, prior=prior)

                # 스트리밍 — 글자가 실시간으로 흐르도록
                response = ""
                if sori_client.is_configured():
                    try:
                        for chunk in sori_client.stream_sori(
                            prompt, max_tokens=max_tokens_map.get(key, 4000)
                        ):
                            response += chunk
                            if len(response) % 80 < len(chunk):
                                live_box.markdown(
                                    f"⏳ **{artifact_name}** ({len(response):,}자)\n\n"
                                    f"> {response[-300:]}"
                                )
                    except Exception:
                        response = sori_client.call_sori(
                            prompt, max_tokens=max_tokens_map.get(key, 4000)
                        )
                else:
                    response = sori_client.call_sori(
                        prompt, max_tokens=max_tokens_map.get(key, 4000)
                    )

                if not response or response.startswith("[오류]") or response.startswith("[Mock"):
                    raise ValueError(f"빈 응답 또는 오류 응답: {response[:100] if response else 'empty'}")

                results[key] = response
                saved = storage.save_artifact(
                    project_name, key, response,
                    metadata={
                        "genre": genre["code"],
                        "idea": idea,
                        "user_input": user_input,
                    },
                )
                completed_files.append((artifact_name, saved))

                live_box.markdown(f"✓ **{artifact_name}** 완료 ({len(response):,}자)")
                st.toast(f"✓ {artifact_name}", icon="📄")
            except Exception as e:
                live_box.markdown(f"❌ **{artifact_name}** 실패: {e}")
                errors.append((artifact_name, str(e)))
                st.toast(f"❌ {artifact_name} 실패", icon="⚠️")

            progress.progress((i + 1) / total, text=f"{i+1} / {total} 완료")

        # ---- 최종 알림 + 폴더 열기 ----
        a_dir = storage.artifacts_dir(project_name)
        if not errors:
            st.success(f"🎉 {total}개 산출물 모두 완료.")
            st.balloons()
        elif results:
            st.warning(
                f"⚠ 부분 완료: {len(results)}개 성공 / {len(errors)}개 실패. "
                "실패한 항목은 다시 시도해주세요."
            )
            with st.expander("실패 상세"):
                for name, err in errors:
                    st.error(f"**{name}**: {err}")
        else:
            st.error("❌ 전체 실패. Claude 연결 상태를 확인해주세요. (어드민 → 시스템)")
            with st.expander("에러 상세"):
                for name, err in errors:
                    st.error(f"**{name}**: {err}")

        # 폴더 위치 + 열기 버튼 (성공·부분 성공 시에만)
        if results:
            st.markdown("##### 📂 저장 폴더")
            col_p, col_btn = st.columns([3, 1])
            with col_p:
                st.code(str(a_dir), language=None)
            with col_btn:
                if is_local_run():
                    if st.button("📂 폴더 열기", use_container_width=True, key="open_folder_done"):
                        if open_folder_in_explorer(a_dir):
                            st.toast("폴더 열림", icon="📂")
                        else:
                            st.toast("열기 실패 — 경로 복사해서 직접 열어주세요", icon="⚠️")
                else:
                    st.caption("(클라우드 모드 — 아래 다운로드 버튼 이용)")

        st.session_state.pkg_results = results


# ========== 5. 결과 표시 ==========
if "pkg_results" in st.session_state and st.session_state.pkg_results:
    results = st.session_state.pkg_results
    st.markdown("---")
    st.markdown(f"## 📦 {project_name} — 산출물")

    # 결과 영역에서도 폴더 바로 열기
    if project_name:
        a_dir_show = storage.artifacts_dir(project_name)
        col_p, col_btn = st.columns([3, 1])
        with col_p:
            st.caption(f"📂 저장 위치: `{a_dir_show}`")
        with col_btn:
            if is_local_run():
                if st.button("📂 폴더 열기", use_container_width=True, key="open_folder_results"):
                    open_folder_in_explorer(a_dir_show)

    # 탭으로 표시
    tab_labels = []
    tab_keys = []
    for key, label, _, _ in ARTIFACT_INFO:
        if key in results:
            tab_labels.append(label)
            tab_keys.append(key)

    if tab_labels:
        tabs = st.tabs(tab_labels)
        for tab, key in zip(tabs, tab_keys):
            with tab:
                content = results[key]
                st.markdown(content)

                # 다운로드 버튼
                st.download_button(
                    f"📥 {key}_v1.md 다운로드",
                    data=content.encode("utf-8"),
                    file_name=f"{project_name}_{key}_v1.md",
                    mime="text/markdown",
                    key=f"dl_{key}",
                )


# ========== 6. 작품 폴더 산출물 현황 ==========
if project_name:
    st.markdown("---")
    st.markdown(f"## 📂 {project_name} 산출물 현황")
    artifacts = storage.list_artifacts(project_name)
    cols = st.columns(4)
    for i, (key, info) in enumerate(sorted(artifacts.items(), key=lambda x: x[1]["order"])):
        col = cols[i % 4]
        with col:
            if info["has"]:
                st.success(f"✓ {info['name']} · v{info['latest_version']} · {info.get('char_count', 0):,}자")
            else:
                st.caption(f"○ {info['name']} (없음)")
