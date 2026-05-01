"""페이지 공통 초기화 — 모든 page에서 첫 줄에 호출.
- st.set_page_config (기본 chrome 깜빡임 방지)
- styles.css 주입 (cache_resource — 디스크 read 1회만)
- sidebar 렌더
"""

import streamlit as st
from pathlib import Path

ASSETS = Path(__file__).parent.parent / "assets"


@st.cache_resource
def _styles_css_text() -> str:
    """styles.css 본문 — 메모리 캐시. 페이지 전환마다 디스크 read 안 함"""
    css_path = ASSETS / "styles.css"
    if css_path.exists():
        return css_path.read_text(encoding="utf-8")
    return ""


# nav 차단 inline CSS — 상수로 두어 매번 string 빌드 안 하게
_NAV_HIDE_STYLE = """<style>
[data-testid="stSidebarNav"],
[data-testid="stSidebarNavItems"],
[data-testid="stSidebarNav"] ul,
section[data-testid="stSidebar"] > div > div > nav {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 !important;
}
</style>"""


def init_page(title: str = "SUNNY Story Maker", require_auth: bool = True) -> None:
    """페이지 최상단에서 호출. set_page_config + CSS + 인증 게이트 + sidebar."""
    icon_path = ASSETS / "favicon.svg"
    st.set_page_config(
        page_title=title,
        page_icon=str(icon_path) if icon_path.exists() else "✍",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    # ★ nav 깜빡임 차단 — set_page_config 직후 최우선
    st.markdown(_NAV_HIDE_STYLE, unsafe_allow_html=True)

    # styles.css — 메모리 캐시본 사용 (디스크 IO 없음)
    css_text = _styles_css_text()
    if css_text:
        st.markdown(f"<style>{css_text}</style>", unsafe_allow_html=True)

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
