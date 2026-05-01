"""각색 모드 — 같은 매체 무한+ 반복 + 다른 매체 변환 옵션
설계 원칙: 어떤 정보가 필요한지 진입 즉시 보여준다. 파일은 마지막에.
"""

import streamlit as st
from pathlib import Path
from modules.page_init import init_page
init_page("각색 — SUNNY Story Maker")

from modules import sori_client, file_parser, exporter, storage, profile as prof, learning
from modules.genres import GENRES, list_genre_names, parse_genre_choice
from modules.workflows import get_workflow

st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">🔄</span>각색</div>
        <div class="app-header-version">같은 매체 무한+ / 다른 매체 변환</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="page-intro">
    <strong>각색이란?</strong>
    이미 있는 작품을 (1) 같은 매체 안에서 디렉션대로 다시 쓰거나
    (2) 다른 매체(드라마→영화, 웹툰→웹소설 등)로 변환합니다.
    아래 순서대로 채워 주세요 — <strong>장르 · 디렉션 · 원본</strong>.
    </div>
    """,
    unsafe_allow_html=True,
)

# 리뷰 모드에서 넘어온 경우 자동 로드
prefilled = st.session_state.get("adapt_source", None)


# ============================================================
# 1. 각색 방식 + 장르 + 디렉션 (먼저 — 원본 없이도 채울 수 있음)
# ============================================================
st.markdown("## 1. 어떻게 각색?")

mode = st.radio(
    "각색 방식",
    ["같은 매체 내 각색 (무한 반복)", "다른 매체로 변환"],
    index=1 if (prefilled and prefilled.get("mode") == "recommend_genre") else 0,
    horizontal=True,
    help=(
        "같은 매체 = 영화→영화, 드라마→드라마. 같은 형식 안에서 디렉션대로 다시 씀.\n"
        "다른 매체 = 영화→웹툰, 드라마→웹소설 등. 자산은 살리고 형식 바꿈."
    ),
)

# ------- 장르 (둘 다 필요) -------
if prefilled:
    src_letter_default = next(
        (k for k, v in GENRES.items() if v["name"] == prefilled["genre"]["name"]),
        "B",
    )
else:
    src_letter_default = None

col_g, col_p = st.columns([1, 1])
with col_g:
    genre_options = list_genre_names()
    if src_letter_default:
        idx = next(
            (i for i, n in enumerate(genre_options) if n.startswith(f"{src_letter_default}.")),
            0,
        )
    else:
        idx = 0
    genre_choice = st.selectbox(
        "원본 장르",
        genre_options,
        index=idx,
        help="원본 작품이 무슨 매체였나요? 파일 첨부 후 자동 식별 결과로 보정 가능합니다.",
    )
    source_letter = parse_genre_choice(genre_choice)
    source_genre = GENRES[source_letter]

with col_p:
    project_name_default = prefilled["project"] if prefilled else ""
    project_name = st.text_input(
        "작품명 (저장용)",
        value=project_name_default,
        placeholder="예: 트랑로제",
    )


# ============================================================
# 2. 디렉션 (방식별로 입력 다름)
# ============================================================
st.markdown("## 2. 무엇을 어떻게 바꿀까?")

# 디렉션과 보조 입력값 보관
direction = ""
target_section = "전체"
target_letter = None
target_genre = None
target_workflow = None
sub_mode = None

if mode.startswith("같은 매체"):
    st.caption("뭘 바꿀지 골라주세요. 여러 개 선택 가능. 직접 쓰는 칸도 있어요.")

    # 디렉션 누적 저장 (rerun 사이에 유지)
    if "direction_parts" not in st.session_state:
        st.session_state.direction_parts = []

    # ---------- 톤 / 분위기 ----------
    st.markdown("**🎨 톤 / 분위기**")
    tone_opts = [
        ("🌙 더 어둡게", "톤을 더 어둡고 무겁게"),
        ("☀️ 더 따뜻하게", "톤을 더 따뜻하고 부드럽게"),
        ("⚡ 긴장감 더", "긴장감과 서스펜스를 더 강하게"),
        ("😄 코미디 더", "유머와 재미를 더하기"),
        ("💔 감정 진하게", "감정 묘사를 더 깊이"),
        ("🧊 절제하게", "감정 과잉 빼고 더 절제된 톤으로"),
    ]
    tcols = st.columns(len(tone_opts))
    for i, (label, phrase) in enumerate(tone_opts):
        with tcols[i]:
            if st.button(label, key=f"tone_{i}", use_container_width=True):
                if phrase not in st.session_state.direction_parts:
                    st.session_state.direction_parts.append(phrase)
                    st.rerun()

    # ---------- 분량 / 결말 ----------
    st.markdown("**📏 분량 / 결말**")
    other_opts = [
        ("✂️ 짧게", "분량을 더 짧고 압축적으로"),
        ("📜 길게", "분량을 더 길게, 디테일 추가"),
        ("🌅 결말 해피", "결말을 희망적·따뜻하게"),
        ("🌧 결말 비극", "결말을 비극적·여운 남게"),
        ("❓ 결말 오픈", "결말을 오픈 엔딩으로"),
        ("🔄 반전 추가", "예상 못한 반전 한 번 추가"),
    ]
    ocols = st.columns(len(other_opts))
    for i, (label, phrase) in enumerate(other_opts):
        with ocols[i]:
            if st.button(label, key=f"other_{i}", use_container_width=True):
                if phrase not in st.session_state.direction_parts:
                    st.session_state.direction_parts.append(phrase)
                    st.rerun()

    # ---------- 누적된 디렉션 미리보기 + 직접 입력 ----------
    col_a, col_b = st.columns([2, 1])
    with col_a:
        # 칩에서 모인 것들 + 자유 입력 합쳐 한 textarea로
        accumulated = "\n".join(f"- {p}" for p in st.session_state.direction_parts)
        custom_direction = st.text_area(
            "🎯 최종 디렉션 (직접 수정·추가 가능)",
            value=accumulated,
            height=160,
            placeholder=(
                "위 버튼을 눌러 채우거나, 여기 직접 쓰세요. 예:\n"
                "- 주인공 이름을 '도윤'으로 바꿔줘\n"
                "- 첫 장면을 더 강렬하게\n"
                "- 학교 배경을 회사로 바꿔줘"
            ),
            key="direction_textarea",
        )
        direction = custom_direction.strip()

        col_clear, _ = st.columns([1, 4])
        with col_clear:
            if st.button("🗑 비우기", use_container_width=True):
                st.session_state.direction_parts = []
                st.rerun()

    with col_b:
        target_section = st.selectbox(
            "수정 범위",
            ["전체", "특정 부분만", "특정 회차만", "특정 인물 대사만"],
            help="기본은 전체. 일부만 바꾸고 싶으면 선택.",
        )
        if target_section != "전체":
            target_detail = st.text_input(
                "어디?",
                placeholder="예: 첫 장면 / EP05 / 도윤 대사",
            )
            if target_detail:
                target_section = f"{target_section}: {target_detail}"

else:  # 다른 매체로 변환
    sub_mode = st.radio(
        "변환 단계",
        ["1. 추천 받기 (어느 매체가 좋을지)", "2. 특정 매체로 직접 변환"],
        horizontal=True,
    )

    if sub_mode.startswith("2."):
        target_options = [
            name for name in list_genre_names() if not name.startswith(f"{source_letter}.")
        ]
        target_choice = st.selectbox(
            "변환 목표 매체",
            target_options,
            help="원본과 다른 매체를 선택하세요.",
        )
        target_letter = parse_genre_choice(target_choice)
        target_genre = GENRES[target_letter]
        target_workflow = get_workflow(target_letter)

        with st.expander(f"📖 {target_genre['name']} 가이드 — 미리 확인"):
            st.markdown(f"- **분량**: {target_genre.get('분량_표준', '-')}")
            st.markdown(f"- **양식**: {target_genre.get('포맷', '-')}")

        direction = st.text_area(
            "추가 디렉션 (선택)",
            height=80,
            placeholder=(
                "예시:\n"
                "- 주인공을 30대 여성으로 변경\n"
                "- 시점을 1인칭 일기체로\n"
                "- 폭력 수위 낮추고 가족 드라마 강조"
            ),
        )
    else:
        st.caption("AI가 이 작품에 잘 맞는 다른 매체 5개를 추천. 추천 결과를 보고 다음 단계에서 선택.")


# ============================================================
# 3. 원본 작품 첨부
# ============================================================
st.markdown("## 3. 원본 작품 첨부")

if prefilled:
    st.success(f"✓ 리뷰 모드에서 자동 로드: **{prefilled['project']}**")
    text = prefilled["text"]
    if not project_name:
        project_name = prefilled["project"]
else:
    upload_method = st.radio(
        "입력 방식",
        ["파일 업로드", "텍스트 붙여넣기", "저장된 프로젝트"],
        horizontal=True,
    )
    text = ""

    if upload_method == "파일 업로드":
        uploaded = st.file_uploader(
            "원본 파일",
            type=["docx", "pdf", "txt", "md", "fountain"],
            help="docx / pdf / txt / md / fountain — 200MB 이하",
        )
        if uploaded:
            text = file_parser.parse_uploaded_file(uploaded)
            if not project_name:
                project_name = Path(uploaded.name).stem
    elif upload_method == "텍스트 붙여넣기":
        text = st.text_area(
            "원본 본문",
            height=260,
            placeholder="시나리오 / 트리트먼트 / 회차 본문 붙여넣기",
        )
    else:
        projects = storage.list_projects()
        if projects:
            chosen = st.selectbox("프로젝트", [p["name"] for p in projects])
            versions = storage.list_versions(chosen)
            v_choice = st.selectbox(
                "버전",
                [f"v{v['version']} ({v['saved_at'][:10]})" for v in versions],
            )
            if v_choice:
                v_num = int(v_choice.split()[0][1:])
                text = storage.load_version(chosen, v_num)
                if not project_name:
                    project_name = chosen
        else:
            st.info("저장된 프로젝트가 없습니다.")

# 텍스트 들어오면 자동 식별 안내
if text:
    auto_letter = file_parser.estimate_genre(text)
    auto_genre = GENRES.get(auto_letter)
    if auto_genre and auto_letter != source_letter:
        st.info(f"💡 자동 식별 장르는 **{auto_genre['name']}**입니다. 위 1번에서 변경하실 수 있어요.")

    word_stats = file_parser.get_word_count(text)
    cols = st.columns(3)
    cols[0].metric("총 글자 수", f"{word_stats['chars_with_spaces']:,}")
    cols[1].metric("줄 수", f"{word_stats['lines']:,}")
    cols[2].metric("단락 수", f"{word_stats['paragraphs']:,}")

    with st.expander("📄 내용 미리보기"):
        st.text(text[:1500] + ("..." if len(text) > 1500 else ""))


# ============================================================
# 4. 실행
# ============================================================
st.markdown("## 4. 실행")

# 같은 매체
if mode.startswith("같은 매체"):
    valid = bool(text) and bool(direction) and bool(project_name)
    if not text:
        st.caption("⬆ 원본을 첨부해주세요")
    elif not direction:
        st.caption("⬆ 수정 디렉션을 입력해주세요")
    elif not project_name:
        st.caption("⬆ 작품명을 입력해주세요")

    existing_versions = storage.list_versions(project_name) if project_name else []
    if existing_versions:
        with st.expander(f"📚 {project_name} 버전 히스토리 ({len(existing_versions)}개)"):
            for v in existing_versions[:10]:
                st.markdown(
                    f"- **v{v['version']}** ({v['saved_at'][:10]}) — "
                    f"{v.get('direction', '(no direction)')}"
                )

    if st.button("🔄 다음 버전 생성", type="primary", disabled=not valid, use_container_width=True):
        next_v = (existing_versions[0]["version"] + 1) if existing_versions else 2
        prompt = sori_client.build_revise_prompt(
            text=text,
            direction=direction,
            genre=source_genre,
            target_section=target_section,
            version_number=next_v,
        )
        st.session_state.ssm_busy = {"label": f"각색 v{next_v} 작성 중", "detail": project_name}
        st.markdown(f"### ✍ v{next_v}이(가) 흐르는 중...")
        live = st.empty()
        result = sori_client.stream_to_placeholder(prompt, live, max_tokens=8000)
        st.session_state.pop("ssm_busy", None)

        st.session_state.last_revise = {
            "project": project_name,
            "version": next_v,
            "direction": direction,
            "target_section": target_section,
            "result": result,
            "genre": source_genre,
            "source_letter": source_letter,
        }

    if "last_revise" in st.session_state:
        r = st.session_state.last_revise
        st.markdown(f"### ✨ v{r['version']} 결과")
        st.markdown(r["result"])

        col_x, col_y, col_z = st.columns(3)
        with col_x:
            if st.button(f"💾 v{r['version']} 저장", use_container_width=True, type="primary"):
                parent_v = existing_versions[0]["version"] if existing_versions else 1
                meta = storage.save_version(
                    r["project"],
                    r["result"],
                    metadata={"type": "revise", "target_section": r["target_section"]},
                    direction=r["direction"],
                    parent_version=parent_v,
                )
                st.success(f"✓ v{meta['version']} 저장. 또 수정하려면 위에서 디렉션 다시.")

        with col_y:
            if st.button("📥 .docx 다운로드", use_container_width=True):
                workflow = get_workflow(r["source_letter"])
                doc_bytes = exporter.export_to_docx(
                    title=f"{r['project']}_v{r['version']}",
                    body=r["result"],
                    genre_letter=r["source_letter"],
                    export_format=workflow["export_format"],
                )
                st.download_button(
                    "💾 다운로드",
                    data=doc_bytes,
                    file_name=f"{r['project']}_v{r['version']}.docx",
                    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )

        with col_z:
            if st.button("🔄 또 수정 (다음 라운드)", use_container_width=True):
                # 새로 저장된 버전을 원본으로 사용
                st.session_state.adapt_source = {
                    "text": r["result"],
                    "project": r["project"],
                    "genre": r["genre"],
                    "mode": "same_genre",
                }
                del st.session_state.last_revise
                st.rerun()

# 다른 매체로 변환
else:
    # 추천 받기
    if sub_mode and sub_mode.startswith("1."):
        if st.button(
            "🌐 추천 받기",
            type="primary",
            disabled=not text,
            use_container_width=True,
        ):
            prompt = sori_client.build_genre_recommend_prompt(text, source_genre)
            st.session_state.ssm_busy = {"label": "매체 추천 분석 중", "detail": project_name or ""}
            st.markdown("### ✍ 추천 분석이 흐르는 중...")
            live = st.empty()
            result = sori_client.stream_to_placeholder(prompt, live, max_tokens=6000)
            st.session_state.pop("ssm_busy", None)
            st.session_state.genre_recommend = result

        if "genre_recommend" in st.session_state:
            st.markdown(st.session_state.genre_recommend)
            st.info("위 추천 중 마음에 드는 매체를 [2. 특정 매체로 직접 변환]에서 골라 변환하세요.")

    # 직접 변환
    elif sub_mode and sub_mode.startswith("2."):
        valid = bool(text) and bool(target_letter) and bool(project_name)
        if not text:
            st.caption("⬆ 원본을 첨부해주세요")
        elif not target_letter:
            st.caption("⬆ 변환 매체를 선택해주세요")

        if st.button(
            "🔄 변환 실행",
            type="primary",
            disabled=not valid,
            use_container_width=True,
        ):
            prompt = sori_client.build_adapt_prompt(
                text, source_genre, target_genre, target_workflow
            )
            if direction:
                prompt = f"{prompt}\n\n### 추가 디렉션\n{direction}"
            st.session_state.ssm_busy = {
                "label": f"{target_genre['name']}로 변환 중",
                "detail": project_name or "",
            }
            st.markdown(f"### ✍ {target_genre['name']} 변환이 흐르는 중...")
            live = st.empty()
            result = sori_client.stream_to_placeholder(prompt, live, max_tokens=8000)
            st.session_state.pop("ssm_busy", None)

            st.session_state.adapt_result = {
                "project": f"{project_name}_{target_genre['name']}",
                "result": result,
                "target_letter": target_letter,
                "target_genre": target_genre,
            }

        if "adapt_result" in st.session_state:
            r = st.session_state.adapt_result
            st.markdown(f"### ✨ {r['target_genre']['name']} 변환 결과")
            st.markdown(r["result"])

            col_a, col_b = st.columns(2)
            with col_a:
                if st.button("💾 새 프로젝트로 저장", type="primary"):
                    meta = storage.save_version(
                        r["project"],
                        r["result"],
                        metadata={
                            "type": "adapt",
                            "from": source_genre["code"],
                            "to": r["target_genre"]["code"],
                            "genre": r["target_letter"],
                        },
                        direction=f"{source_genre['name']} → {r['target_genre']['name']} 변환",
                    )
                    st.success(f"✓ {r['project']} v{meta['version']} 저장")

            with col_b:
                if st.button("📥 .docx 다운로드"):
                    tw = get_workflow(r["target_letter"])
                    doc_bytes = exporter.export_to_docx(
                        title=r["project"],
                        body=r["result"],
                        genre_letter=r["target_letter"],
                        export_format=tw["export_format"],
                    )
                    st.download_button(
                        "💾 다운로드",
                        data=doc_bytes,
                        file_name=f"{r['project']}_v1.docx",
                        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    )
