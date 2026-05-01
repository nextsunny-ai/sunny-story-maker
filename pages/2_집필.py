"""집필 모드 — 사용자 정보 입력 + AI 단계별 보조
장르마다 단계와 입력 필드가 동적으로 변경됨."""

import streamlit as st
from modules.page_init import init_page
init_page("집필 — SUNNY Story Maker")

from modules import sori_client, exporter, storage
from modules.genres import GENRES, list_genre_names, parse_genre_choice
from modules.workflows import get_workflow
st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">✏️</span>집필</div>
        <div class="app-header-version">단계별 작가 워크플로우</div>
    </div>
    """,
    unsafe_allow_html=True,
)

# 세션 상태 초기화
if "cowrite_state" not in st.session_state:
    st.session_state.cowrite_state = {
        "stage_idx": 0,
        "genre_letter": None,
        "user_input": {},
        "results": {},
        "project_name": "",
    }

state = st.session_state.cowrite_state

# 홈에서 장르 카드로 들어왔으면 그 장르를 자동 선택
if st.session_state.get("prefilled_genre"):
    state["genre_letter"] = st.session_state.prefilled_genre
    st.session_state.prefilled_genre = None  # 한 번만 적용

# ========== 작품명 + 장르 (헤딩 없이 바로) ==========
col1, col2 = st.columns([2, 1])
with col1:
    project_name = st.text_input(
        "작품명",
        value=state.get("project_name", ""),
        placeholder="작품 제목을 입력하세요",
    )
with col2:
    genre_options = list_genre_names()
    current_letter = state.get("genre_letter") or "A"
    try:
        current_idx = next(i for i, n in enumerate(genre_options) if n.startswith(f"{current_letter}."))
    except StopIteration:
        current_idx = 0

    genre_choice = st.selectbox("장르", genre_options, index=current_idx)
    genre_letter = parse_genre_choice(genre_choice)

# 애니메이션(D/E) 진입 시 형식 선택 — 극장용/단편/시리즈 (전체 폭 사용)
if genre_letter in ("D", "E"):
    anime_options = ["극장용", "단편", "시리즈"]
    default_anime = "시리즈" if genre_letter == "E" else state.get("anime_format", "극장용")
    if default_anime not in anime_options:
        default_anime = "극장용"
    anime_format = st.radio(
        "애니메이션 형식",
        anime_options,
        index=anime_options.index(default_anime),
        horizontal=True,
        key="anime_format_radio",
    )
    state["anime_format"] = anime_format
    genre_letter = "E" if anime_format == "시리즈" else "D"

genre = GENRES[genre_letter]
workflow = get_workflow(genre_letter)

if state["genre_letter"] != genre_letter:
    state["genre_letter"] = genre_letter
    state["stage_idx"] = 0
    state["user_input"] = {}
    state["results"] = {}

state["project_name"] = project_name

# ========== 진행 단계 표시 (헤딩 없이 바만) ==========
steps_html = '<div class="process-bar">'
for i, step in enumerate(workflow["steps"]):
    cls = "active" if i == state["stage_idx"] else ("done" if i < state["stage_idx"] else "")
    icon = "✓" if i < state["stage_idx"] else str(i + 1)
    steps_html += f'<div class="process-step {cls}"><div class="process-step-num">{icon}</div>{step}</div>'
steps_html += "</div>"
st.markdown(steps_html, unsafe_allow_html=True)

current_step = workflow["steps"][state["stage_idx"]]

# ========== 단계 1: 의뢰 분석 (필드 동적 입력) ==========
if state["stage_idx"] == 0:
    user_input = state["user_input"]

    def _render_field(field):
        key = field["key"]
        label = field["label"]
        f_type = field["type"]
        default = field.get("default", user_input.get(key, ""))

        if f_type == "select":
            options = field["options"]
            idx = options.index(default) if default in options else 0
            user_input[key] = st.selectbox(label, options, index=idx, key=f"f_{key}")
        elif f_type == "multiselect":
            user_input[key] = st.multiselect(label, field["options"], default=user_input.get(key, []), key=f"f_{key}")
        elif f_type == "textarea":
            user_input[key] = st.text_area(label, value=user_input.get(key, ""), placeholder=field.get("placeholder", ""), key=f"f_{key}")
        elif f_type == "number":
            min_v = field.get("min", 0)
            max_v = field.get("max", 100)
            default_n = int(default) if str(default).isdigit() else min_v
            user_input[key] = st.number_input(label, min_value=min_v, max_value=max_v, value=default_n, key=f"f_{key}")
        else:
            user_input[key] = st.text_input(label, value=user_input.get(key, ""), placeholder=field.get("placeholder", ""), key=f"f_{key}")

    # textarea/multiselect는 풀폭, 나머지(select/text/number)는 2열 페어로 묶음.
    # pending이 혼자 남으면 half-width 유지 (오른쪽 비움).
    full_width_types = {"textarea", "multiselect"}

    def _flush_pending_alone(p):
        c1, _c2 = st.columns(2)
        with c1:
            _render_field(p)

    pending = None
    for field in workflow["fields"]:
        if field["type"] in full_width_types:
            if pending is not None:
                _flush_pending_alone(pending)
                pending = None
            _render_field(field)
        else:
            if pending is None:
                pending = field
            else:
                c1, c2 = st.columns(2)
                with c1:
                    _render_field(pending)
                with c2:
                    _render_field(field)
                pending = None
    if pending is not None:
        _flush_pending_alone(pending)

    state["user_input"] = user_input

    if st.button("다음 단계로 →", type="primary", disabled=not project_name):
        state["stage_idx"] = 1
        st.rerun()

# ========== 단계 2~: AI 작가에게 작업 의뢰 ==========
else:
    if st.button("← 이전 단계", key="prev"):
        state["stage_idx"] -= 1
        st.rerun()

    # 이전 단계 결과 표시
    with st.expander("📜 이전 단계 결과 보기", expanded=False):
        for k, v in state["results"].items():
            st.markdown(f"### {k}")
            st.markdown(v[:1500] + ("..." if len(v) > 1500 else ""))

    # 현재 단계 작업
    if current_step not in state["results"]:
        if st.button(f"🪄 AI 작가에게 '{current_step}' 의뢰", type="primary"):
            prompt = sori_client.build_collaborate_prompt(
                stage=current_step,
                user_input=state["user_input"],
                genre=genre,
                workflow=workflow,
                prior=state["results"],
            )
            with st.spinner(f"AI 작가가 {current_step} 작업 중..."):
                result = sori_client.call_sori(prompt, max_tokens=6000)
            state["results"][current_step] = result
            st.rerun()
    else:
        st.markdown(state["results"][current_step])

        col_a, col_b, col_c = st.columns(3)
        with col_a:
            if st.button("🔄 다시 작업", key="retry"):
                del state["results"][current_step]
                st.rerun()
        with col_b:
            if state["stage_idx"] < len(workflow["steps"]) - 1:
                if st.button("✓ OK, 다음 단계로", type="primary"):
                    state["stage_idx"] += 1
                    st.rerun()
            else:
                st.success("✓ 모든 단계 완료")
        with col_c:
            if st.button("💾 현재 단계 저장"):
                full_text = "\n\n".join([f"## {k}\n\n{v}" for k, v in state["results"].items()])
                meta = storage.save_version(
                    project_name,
                    full_text,
                    metadata={"genre": genre["code"], "stage": current_step, "user_input": state["user_input"]},
                    direction=f"단계 {state['stage_idx']+1}: {current_step}",
                )
                st.success(f"✓ {project_name} v{meta['version']} 저장")

# 최종 다운로드 + 추가 산출물
if state["stage_idx"] == len(workflow["steps"]) - 1 and current_step in state["results"]:
    st.markdown("---")
    full_text = "\n\n".join([f"## {k}\n\n{v}" for k, v in state["results"].items()])

    # ========== 추가 산출물 생성 (B 통합) ==========
    if project_name:
        st.markdown("## 📦 추가 산출물 생성")
        st.caption("작품 폴더에 자동 저장됩니다 (output/<작품명>/artifacts/).")

        art_buttons = [
            ("logline",    "🎯 로그라인",    sori_client.build_logline_prompt, 1500),
            ("synopsis",   "📄 시놉시스",   sori_client.build_synopsis_prompt, 3000),
            ("characters", "👥 캐릭터 시트", sori_client.build_characters_prompt, 5000),
            ("worldview",  "🌐 세계관",      sori_client.build_worldview_prompt, 4000),
            ("episodes",   "📺 회차 구성표", sori_client.build_episodes_prompt, 7000),
            ("proposal",   "📑 기획안",      sori_client.build_proposal_prompt, 5000),
        ]

        art_cols = st.columns(3)
        prior = {"집필 결과": full_text[:6000]}
        idea_brief = state["user_input"].get("hook") or state["user_input"].get("first_hook") or project_name

        for i, (key, label, builder, max_tok) in enumerate(art_buttons):
            col = art_cols[i % 3]
            with col:
                if st.button(label, key=f"w_art_{key}", use_container_width=True):
                    with st.spinner(f"{label} 작성 중..."):
                        if key == "logline":
                            prompt = builder(idea_brief, genre, state["user_input"])
                        else:
                            prompt = builder(idea_brief, genre, state["user_input"], prior=prior)
                        response = sori_client.call_sori(prompt, max_tokens=max_tok)
                        storage.save_artifact(
                            project_name, key, response,
                            metadata={"genre": genre["code"], "from": "writing"},
                        )
                        st.session_state[f"w_art_result_{key}"] = response
                        st.success(f"✓ {label} 저장됨")

        for key, label, _, _ in art_buttons:
            result_key = f"w_art_result_{key}"
            if result_key in st.session_state:
                with st.expander(f"📄 {label}", expanded=False):
                    st.markdown(st.session_state[result_key])

        # 산출물 현황
        artifacts = storage.list_artifacts(project_name)
        info_line = " · ".join([
            f"**{info['name']}** v{info['latest_version']}" if info["has"] else f"~~{info['name']}~~"
            for k, info in sorted(artifacts.items(), key=lambda x: x[1]["order"])
        ])
        st.caption(info_line)

    st.markdown("---")
    st.markdown("## 📥 최종 출력")

    if st.button("📥 .docx 다운로드"):
        doc_bytes = exporter.export_to_docx(
            title=project_name,
            body=full_text,
            genre_letter=genre_letter,
            export_format=workflow["export_format"],
        )
        st.download_button("💾 다운로드", data=doc_bytes,
                           file_name=f"{project_name}_v1.docx",
                           mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document")