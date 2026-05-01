"""SUNNY Story Maker — Custom Sidebar
Streamlit 자동 nav를 안 쓰고 직접 작성.
모든 페이지에서 render_sidebar() 한 줄로 호출.
"""

import streamlit as st


SYMBOL_SVG = """
<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <rect width="64" height="64" rx="14" fill="#0A0A0A"/>
  <path d="M32 12 L46 30 L32 48 L18 30 Z"
        stroke="#FFFFFF" stroke-width="2.2" fill="none"
        stroke-linejoin="round"/>
  <line x1="32" y1="18" x2="32" y2="44"
        stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="32" cy="30" r="1.8" fill="#0A0A0A"
          stroke="#FFFFFF" stroke-width="1.4"/>
  <circle cx="32" cy="56" r="3" fill="#E54D2E"/>
</svg>
""".strip()


def render_sidebar():
    """모든 페이지 sidebar에 호출. 직접 page_link 기반 nav."""
    with st.sidebar:
        # 큰 심볼 + 아래 워드마크 (스택 레이아웃)
        st.markdown(
            f"""
            <div class="ssm-brand">
              <div class="ssm-brand-symbol">{SYMBOL_SVG}</div>
              <div class="ssm-brand-text">
                <div class="ssm-brand-name">SUNNY<span class="ssm-brand-dot">.</span></div>
                <div class="ssm-brand-tag">Story Maker</div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown('<div class="ssm-nav-section">Workspace</div>', unsafe_allow_html=True)
        st.page_link("app.py", label="Home")

        st.markdown('<div class="ssm-nav-section">Create</div>', unsafe_allow_html=True)
        st.page_link("pages/1_AI_기획.py", label="AI Pitch")
        st.page_link("pages/2_집필.py", label="Write")
        st.page_link("pages/3_각색.py", label="Adapt")

        st.markdown('<div class="ssm-nav-section">Review</div>', unsafe_allow_html=True)
        st.page_link("pages/4_리뷰.py", label="Review")
        st.page_link("pages/5_보조작가와_대화.py", label="Chat")
        st.page_link("pages/6_OSMU.py", label="OSMU")

        st.markdown('<div class="ssm-nav-section">Library</div>', unsafe_allow_html=True)
        st.page_link("pages/7_라이브러리.py", label="Library")
        # Profile / Settings → 우측 상단 Admin pill로 이전
