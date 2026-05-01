"""SUNNY Story Maker — Home (V3, designed by RIAN)
- Custom sidebar (Streamlit 자동 nav 안 씀)
- 카드 자체 클릭 (a href + query_params 라우팅)
- 라인 아이콘 SVG (assets/icons/genre/*.svg)
- Editorial display header
- GENRE_COLORS/GENRE_EMOJI 제거 (인라인 스타일 dict 폐기)
"""

import streamlit as st
from pathlib import Path

from modules import storage, profile as prof
from modules.genres import GENRES
from modules.sidebar import render_sidebar


# ============================================================
# Page config
# ============================================================
ASSETS = Path(__file__).parent / "assets"

st.set_page_config(
    page_title="SUNNY Story Maker",
    page_icon=str(ASSETS / "favicon.svg") if (ASSETS / "favicon.svg").exists() else "✍",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ============================================================
# CSS
# ============================================================
def load_css():
    css_path = ASSETS / "styles.css"
    if css_path.exists():
        st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)


load_css()


# ============================================================
# Routing — 카드 자체 클릭 처리 (a href → query param)
# ============================================================
qp = st.query_params

if "genre" in qp:
    letter = qp.get("genre")
    st.query_params.clear()
    st.session_state.prefilled_genre = letter
    st.switch_page("pages/2_집필.py")

if "mode" in qp:
    mode = qp.get("mode")
    st.query_params.clear()
    target_map = {
        "pitch": "pages/1_AI_기획.py",
        "adapt": "pages/3_각색.py",
        "review": "pages/4_리뷰.py",
        "chat": "pages/5_보조작가와_대화.py",
        "osmu": "pages/6_OSMU.py",
        "library": "pages/7_라이브러리.py",
        "profile": "pages/9_작가_프로필.py",
        "settings": "pages/8_설정.py",
    }
    if mode in target_map:
        st.switch_page(target_map[mode])


# ============================================================
# Session state
# ============================================================
if "script_font" not in st.session_state:
    st.session_state.script_font = "Hahmlet"
if "current_project" not in st.session_state:
    st.session_state.current_project = None
if "prefilled_genre" not in st.session_state:
    st.session_state.prefilled_genre = None


