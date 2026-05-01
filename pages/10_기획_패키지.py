"""기획 패키지 — 한 줄 아이디어로 8개 산출물 자동 생성
로그라인 / 시놉시스 / 트리트먼트 / 캐릭터시트 / 세계관 / 회차구성표 / 기획안 / 대본 샘플
모두 작품 폴더(output/<작품명>/artifacts/)에 자동 저장."""

import streamlit as st
from pathlib import Path
from datetime import datetime

from modules import sori_client, storage, exporter
from modules.genres import GENRES, list_genre_names, parse_genre_choice
from modules.workflows import get_workflow

css_path = Path(__file__).parent.parent / "assets" / "styles.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)


from modules.sidebar import render_sidebar
render_sidebar()
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
        placeholder="예: 조선요괴 서울생존기",
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
    placeholder="예) 조선시대 요괴 사냥꾼이 봉인이 풀려 현대 서울로 떨어진다",
)


# ========== 2. 작가 입력 (선택 — 더 정확한 산출물용) ==========
with st.expander("📝 추가 정보 (선택 — 더 정확한 결과 위해)", expanded=False):
    workflow = get_workflow(genre_letter)
    user_input = {}
    cols = st.columns(2)
    common_keys = ["sub_genre", "tone", "target_audience", "protagonist_count",
                   "pov", "era", "space", "structure"]
    for i, field in enumerate(workflow.get("fields", [])):
        if field["key"] not in common_keys:
            continue
        col = cols[i % 2]
        key = field["key"]
        f_type = field["type"]
        with col:
            if f_type == "select":
                user_input[key] = st.selectbox(field["label"], field["options"], key=f"pkg_{key}")
            elif f_type == "multiselect":
                user_input[key] = st.multiselect(field["label"], field["options"], key=f"pkg_{key}")
            elif f_type == "textarea":
                user_input[key] = st.text_area(field["label"], placeholder=field.get("placeholder", ""), key=f"pkg_{key}")
            else:
                user_input[key] = st.text_input(field["label"], placeholder=field.get("placeholder", ""), key=f"pkg_{key}")


# ========== 3. 산출물 선택 ==========
st.markdown("## 2. 만들 산출물 (8종)")
st.caption("필요한 것만 체크. 전부 만들면 약 5~10분 소요.")

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


# ========== 4. 실행 ==========
st.markdown("## 3. 패키지 생성")

ready = bool(project_name and idea and selected_count > 0)

if not ready:
    st.warning("작품명 + 한 줄 아이디어 + 산출물 1개 이상 체크해주세요.")
else:
    if st.button("📦 패키지 생성 시작", type="primary", use_container_width=True):
        # 메타데이터 미리 저장
        st.session_state.pkg_project_name = project_name
        st.session_state.pkg_genre_letter = genre_letter
        st.session_state.pkg_idea = idea

        results = {}
        progress = st.progress(0)
        status = st.empty()

        # 산출물 생성 순서 (의존성 고려)
        # 로그라인 → 시놉시스 → 캐릭터 → 세계관 → 트리트먼트 → 회차 → 기획안 → 대본
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

        for i, key in enumerate(selected_keys):
            artifact_name = next((label for k2, label, _, _ in ARTIFACT_INFO if k2 == key), key)
            status.markdown(f"**{i+1}/{total}** · {artifact_name} 작성 중...")

            builder = builders[key]
            # 이전에 만든 결과를 prior로 전달 (의존성)
            prior = {
                next((label for k2, label, _, _ in ARTIFACT_INFO if k2 == k), k): v
                for k, v in results.items()
            }

            try:
                if key == "logline":
                    prompt = builder(idea, genre, user_input)
                else:
                    prompt = builder(idea, genre, user_input, prior=prior)

                response = sori_client.call_sori(prompt, max_tokens=max_tokens_map.get(key, 4000))
                results[key] = response

                # 작품 폴더에 자동 저장
                storage.save_artifact(
                    project_name, key, response,
                    metadata={
                        "genre": genre["code"],
                        "idea": idea,
                        "user_input": user_input,
                    },
                )
            except Exception as e:
                results[key] = f"[오류] {e}"

            progress.progress((i + 1) / total)

        status.success(f"✓ {total}개 산출물 생성 완료. 작품 폴더에 자동 저장됨.")
        st.session_state.pkg_results = results


# ========== 5. 결과 표시 ==========
if "pkg_results" in st.session_state and st.session_state.pkg_results:
    results = st.session_state.pkg_results
    st.markdown("---")
    st.markdown(f"## 📦 {project_name} — 산출물")

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
