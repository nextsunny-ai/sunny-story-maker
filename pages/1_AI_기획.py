"""AI 기획 모드 — 한 줄 아이디어 → 풀 트리트먼트
사용자 최소 입력 (한 줄 + 장르) → AI 작가가 처음부터 끝까지"""

import streamlit as st
from pathlib import Path
from datetime import datetime
from modules import sori_client, exporter, storage
from modules.genres import GENRES, list_genre_names, parse_genre_choice
from modules.workflows import get_workflow

css_path = Path(__file__).parent.parent / "assets" / "styles.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)

st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">🪄</span>AI 기획 모드</div>
        <div class="app-header-version">한 줄 아이디어 → 풀 기획</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background: var(--gradient-soft); padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
    <strong style="color: #2563EB;">사용법</strong>
    한 줄 아이디어와 장르만 정해주세요. AI 작가가 로그라인 → 트리트먼트 → 시놉시스 → 첫 부분 샘플까지 처음부터 끝까지 작성합니다.
    </div>
    """,
    unsafe_allow_html=True,
)

# 입력
st.markdown("## 1. 아이디어 입력")
idea = st.text_area(
    "한 줄 아이디어",
    height=80,
    placeholder="예) 조선시대 요괴 사냥꾼이 현대 서울로 떨어지면서 벌어지는 일",
)

col1, col2 = st.columns([2, 1])
with col1:
    genre_choice = st.selectbox("장르", list_genre_names())
    genre_letter = parse_genre_choice(genre_choice)
    genre = GENRES[genre_letter]
with col2:
    project_name = st.text_input("작품명 (저장용)", placeholder="예: 조선요괴 서울생존기")

# 장르 정보 미리보기
with st.expander(f"📖 {genre['name']} 핵심 가이드", expanded=False):
    st.markdown(f"- **분량 표준**: {genre['분량_표준']}")
    st.markdown(f"- **양식**: {genre['포맷']}")
    st.markdown(f"- **핵심 전략**:")
    for s in genre["핵심_전략"][:3]:
        st.markdown(f"  - {s}")

# 실행
st.markdown("## 2. 기획 시작")
if st.button("🪄 AI 작가에게 맡기기", type="primary", use_container_width=True, disabled=not idea):
    workflow = get_workflow(genre_letter)
    prompt = sori_client.build_ai_pitch_prompt(idea, genre, workflow)

    with st.spinner("AI 작가가 기획 중... (1~2분 소요)"):
        result = sori_client.call_sori(prompt, max_tokens=8000)

    st.session_state.ai_pitch_result = {
        "idea": idea,
        "genre": genre,
        "result": result,
        "project": project_name or f"AI기획_{datetime.now().strftime('%m%d_%H%M')}",
    }

# 결과
if "ai_pitch_result" in st.session_state:
    r = st.session_state.ai_pitch_result
    st.markdown("---")
    st.markdown("## ✨ 기획 결과")
    st.markdown(r["result"])

    col_a, col_b, col_c = st.columns(3)
    with col_a:
        if st.button("💾 v1로 저장", use_container_width=True):
            meta = storage.save_version(
                r["project"],
                r["result"],
                metadata={"type": "ai_pitch", "idea": r["idea"], "genre": r["genre"]["code"]},
                direction=f"AI 기획: {r['idea']}",
            )
            st.success(f"✓ {r['project']} v{meta['version']} 저장")

    with col_b:
        if st.button("📥 .docx 다운로드", use_container_width=True):
            doc_bytes = exporter.export_to_docx(
                title=r["project"],
                body=r["result"],
                genre_letter=parse_genre_choice(r["genre"]["name"]),
                export_format=get_workflow(parse_genre_choice(r["genre"]["name"]))["export_format"],
            )
            st.download_button("💾 다운로드", data=doc_bytes,
                               file_name=f"{r['project']}_v1.docx",
                               mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    with col_c:
        if st.button("✏️ 집필로 이어가기", use_container_width=True):
            st.session_state.cowrite_seed = r
            st.switch_page("pages/2_집필.py")