# ============================================================
# Body font (script — 명조)
# ============================================================
def apply_script_font(font_css: str):
    st.markdown(
        f"""
        <style>
        textarea, .script-body {{
            font-family: '{font_css}', 'Hahmlet', 'Noto Serif KR', '바탕', serif !important;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )


apply_script_font(st.session_state.script_font)


# ============================================================
# Sidebar (custom)
# ============================================================
render_sidebar()
# 모든 설정(Script Font, Profile, Status, Claude API, Global MD)은
# 우측 상단 Admin pill → Settings 페이지로 일원화


# ============================================================
# Topbar — 좌측 한 줄 카피 + 우측 Admin (작가 설정)
# ============================================================
_active = prof.get_active()
_writer_name = _active["name"] if _active else "Guest"
_writer_initial = (_writer_name[0] if _writer_name else "G").upper()

st.markdown(
    f"""
    <header class="ssm-topbar">
      <div class="ssm-topbar-left">
        <h1 class="ssm-topbar-title">Today's Story<span class="accent-dot">.</span></h1>
        <span class="ssm-topbar-sub">한국 시나리오 작가의 13가지 형식 통합 작업 도구</span>
      </div>
      <a href="?mode=profile" target="_self" class="ssm-admin">
        <div class="ssm-admin-avatar">{_writer_initial}</div>
        <div class="ssm-admin-text">
          <div class="ssm-admin-name">{_writer_name}</div>
          <div class="ssm-admin-role">Admin</div>
        </div>
      </a>
    </header>
    """,
    unsafe_allow_html=True,
)


# ============================================================
# 1. Genre cards — 카드 자체 클릭
# ============================================================
st.markdown(
    '<div class="ssm-section-head">'
    '<div class="ssm-section-num">01</div>'
    '<div class="ssm-section-title">무엇을 쓰세요?</div>'
    '</div>',
    unsafe_allow_html=True,
)


def get_category(letter: str) -> str:
    if letter in "ABC":
        return "video"
    if letter in "DEFL":
        return "anim"
    if letter in "HI":
        return "text"
    return "media"


def load_icon(letter: str) -> str:
    icon_path = ASSETS / "icons" / "genre" / f"{letter}.svg"
    if icon_path.exists():
        return icon_path.read_text(encoding="utf-8")
    return ""


def render_genre_card(letter: str, data: dict):
    num = ord(letter) - ord("A") + 1
    icon_svg = load_icon(letter)
    category = get_category(letter)

    html = (
        f'<a href="?genre={letter}" target="_self" class="genre-card-link">'
        f'<div class="genre-card" data-cat="{category}">'
        f'<div class="genre-card-head">'
        f'<div class="genre-card-icon">{icon_svg}</div>'
        f'<div class="genre-card-num-wrap">'
        f'<span class="genre-card-dot"></span>'
        f'<span class="genre-card-num">{num:02d}</span>'
        f'</div>'
        f'</div>'
        f'<div class="genre-card-meta">'
        f'<div class="genre-card-title">{data["name"]}</div>'
        f'<div class="genre-card-subtitle">{data["subtitle"]}</div>'
        f'</div>'
        f'<div class="genre-card-arrow">→</div>'
        f'</div></a>'
    )
    st.markdown(html, unsafe_allow_html=True)


def render_add_card():
    """13장르 다음 자리에 + 추가 placeholder 카드"""
    st.markdown(
        '<div class="genre-card is-add">'
        '<div class="genre-card-add-icon">+</div>'
        '<div class="genre-card-add-label">매체 추가</div>'
        '<div class="genre-card-add-hint">곧 출시</div>'
        '</div>',
        unsafe_allow_html=True,
    )


genre_letters = list(GENRES.keys())
COLS_PER_ROW = 6
total_cells = len(genre_letters) + 1  # 13장르 + add 카드 1
for row_start in range(0, total_cells, COLS_PER_ROW):
    cols = st.columns(COLS_PER_ROW, gap="small")
    for i, col in enumerate(cols):
        idx = row_start + i
        with col:
            if idx < len(genre_letters):
                letter = genre_letters[idx]
                render_genre_card(letter, GENRES[letter])
            elif idx == len(genre_letters):
                render_add_card()
            else:
                st.empty()


# ============================================================
# 2. Mode cards
# ============================================================
st.markdown('<div class="ssm-spacer-lg"></div>', unsafe_allow_html=True)

st.markdown(
    '<div class="ssm-section-head">'
    '<div class="ssm-section-num">02</div>'
    '<div class="ssm-section-title">또는, 다른 작업</div>'
    '</div>',
    unsafe_allow_html=True,
)


MODE_CARDS = [
    {"key": "pitch",    "title": "AI Pitch", "ko": "AI 기획",       "desc": "한 줄 → 풀 시나리오"},
    {"key": "adapt",    "title": "Adapt",    "ko": "각색",           "desc": "기존 작품 수정·반복"},
    {"key": "review",   "title": "Review",   "ko": "리뷰",           "desc": "다중 타겟 배급사 양식"},
    {"key": "osmu",     "title": "OSMU",     "ko": "OSMU",          "desc": "한 IP, 13매체 매트릭스"},
    {"key": "library",  "title": "Library",  "ko": "IP 라이브러리",  "desc": "캐릭터·세계관 관리"},
    {"key": "chat",     "title": "Chat",     "ko": "보조작가 대화",   "desc": "자유 채팅·아이디어 의뢰"},
    # Profile / Settings → 우측 상단 Admin pill로 이전
]


def render_mode_card(mode: dict):
    html = (
        f'<a href="?mode={mode["key"]}" target="_self" class="mode-card-link">'
        f'<div class="mode-card">'
        f'<div class="mode-card-title">{mode["title"]}</div>'
        f'<div class="mode-card-ko">{mode["ko"]}</div>'
        f'<div class="mode-card-desc">{mode["desc"]}</div>'
        f'<div class="mode-card-arrow">→</div>'
        f'</div></a>'
    )
    st.markdown(html, unsafe_allow_html=True)


for row_start in range(0, len(MODE_CARDS), 6):
    cols = st.columns(6, gap="small")
    for i, col in enumerate(cols):
        idx = row_start + i
        if idx >= len(MODE_CARDS):
            continue
        with col:
            render_mode_card(MODE_CARDS[idx])


# ============================================================
# 3. Recent work
# ============================================================
st.markdown('<div class="ssm-spacer-lg"></div>', unsafe_allow_html=True)

st.markdown(
    '<div class="ssm-section-head">'
    '<div class="ssm-section-num">03</div>'
    '<div class="ssm-section-title">최근 작업</div>'
    '</div>',
    unsafe_allow_html=True,
)

projects = storage.list_projects()
if projects:
    st.markdown('<div class="ssm-work-list">', unsafe_allow_html=True)
    for proj in projects[:8]:
        last_mod = proj["last_modified"][:10] if proj["last_modified"] else ""
        st.markdown(
            f"""
            <div class="ssm-work-item">
              <div class="ssm-work-left">
                <span class="ssm-work-title">{proj['name']}</span>
                <span class="ssm-badge">v{proj['version_count']}</span>
              </div>
              <span class="ssm-work-meta">{last_mod}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )
    st.markdown('</div>', unsafe_allow_html=True)
else:
    st.markdown(
        '<div class="ssm-empty">아직 작업한 작품이 없습니다. 위에서 매체를 골라 시작하세요.</div>',
        unsafe_allow_html=True,
    )


# ============================================================
# 4. Stats
# ============================================================
st.markdown('<div class="ssm-spacer-lg"></div>', unsafe_allow_html=True)

st.markdown(
    f"""
    <div class="ssm-stats">
      <div class="ssm-stat"><div class="ssm-stat-label">Works</div><div class="ssm-stat-value">{len(projects)}</div></div>
      <div class="ssm-stat"><div class="ssm-stat-label">Versions</div><div class="ssm-stat-value">{sum(p["version_count"] for p in projects)}</div></div>
      <div class="ssm-stat"><div class="ssm-stat-label">IP Library</div><div class="ssm-stat-value">{len(storage.list_ips())}</div></div>
      <div class="ssm-stat"><div class="ssm-stat-label">Media</div><div class="ssm-stat-value">13</div></div>
    </div>
    """,
    unsafe_allow_html=True,
)
