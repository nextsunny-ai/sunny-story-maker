"""작품 상세 — 산출물·버전 한눈에 보기 + 다운로드
홈 화면 '최근 작업' 클릭 시 진입.
"""

import streamlit as st
from datetime import datetime
from modules.page_init import init_page
init_page("작품 상세 — SUNNY Story Maker")

from modules import storage, exporter
from modules.workflows import get_workflow
from modules.genres import GENRES

# URL에서 작품명 가져오기
qp = st.query_params
project_name = qp.get("project", "") or st.session_state.get("detail_project", "")

if not project_name:
    st.warning("작품을 선택해주세요. 홈의 '최근 작업'에서 클릭하시거나 사이드바에서 이동하세요.")
    st.stop()

st.session_state.detail_project = project_name

# ========== 헤더 ==========
st.markdown(
    f"""
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">📂</span>{project_name}</div>
        <div class="app-header-version">작품 상세 · 산출물 · 버전</div>
    </div>
    """,
    unsafe_allow_html=True,
)

# ========== 1. 작품 정보 ==========
versions = storage.list_versions(project_name)
artifacts = storage.list_artifacts(project_name)

artifact_count = sum(1 for a in artifacts.values() if a.get("has"))
version_count = len(versions)

cols = st.columns(4)
cols[0].metric("산출물", f"{artifact_count}개")
cols[1].metric("저장된 버전", f"{version_count}개")
cols[2].metric("최근 수정", versions[0]["saved_at"][:10] if versions else "-")
cols[3].metric("총 글자수", f"{sum(v.get('char_count', 0) for v in versions):,}")

if artifact_count == 0 and version_count == 0:
    st.info("📭 이 작품에는 아직 만들어진 산출물이 없습니다. 패키지 생성 또는 집필을 시작해보세요.")
    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("📦 패키지 생성하러 가기", use_container_width=True, type="primary"):
            st.session_state.pkg_project_name = project_name
            st.switch_page("pages/10_기획_패키지.py")
    with col_b:
        if st.button("✏️ 집필 시작하기", use_container_width=True):
            st.switch_page("pages/2_집필.py")
    st.stop()

# ========== 2. 산출물 ==========
if artifact_count > 0:
    st.markdown("## 📄 산출물")
    st.caption(f"이 작품에 누적된 산출물 {artifact_count}개. 각 항목 클릭해서 본문 보기 + 다운로드.")

    for key, info in sorted(artifacts.items(), key=lambda x: x[1]["order"]):
        if not info.get("has"):
            continue
        with st.expander(
            f"**{info['name']}** · v{info['latest_version']} · {info.get('char_count', 0):,}자 · {info.get('saved_at', '')[:10]}",
            expanded=False,
        ):
            body, meta = storage.load_artifact(project_name, key)
            if body:
                st.markdown(body)
                st.markdown("---")
                col_dl1, col_dl2 = st.columns(2)
                with col_dl1:
                    st.download_button(
                        f"📥 .md 다운로드",
                        data=body.encode("utf-8"),
                        file_name=f"{project_name}_{info['name']}_v{info['latest_version']}.md",
                        mime="text/markdown",
                        key=f"dl_md_{key}",
                        use_container_width=True,
                    )
                with col_dl2:
                    try:
                        doc_bytes = exporter.export_to_docx(
                            title=f"{project_name} - {info['name']}",
                            body=body,
                            genre_letter="A",
                            export_format="documentary_cuesheet",
                        )
                        st.download_button(
                            f"📥 .docx 다운로드",
                            data=doc_bytes,
                            file_name=f"{project_name}_{info['name']}_v{info['latest_version']}.docx",
                            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            key=f"dl_docx_{key}",
                            use_container_width=True,
                        )
                    except Exception as e:
                        st.caption(f"docx 변환 불가: {e}")

# ========== 3. 버전 ==========
if version_count > 0:
    st.markdown("---")
    st.markdown(f"## 📚 버전 히스토리 ({version_count}개)")
    st.caption("집필·각색으로 저장된 본문 버전들. 최신 버전이 위.")

    for v in versions:
        with st.expander(
            f"**v{v['version']}** · {v.get('char_count', 0):,}자 · {v['saved_at'][:10]}"
            + (f" — {v.get('direction', '')[:50]}" if v.get('direction') else ""),
            expanded=False,
        ):
            body = storage.load_version(project_name, v["version"])
            if body:
                # 너무 길면 일부만 표시
                if len(body) > 5000:
                    st.text(body[:5000] + "\n\n...(이하 생략, 다운로드해서 전체 보기)")
                else:
                    st.text(body)
                st.markdown("---")
                col_v1, col_v2 = st.columns(2)
                with col_v1:
                    st.download_button(
                        "📥 .txt 다운로드",
                        data=body.encode("utf-8"),
                        file_name=f"{project_name}_v{v['version']}.txt",
                        mime="text/plain",
                        key=f"dl_v_txt_{v['version']}",
                        use_container_width=True,
                    )
                with col_v2:
                    genre_code = v.get("genre", "A")
                    workflow = get_workflow(genre_code) if genre_code in GENRES else get_workflow("A")
                    try:
                        doc_bytes = exporter.export_to_docx(
                            title=f"{project_name}_v{v['version']}",
                            body=body,
                            genre_letter=genre_code,
                            export_format=workflow["export_format"],
                        )
                        st.download_button(
                            "📥 .docx 다운로드",
                            data=doc_bytes,
                            file_name=f"{project_name}_v{v['version']}.docx",
                            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            key=f"dl_v_docx_{v['version']}",
                            use_container_width=True,
                        )
                    except Exception as e:
                        st.caption(f"docx 변환 불가: {e}")

# ========== 4. 액션 ==========
st.markdown("---")
st.markdown("## 🎬 다음 액션")
col_a, col_b, col_c = st.columns(3)
with col_a:
    if st.button("✏️ 집필 이어서", use_container_width=True):
        st.switch_page("pages/2_집필.py")
with col_b:
    if st.button("🔄 각색", use_container_width=True):
        if versions:
            st.session_state.adapt_source = {
                "text": storage.load_version(project_name, versions[0]["version"]),
                "project": project_name,
                "genre": GENRES.get("A", {}),
                "mode": "same_genre",
            }
        st.switch_page("pages/3_각색.py")
with col_c:
    if st.button("🔍 리뷰", use_container_width=True):
        st.switch_page("pages/4_리뷰.py")
