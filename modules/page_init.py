"""페이지 공통 초기화 — 모든 page에서 첫 줄에 호출.
- st.set_page_config (기본 chrome 깜빡임 방지)
- styles.css 주입
- sidebar 렌더
"""

import streamlit as st
from pathlib import Path

ASSETS = Path(__file__).parent.parent / "assets"


def init_page(title: str = "SUNNY Story Maker", require_auth: bool = True) -> None:
    """페이지 최상단에서 호출. set_page_config + CSS + 인증 게이트 + sidebar."""
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

    # 인증 게이트 (초대 코드 + 로그인) — INVITE_CODE 설정돼있을 때만 활성
    if require_auth:
        from modules import auth_user, auth_gate
        # 초대 코드 secret이 비어있으면 게이트 비활성 (기존처럼 동작)
        if auth_user.get_invite_code():
            auth_gate.require_login()

    from modules.sidebar import render_sidebar
    render_sidebar()

    # 사이드바 맨 아래 로그아웃 버튼 (인증된 경우에만)
    if require_auth:
        from modules import auth_gate
        auth_gate.render_logout_button()
