"""SUNNY Story Maker v1.0 — 메인 대시보드
구조: 장르 13개 카드 (메인 강조) + 작업 모드 카드"""

import streamlit as st
from pathlib import Path
from modules import storage, sori_client, profile as prof, learning
from modules.workflows import SCRIPT_FONTS
from modules.genres import GENRES

# ========== 페이지 설정 ==========
st.set_page_config(
    page_title="SUNNY Story Maker",
    page_icon="✍️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ========== CSS 로드 ==========
def load_css():
    css_path = Path(__file__).parent / "assets" / "styles.css"
    if css_path.exists():
        st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)


load_css()


# ========== 사이드바 로고 + nav "app" → "🏠 홈" 라벨 교체 ==========
st.markdown(
    """
    <script>
    (function() {
      const LOGO_HTML = `
        <div id="ssm-logo" style="
          padding: 18px 16px 14px;
          margin: 0 0 8px;
          border-bottom: 1px solid #E2E8F0;
          background: linear-gradient(135deg, #ECFDF5 0%, #EFF6FF 100%);
          border-radius: 0 0 12px 12px;
        ">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width:36px;height:36px;border-radius:10px;
              background:linear-gradient(135deg,#2DD4BF 0%,#0EA5E9 50%,#2563EB 100%);
              display:flex;align-items:center;justify-content:center;
              color:white;font-size:18px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">✍️</div>
            <div>
              <div style="font-weight:800;font-size:14px;color:#0F172A;letter-spacing:-0.3px;">SUNNY</div>
              <div style="font-weight:600;font-size:12px;color:#475569;letter-spacing:-0.2px;">Story Maker</div>
            </div>
          </div>
        </div>`;

      function injectLogoAndRelabel() {
        const sidebar = document.querySelector('[data-testid="stSidebar"]');
        if (!sidebar) return;

        // 1. 로고 한 번만 삽입 (nav 위쪽)
        if (!document.getElementById('ssm-logo')) {
          const nav = sidebar.querySelector('[data-testid="stSidebarNav"]');
          if (nav) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = LOGO_HTML;
            nav.parentNode.insertBefore(wrapper.firstElementChild, nav);
          }
        }

        // 2. "app" → "🏠 홈" 텍스트 교체 (모든 후보 검색)
        const candidates = sidebar.querySelectorAll('a, span, p, div, li');
        for (const el of candidates) {
          if (el.children.length > 0) continue;
          const t = (el.textContent || '').trim();
          if (t === 'app' || t === 'App' || t === 'APP') {
            el.textContent = '🏠  홈';
          }
        }
      }
      injectLogoAndRelabel();
      try {
        new MutationObserver(injectLogoAndRelabel).observe(document.body, {childList: true, subtree: true, characterData: true});
      } catch (e) {}
      setInterval(injectLogoAndRelabel, 400);
    })();
    </script>
    """,
    unsafe_allow_html=True,
)


# ========== 본문 폰트 동적 적용 ==========
def apply_script_font(font_css: str):
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


# ========== 세션 상태 초기화 ==========
if "script_font" not in st.session_state:
    st.session_state.script_font = "Hahmlet"
if "current_project" not in st.session_state:
    st.session_state.current_project = None
if "prefilled_genre" not in st.session_state:
    st.session_state.prefilled_genre = None

apply_script_font(st.session_state.script_font)


