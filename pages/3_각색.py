"""각색 모드 — 같은 매체 무한+ 반복 + 다른 매체 변환 옵션"""

import streamlit as st
from pathlib import Path
from datetime import datetime
from modules import sori_client, file_parser, exporter, storage, profile as prof, learning
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
        <div class="app-header-title"><span class="app-header-title-emoji">🔄</span>각색 모드</div>
        <div class="app-header-version">같은 매체 무한+ / 다른 매체 변환</div>
    </div>
    """,
    unsafe_allow_html=True,
)

# 리뷰 모드에서 넘어온 경우 자동 로드
prefilled = st.session_state.get("adapt_source", None)

# ========== 1. 원본 입력 ==========
st.markdown("## 1. 원본 작품")

if prefilled:
    st.success(f"✓ 리뷰 모드에서 넘어옴: **{prefilled['project']}**")
    text = prefilled["text"]
    project_name = prefilled["project"]
    source_genre = prefilled["genre"]
    source_letter = next((k for k, v in GENRES.items() if v["name"] == source_genre["name"]), "B")
    initial_mode = prefilled.get("mode", "same_genre")
else:
    upload_method = st.radio("입력 방식", ["파일 업로드", "텍스트 붙여넣기", "저장된 프로젝트"], horizontal=True)
    text = ""
    project_name = ""

    if upload_method == "파일 업로드":
        uploaded = st.file_uploader("원본 파일", type=["docx", "pdf", "txt", "md", "fountain"])
        if uploaded:
            text = file_parser.parse_uploaded_file(uploaded)
            project_name = Path(uploaded.name).stem
    elif upload_method == "텍스트 붙여넣기":
        project_name = st.text_input("작품명", placeholder="예: 트랑로제")
        text = st.text_area("원본 본문", height=300)
    else:
        projects = storage.list_projects()
        if projects:
            chosen = st.selectbox("프로젝트", [p["name"] for p in projects])
            versions = storage.list_versions(chosen)
            v_choice = st.selectbox("버전", [f"v{v['version']} ({v['saved_at'][:10]})" for v in versions])
            if v_choice:
                v_num = int(v_choice.split()[0][1:])
                text = storage.load_version(chosen, v_num)
                project_name = chosen

    if text:
        auto_letter = file_parser.estimate_genre(text)
        source_letter = st.selectbox(
            "원본 장르 (자동 식별 — 수정 가능)",
            list_genre_names(),
            index=list(GENRES.keys()).index(auto_letter),
        )
        source_letter = parse_genre_choice(source_letter)
        source_genre = GENRES[source_letter]
        initial_mode = "same_genre"

# ========== 2. 각색 모드 선택 ==========
if text:
    st.markdown("## 2. 각색 방식")

    mode_default = ["같은 매체 내 각색 (기본)", "다른 매체로 변환 추천"]
    default_idx = 0 if (prefilled and prefilled.get("mode") == "same_genre") else (1 if (prefilled and prefilled.get("mode") == "recommend_genre") else 0)
    mode = st.radio("선택", mode_default, index=default_idx, horizontal=True)

    # ============ A. 같은 매체 내 각색 (★ 무한 반복) ============
    if mode.startswith("같은 매체"):
        st.markdown("### A. 같은 매체 내 각색")
        st.caption("작가 디렉션을 자연어로 입력. 영화/드라마는 무한 반복 가능. 부분 수정 OK.")

        # 기존 버전 표시
        existing_versions = storage.list_versions(project_name)
        if existing_versions:
            with st.expander(f"📚 {project_name} 버전 히스토리 ({len(existing_versions)}개)"):
                for v in existing_versions[:10]:
                    st.markdown(f"- **v{v['version']}** ({v['saved_at'][:10]}) — {v.get('direction', '(no direction)')}")

        col_a, col_b = st.columns([2, 1])
        with col_a:
            direction = st.text_area(
                "🎯 수정 디렉션 (자연어)",
                height=120,
                placeholder="예) S#3에서 유건의 야구 비유를 더 강하게. 도윤 대사 줄이고 침묵으로 대체. 결말은 오픈 엔딩으로.",
            )
        with col_b:
            target_section = st.selectbox(
                "수정 범위",
                ["전체", "특정 씬만", "특정 회차만", "특정 캐릭터 대사만"],
            )
            if target_section != "전체":
                target_detail = st.text_input("범위 명시", placeholder="예: S#3, EP05, 유건 대사")
                if target_detail:
                    target_section = f"{target_section}: {target_detail}"

        if st.button("🔄 다음 버전 생성", type="primary", disabled=not direction):
            next_v = (existing_versions[0]["version"] + 1) if existing_versions else 2
            with st.spinner(f"v{next_v} 작성 중..."):
                prompt = sori_client.build_revise_prompt(
                    text=text,
                    direction=direction,
                    genre=source_genre,
                    target_section=target_section,
                    version_number=next_v,
                )
                result = sori_client.call_sori(prompt, max_tokens=8000)

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
                    st.download_button("💾 다운로드", data=doc_bytes,
                                       file_name=f"{r['project']}_v{r['version']}.docx",
                                       mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

            with col_z:
                if st.button("🔄 또 수정 (다음 라운드)", use_container_width=True):
                    # 새로 저장된 버전을 원본으로 사용
                    text = r["result"]
                    del st.session_state.last_revise
                    st.rerun()

    # ============ B. 다른 매체로 변환 ============
    else:
        st.markdown("### B. 다른 매체로 변환")

        sub_mode = st.radio(
            "단계",
            ["1. 추천 받기 (어느 장르가 좋을지)", "2. 특정 장르 지정해서 변환"],
            horizontal=True,
        )

        if sub_mode.startswith("1."):
            st.caption("AI 작가가 이 작품에 가장 잘 맞는 다른 매체 5개 추천.")
            if st.button("🌐 추천 받기", type="primary"):
                with st.spinner("분석 중..."):
                    prompt = sori_client.build_genre_recommend_prompt(text, source_genre)
                    result = sori_client.call_sori(prompt, max_tokens=6000)
                st.session_state.genre_recommend = result

            if "genre_recommend" in st.session_state:
                st.markdown(st.session_state.genre_recommend)
                st.info("위 추천 중 마음에 드는 장르를 골라 [2. 특정 장르 지정]에서 변환하세요.")

        else:
            target_choice = st.selectbox(
                "변환 목표 장르",
                [name for name in list_genre_names() if not name.startswith(source_letter)],
            )
            target_letter = parse_genre_choice(target_choice)
            target_genre = GENRES[target_letter]
            target_workflow = get_workflow(target_letter)

            with st.expander(f"📖 {target_genre['name']} 가이드"):
                st.markdown(f"- **분량**: {target_genre['분량_표준']}")
                st.markdown(f"- **양식**: {target_genre['포맷']}")

            if st.button("🔄 변환 실행", type="primary"):
                with st.spinner("변환 중... (원본 자산 유지하면서 목표 장르로)"):
                    prompt = sori_client.build_adapt_prompt(text, source_genre, target_genre, target_workflow)
                    result = sori_client.call_sori(prompt, max_tokens=8000)

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
                            metadata={"type": "adapt", "from": source_genre["code"], "to": r["target_genre"]["code"]},
                            direction=f"{source_genre['name']} → {r['target_genre']['name']} 변환",
                        )
                        st.success(f"✓ {r['project']} v{meta['version']} 저장")

                with col_b:
                    if st.button("📥 .docx 다운로드"):
                        target_workflow = get_workflow(r["target_letter"])
                        doc_bytes = exporter.export_to_docx(
                            title=r["project"],
                            body=r["result"],
                            genre_letter=r["target_letter"],
                            export_format=target_workflow["export_format"],
                        )
                        st.download_button("💾 다운로드", data=doc_bytes,
                                           file_name=f"{r['project']}_v1.docx",
                                           mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document")