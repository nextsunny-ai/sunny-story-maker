"""SUNNY Story Maker — Custom Sidebar
Streamlit 자동 nav를 안 쓰고 직접 작성.
모든 페이지에서 render_sidebar() 한 줄로 호출.
"""

import streamlit as st


SYMBOL_SVG = """
<svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <defs>
    <linearGradient id="ssm-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F8DDD4"/>
      <stop offset="100%" stop-color="#EAE0CB"/>
    </linearGradient>
  </defs>
  <!-- 따뜻한 크림 라운드 -->
  <rect width="64" height="64" rx="15" fill="url(#ssm-bg)"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.5"
        fill="none" stroke="#1A1610" stroke-width="1.2" opacity="0.9"/>

  <!-- 해 광선 (3개) -->
  <line x1="32" y1="12" x2="32" y2="17" stroke="#1A1610" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="20" y1="17" x2="23.5" y2="20.5" stroke="#1A1610" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="44" y1="17" x2="40.5" y2="20.5" stroke="#1A1610" stroke-width="1.8" stroke-linecap="round"/>

  <!-- 떠오르는 해 (반원) -->
  <path d="M 18 41 A 14 14 0 0 1 46 41 Z" fill="#EE9A8B"/>

  <!-- 페이지 / 지평선 -->
  <line x1="14" y1="41" x2="50" y2="41"
        stroke="#1A1610" stroke-width="1.8" stroke-linecap="round"/>

  <!-- 페이지 텍스트 라인 (story 느낌) -->
  <line x1="20" y1="48" x2="40" y2="48"
        stroke="#1A1610" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>
  <line x1="20" y1="53" x2="34" y2="53"
        stroke="#1A1610" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/>
</svg>
""".strip()


def render_sidebar():
    """모든 페이지 sidebar에 호출. 직접 page_link 기반 nav."""
    with st.sidebar:
        # 큰 심볼 + 아래 워드마크 — 클릭 시 홈으로
        st.markdown(
            f"""
            <a href="/" target="_self" class="ssm-brand-link">
              <div class="ssm-brand">
                <div class="ssm-brand-symbol">{SYMBOL_SVG}</div>
                <div class="ssm-brand-text">
                  <div class="ssm-brand-name">SUNNY<span class="ssm-brand-dot">.</span></div>
                  <div class="ssm-brand-tag">Story Maker</div>
                </div>
              </div>
            </a>
            """,
            unsafe_allow_html=True,
        )

        # 작업 중 표시기 — 세션 상태로 추적, 모든 페이지에서 보이게
        busy = st.session_state.get("ssm_busy")
        if busy:
            label = busy.get("label", "작업 중")
            detail = busy.get("detail", "")
            st.markdown(
                f"""
                <div class="ssm-busy-badge">
                    <div class="ssm-busy-spinner"></div>
                    <div class="ssm-busy-text">
                        <div class="ssm-busy-label">⏳ {label}</div>
                        <div class="ssm-busy-detail">{detail}</div>
                    </div>
                </div>
                <div class="ssm-busy-warn">⚠ 페이지 떠나면 중단됨</div>
                """,
                unsafe_allow_html=True,
            )

        st.markdown('<div class="ssm-nav-section">Workspace</div>', unsafe_allow_html=True)
        st.page_link("app.py", label="Home")

        st.markdown('<div class="ssm-nav-section">Create</div>', unsafe_allow_html=True)
        st.page_link("pages/1_AI_기획.py", label="AI Pitch")
        st.page_link("pages/10_기획_패키지.py", label="Plan Package")
        st.page_link("pages/2_집필.py", label="Write")
        st.page_link("pages/3_각색.py", label="Adapt")
        st.page_link("pages/5_보조작가와_대화.py", label="Chat")
        st.page_link("pages/6_OSMU.py", label="OSMU")

        st.markdown('<div class="ssm-nav-section">Review</div>', unsafe_allow_html=True)
        st.page_link("pages/4_리뷰.py", label="Review")

        st.markdown('<div class="ssm-nav-section">Library</div>', unsafe_allow_html=True)
        st.page_link("pages/7_라이브러리.py", label="Library")
        # Profile / Settings → 우측 상단 Admin pill로 이전