# ========== 그라데이션 헤더 ==========
st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title">
            <span class="app-header-title-emoji">✍️</span>
            SUNNY Story Maker
        </div>
        <div class="app-header-version">v1.0</div>
    </div>
    """,
    unsafe_allow_html=True,
)


# ========== 사이드바 ==========
with st.sidebar:
    st.markdown("### 작가 작업 폰트")
    st.caption("본문(대본) 영역에 즉시 적용됩니다.")

    font_names = [f["name"] for f in SCRIPT_FONTS]
    selected_idx = 0
    for i, f in enumerate(SCRIPT_FONTS):
        if f["css"] == st.session_state.script_font:
            selected_idx = i
            break

    chosen = st.selectbox("폰트 선택", font_names, index=selected_idx, label_visibility="collapsed")
    chosen_font = next(f for f in SCRIPT_FONTS if f["name"] == chosen)
    if chosen_font["css"] != st.session_state.script_font:
        st.session_state.script_font = chosen_font["css"]
        st.rerun()

    st.markdown("---")
    st.markdown("### 활성 작가 프로필")
    active = prof.get_active()
    if active:
        st.markdown(f"**👤 {active['name']}**")
        if active.get("tagline"):
            st.caption(active["tagline"])
        summary = learning.get_summary(active["name"])
        if summary.get("loved_count") or summary.get("rejected_count"):
            st.caption(
                f"누적 — 👍 {summary.get('loved_count', 0)} / "
                f"👎 {summary.get('rejected_count', 0)}"
            )
    else:
        st.info("프로필 미설정 — 기본 노하우만 적용됨")
        st.caption("[작가 프로필] 메뉴에서 등록")

    st.markdown("---")
    st.markdown("### 상태")
    if sori_client.is_configured():
        st.success("✓ AI 작가 연결됨")
    else:
        st.warning("⚠ 로그인 필요")
        st.caption("[설정] 메뉴에서")

    st.markdown("---")
    st.caption("v1.0")


# ========== 1. 장르 카드 13개 (메인 강조) ==========
st.markdown("# 무엇을 쓸까요?")
st.markdown(
    '<p style="color: #64748B; font-size: 15px; margin-bottom: 32px;">'
    '장르를 고르면 그 장르 전용 워크플로우로 바로 시작합니다. 한국 실무 표준 양식.</p>',
    unsafe_allow_html=True,
)

# 장르 그라데이션 색상 매핑 (시각적 구분)
GENRE_COLORS = {
    "A": "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)",      # 드라마 — 따뜻
    "B": "linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%)",      # 영화 — 진한 레드
    "C": "linear-gradient(135deg, #FCE7F3 0%, #F9A8D4 100%)",      # 숏드라마 — 핑크
    "D": "linear-gradient(135deg, #DBEAFE 0%, #93C5FD 100%)",      # 극장 애니 — 블루
    "E": "linear-gradient(135deg, #E0F2FE 0%, #7DD3FC 100%)",      # 애니 시리즈 — 라이트블루
    "F": "linear-gradient(135deg, #ECFCCB 0%, #BEF264 100%)",      # 웹툰 — 라임
    "G": "linear-gradient(135deg, #F3F4F6 0%, #D1D5DB 100%)",      # 다큐 — 그레이
    "H": "linear-gradient(135deg, #FEF3C7 0%, #FB923C 100%)",      # 웹소설 — 오렌지
    "I": "linear-gradient(135deg, #EDE9FE 0%, #C4B5FD 100%)",      # 뮤지컬 — 보라
    "J": "linear-gradient(135deg, #FEE2E2 0%, #F87171 100%)",      # 유튜브 — 레드
    "K": "linear-gradient(135deg, #CCFBF1 0%, #5EEAD4 100%)",      # 전시 — 청록
    "L": "linear-gradient(135deg, #E0E7FF 0%, #818CF8 100%)",      # 게임 — 인디고
    "M": "linear-gradient(135deg, #FED7AA 0%, #FDBA74 100%)",      # 예능 — 살구
}

GENRE_EMOJI = {
    "A": "📺", "B": "🎬", "C": "📱", "D": "🎞️", "E": "🌀",
    "F": "🖼️", "G": "🎙️", "H": "📖", "I": "🎭", "J": "▶️",
    "K": "🏛️", "L": "🎮", "M": "🎤",
}


def render_genre_card(letter: str, data: dict):
    color = GENRE_COLORS.get(letter, "linear-gradient(135deg, #F1F5F9 0%, #CBD5E1 100%)")
    emoji = GENRE_EMOJI.get(letter, "📝")
    st.markdown(
        f"""
        <div style="
            background: {color};
            border-radius: 14px;
            padding: 18px 14px;
            text-align: center;
            min-height: 130px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            transition: all 0.2s;
            border: 1.5px solid transparent;
        " onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 25px rgba(15,23,42,0.12)'"
           onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
            <div style="font-size: 28px; margin-bottom: 6px;">{emoji}</div>
            <div style="font-weight: 700; font-size: 15px; color: #0F172A;">{data['name']}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 4px;">{data['subtitle']}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button(f"{letter} 시작", key=f"genre_{letter}", use_container_width=True, type="primary"):
        st.session_state.prefilled_genre = letter
        st.switch_page("pages/2_집필.py")


# 장르 카드 그리드 (4 x 4 — 마지막 줄 4개)
genre_letters = list(GENRES.keys())
for row_start in range(0, len(genre_letters), 4):
    row_cols = st.columns(4, gap="small")
    for i, col in enumerate(row_cols):
        idx = row_start + i
        if idx >= len(genre_letters):
            with col:
                st.empty()
            continue
        letter = genre_letters[idx]
        with col:
            render_genre_card(letter, GENRES[letter])


# ========== 2. 작업 모드 카드 ==========
st.markdown("<div style='height: 50px'></div>", unsafe_allow_html=True)
st.markdown("## 또는, 다른 작업")
st.markdown(
    '<p style="color: #64748B; font-size: 14px; margin-bottom: 24px;">'
    '한 줄로 시작하거나, 기존 작품을 다루거나, 도구 관리.</p>',
    unsafe_allow_html=True,
)

