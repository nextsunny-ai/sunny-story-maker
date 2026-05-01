"""IP 라이브러리 — 작가가 자기 작품/캐릭터/세계관 등록"""

import streamlit as st
from pathlib import Path
from modules import storage

css_path = Path(__file__).parent.parent / "assets" / "styles.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)


from modules.sidebar import render_sidebar
render_sidebar()
st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">👥</span>IP 라이브러리</div>
        <div class="app-header-version">캐릭터 · 세계관 관리</div>
    </div>
    """,
    unsafe_allow_html=True,
)

# 탭
tab1, tab2 = st.tabs(["📚 등록된 IP", "➕ 신규 IP 등록"])

with tab1:
    ips = storage.list_ips()
    st.markdown(f"### 총 {len(ips)} IP")

    for ip in ips:
        with st.expander(f"📖 {ip['name']} — {ip.get('company', '')}"):
            cols = st.columns([2, 1])
            with cols[0]:
                st.markdown(f"**톤**: {ip.get('tone', '미정')}")
                if ip.get("characters"):
                    st.markdown("**캐릭터**:")
                    for ch in ip["characters"]:
                        if isinstance(ch, dict):
                            extras = " · ".join([f"{k}={v}" for k, v in ch.items() if k != "name"])
                            st.markdown(f"- **{ch['name']}** ({extras})")
                        else:
                            st.markdown(f"- {ch}")
            with cols[1]:
                if st.button("📝 이 IP로 작업 시작", key=f"use_{ip['name']}"):
                    st.session_state.selected_ip = ip
                    st.switch_page("pages/2_집필.py")

with tab2:
    st.markdown("### 신규 IP 등록")

    with st.form("new_ip"):
        col1, col2 = st.columns(2)
        with col1:
            name = st.text_input("IP 이름", placeholder="작품명 입력")
            company = st.text_input("회사 / 소속 (선택)", placeholder="개인 작가는 비워둬도 OK")
        with col2:
            tone = st.text_input("톤", placeholder="예: 판타지 로맨스 / 시네마틱 다크")
            era = st.text_input("시대 배경 (선택)", placeholder="예: 가상 근미래 / 조선 후기")

        st.markdown("#### 메인 캐릭터 (5명)")
        characters = []
        for i in range(5):
            cols = st.columns([1, 2])
            ch_name = cols[0].text_input(f"이름 {i+1}", key=f"ch_name_{i}")
            ch_metaphor = cols[1].text_input(
                f"고유 비유 체계 {i+1}",
                key=f"ch_meta_{i}",
                placeholder="예: 야구 / 커피 / 건축 / 보드게임",
            )
            if ch_name:
                characters.append({"name": ch_name, "비유": ch_metaphor})

        worldview = st.text_area(
            "세계관 / 룰",
            height=120,
            placeholder="시대/공간/규칙/역사. 작품 안에서 자주 참조될 정보.",
        )

        submitted = st.form_submit_button("💾 IP 등록", type="primary")

        if submitted and name:
            storage.save_ip({
                "name": name,
                "company": company,
                "tone": tone,
                "era": era,
                "characters": characters,
                "worldview": worldview,
            })
            st.success(f"✓ {name} 등록 완료")
            st.rerun()