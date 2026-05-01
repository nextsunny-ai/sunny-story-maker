"""OSMU 모드 — 한 IP를 13장르 모두로"""

import streamlit as st
from pathlib import Path
from modules import sori_client, storage

css_path = Path(__file__).parent.parent / "assets" / "styles.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)

st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">🌐</span>OSMU 모드</div>
        <div class="app-header-version">한 IP를 13장르 매트릭스로</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div style="background: var(--gradient-soft); padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
    <strong style="color: #2563EB;">OSMU (One Source Multi Use)</strong>
    하나의 IP를 13개 장르로 어떻게 전개하면 좋을지 매트릭스로 분석. 미디어별 다른 매력 분배 (시점/시간축/깊이/체험).
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown("## 1. IP 입력")
idea = st.text_area(
    "핵심 아이디어 / 시놉시스",
    height=140,
    placeholder="예) 조선시대 요괴 사냥꾼이 봉인이 풀려 현대 서울로 떨어진다. 자기를 봉인했던 후손을 찾아가는 여정...",
)

source_ip = st.text_input(
    "원본 IP (있다면)",
    placeholder="예: 조선요괴전 / PERO / NORY CITY 등",
)

project_name = st.text_input("OSMU 프로젝트명", placeholder="예: 트랑로제_OSMU")

if st.button("🌐 13장르 매트릭스 생성", type="primary", use_container_width=True, disabled=not idea):
    with st.spinner("13개 장르를 모두 분석 중... (2~3분 소요)"):
        prompt = sori_client.build_osmu_prompt(idea, source_ip)
        result = sori_client.call_sori(prompt, max_tokens=12000)

    st.session_state.osmu_result = {
        "idea": idea,
        "source_ip": source_ip,
        "result": result,
        "project": project_name or "OSMU_프로젝트",
    }

if "osmu_result" in st.session_state:
    r = st.session_state.osmu_result
    st.markdown("---")
    st.markdown("## 📊 13장르 매트릭스 결과")
    st.markdown(r["result"])

    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("💾 저장", type="primary"):
            meta = storage.save_version(
                r["project"],
                f"# OSMU 매트릭스\n\n핵심: {r['idea']}\n원본 IP: {r['source_ip']}\n\n{r['result']}",
                metadata={"type": "osmu", "source_ip": r["source_ip"]},
                direction="OSMU 13장르 매트릭스",
            )
            st.success(f"✓ {r['project']} v{meta['version']} 저장")

    with col_b:
        if st.button("📥 .md 다운로드"):
            st.download_button(
                "💾 다운로드",
                data=r["result"].encode("utf-8"),
                file_name=f"{r['project']}_OSMU.md",
                mime="text/markdown",
            )