# 작업 모드 1행 (집필 워크플로우 보조 모드)
row1 = st.columns(4, gap="medium")
with row1[0]:
    st.markdown(
        """
        <div class="action-card">
            <div class="action-card-badge">MAGIC</div>
            <div class="action-card-icon">🪄</div>
            <div class="action-card-title">AI 기획</div>
            <div class="action-card-desc">한 줄 아이디어만<br>처음부터 끝까지</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("AI 기획", key="ai_pitch", use_container_width=True):
        st.switch_page("pages/1_AI_기획.py")

with row1[1]:
    st.markdown(
        """
        <div class="action-card">
            <div class="action-card-icon">🔄</div>
            <div class="action-card-title">각색</div>
            <div class="action-card-desc">기존 작품 수정<br>무한 반복 가능</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("각색", key="adapt", use_container_width=True):
        st.switch_page("pages/3_각색.py")

with row1[2]:
    st.markdown(
        """
        <div class="action-card">
            <div class="action-card-badge">★</div>
            <div class="action-card-icon">🔍</div>
            <div class="action-card-title">리뷰</div>
            <div class="action-card-desc">다중 타겟 리뷰<br>배급사 양식</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("리뷰", key="review", use_container_width=True):
        st.switch_page("pages/4_리뷰.py")

with row1[3]:
    st.markdown(
        """
        <div class="action-card">
            <div class="action-card-badge">PRO</div>
            <div class="action-card-icon">🌐</div>
            <div class="action-card-title">OSMU</div>
            <div class="action-card-desc">한 IP 13장르<br>매트릭스</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("OSMU", key="osmu", use_container_width=True):
        st.switch_page("pages/6_OSMU.py")

st.markdown("<div style='height: 16px'></div>", unsafe_allow_html=True)

# 작업 모드 2행 (관리 도구)
row2 = st.columns(4, gap="medium")
with row2[0]:
    st.markdown(
        """
        <div class="action-card">
            <div class="action-card-icon">👥</div>
            <div class="action-card-title">IP 라이브러리</div>
            <div class="action-card-desc">캐릭터 / 세계관<br>관리</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("라이브러리", key="library", use_container_width=True):
        st.switch_page("pages/7_라이브러리.py")

with row2[1]:
    st.markdown(
        """
        <div class="action-card">
            <div class="action-card-icon">💬</div>
            <div class="action-card-title">보조작가와 대화</div>
            <div class="action-card-desc">자유로운 채팅<br>아이디어 / 대사 의뢰</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("보조작가", key="chat", use_container_width=True):
        st.switch_page("pages/5_보조작가와_대화.py")

with row2[2]:
    st.markdown(
        """
        <div class="action-card">
            <div class="action-card-icon">👤</div>
            <div class="action-card-title">작가 프로필</div>
            <div class="action-card-desc">내 스타일 등록<br>모든 작업에 자동 반영</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("프로필", key="profile", use_container_width=True):
        st.switch_page("pages/9_작가_프로필.py")

with row2[3]:
    st.markdown(
        """
        <div class="action-card">
            <div class="action-card-icon">⚙️</div>
            <div class="action-card-title">설정</div>
            <div class="action-card-desc">로그인 / 폰트<br>저장 폴더</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("설정", key="settings", use_container_width=True):
        st.switch_page("pages/8_설정.py")


# ========== 진행중인 작품 ==========
st.markdown("<div style='height: 50px'></div>", unsafe_allow_html=True)
st.markdown("## 진행중인 작품")

projects = storage.list_projects()
if projects:
    st.markdown('<div class="work-list">', unsafe_allow_html=True)
    for proj in projects[:8]:
        last_mod = proj["last_modified"][:10] if proj["last_modified"] else ""
        st.markdown(
            f"""
            <div class="work-list-item">
                <div>
                    <span class="work-list-title">{proj['name']}</span>
                    <span class="badge badge-primary" style="margin-left: 10px;">v{proj['version_count']}</span>
                </div>
                <span class="work-list-meta">{last_mod}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )
    st.markdown('</div>', unsafe_allow_html=True)
else:
    st.info("아직 작업한 작품이 없습니다. 위 장르 중 하나를 골라 시작해보세요.")


# ========== 통계 ==========
st.markdown("<div style='height: 40px'></div>", unsafe_allow_html=True)
col_a, col_b, col_c, col_d = st.columns(4)
with col_a:
    st.metric("작품 수", len(projects))
with col_b:
    total_versions = sum(p["version_count"] for p in projects)
    st.metric("총 버전", total_versions)
with col_c:
    ips = storage.list_ips()
    st.metric("IP 라이브러리", len(ips))
with col_d:
    st.metric("지원 장르", "13")