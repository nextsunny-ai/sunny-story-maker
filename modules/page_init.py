"""페이지 공통 초기화 — 모든 page에서 첫 줄에 호출.
- st.set_page_config (기본 chrome 깜빡임 방지)
- styles.css 주입
- sidebar 렌더
"""

import streamlit as st
from pathlib import Path

ASSETS = Path(__file__).parent.parent / "assets"


def init_page(title: str = "SUNNY Story Maker") -> None:
    """페이지 최상단에서 호출. set_page_config + CSS + sidebar 한 번에."""
    icon_path = ASSETS / "favicon.svg"
    st.set_page_config(
        page_title=title,
        page_icon=str(icon_path) if icon_path.exists() else "✍",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    css_path = ASSETS / "styles.css"
    if css_path.exists():
        st.markdown(
            f"<style>{css_path.read_text(encoding='utf-8')}</style>",
            unsafe_allow_html=True,
        )
    from modules.sidebar import render_sidebar
    render_sidebar()
