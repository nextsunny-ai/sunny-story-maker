"""UI 헬퍼 — CSS 로드 + 사이드바 hover 툴팁 제거.
모든 페이지에서 호출."""

from pathlib import Path
import streamlit as st

ROOT = Path(__file__).parent.parent
STYLES_CSS = ROOT / "assets" / "styles.css"


def load_styles():
    """전역 CSS + JS (사이드바 hover 툴팁 자동 제거) 한번에 주입.
    모든 페이지 최상단에서 호출."""
    css = STYLES_CSS.read_text(encoding="utf-8") if STYLES_CSS.exists() else ""

    # 사이드바 / 페이지 네비 툴팁 제거 — Streamlit이 자동 부착하는 title 속성 비움
    js = """
    <script>
    (function() {
      function cleanTitles() {
        document.querySelectorAll(
          '[data-testid="stSidebar"] a, [data-testid="stSidebar"] button, [data-testid="stSidebarNav"] a, [data-testid="stSidebarNavItems"] a, [data-testid="baseLinkButton-secondary"]'
        ).forEach(function(el) {
          if (el.hasAttribute('title')) el.removeAttribute('title');
          if (el.hasAttribute('aria-keyshortcuts')) el.removeAttribute('aria-keyshortcuts');
        });
      }
      cleanTitles();
      // Streamlit이 DOM 다시 그릴 때마다 재적용
      try {
        new MutationObserver(cleanTitles).observe(document.body, {childList: true, subtree: true});
      } catch (e) {}
      // 보험용 인터벌
      setInterval(cleanTitles, 500);
    })();
    </script>
    """

    st.markdown(f"<style>{css}</style>{js}", unsafe_allow_html=True)


def apply_script_font(font_css: str):
    """본문(대본) 영역에 작가가 선택한 폰트 적용"""
    st.markdown(
        f"""
        <style>
        textarea, .script-body {{
            font-family: '{font_css}', 'Hahmlet', 'Nanum Myeongjo', '바탕', serif !important;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )
