"""보조작가와 대화 — 좌우 2단 (좌: 설정/액션 / 우: 대화창)
카톡 스타일 채팅 + 작가 친화 패널"""

import streamlit as st
from datetime import datetime
from modules.page_init import init_page
init_page("보조작가 — SUNNY Story Maker")

from modules import sori_client, storage, profile as prof
from modules.genres import GENRES, list_genre_names, parse_genre_choice

# 활성 작가 (프로필 시스템) — 작가별로 대화 기록 분리
_active_writer = prof.get_active()
WRITER_NAME = _active_writer["name"] if _active_writer else "guest"
# 카톡 스타일 + 좌우 분할 CSS
st.markdown("""
<style>
/* 이 페이지 — 페이지 자체 스크롤 절대 금지, 스크롤은 채팅 컨테이너 안에서만 */
html, body, .stApp,
[data-testid="stAppViewContainer"],
[data-testid="stMain"],
section.main,
.main {
    overflow: hidden !important;
    max-height: 100vh !important;
    height: 100vh !important;
}
.main .block-container,
[data-testid="stMainBlockContainer"] {
    max-width: 1400px !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    overflow: hidden !important;
}
/* Streamlit 우측 하단 floating 요소 일괄 차단 */
[data-testid="stStatusWidget"],
[data-testid="manage-app-button"],
[data-testid="stActionButton"],
.stAppDeployButton,
[class*="viewerBadge"],
[data-testid="stChatInputAudioInput"],
[data-testid="stChatInputVoiceRecorderButton"],
button[aria-label*="audio" i],
button[aria-label*="record" i],
button[aria-label*="microphone" i] {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
}

[data-testid="stChatMessage"] {
    background: transparent !important;
    padding: 4px 0 !important;
    border: none !important;
}
[data-testid="stChatMessage"][aria-label*="user"] { flex-direction: row-reverse !important; }

[data-testid="stChatMessage"] > div:last-child {
    background: var(--card-pure);
    padding: 10px 14px;
    border-radius: 16px;
    border: 1px solid var(--line);
    max-width: 80%;
    box-shadow: var(--shadow-xs);
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--ink);
}
[data-testid="stChatMessage"][aria-label*="user"] > div:last-child {
    background: var(--coral-soft, #F8DDD4);
    border-color: var(--coral, #EE9A8B);
    color: var(--ink);
}

/* 좌측 패널 — 초초컴팩트 (스크롤 없이 한 화면 강제) */
.aux-panel-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin: 6px 0 1px;
}

/* 모든 버튼 — 매우 작게 (chat_input submit은 다른 testid라 영향 X) */
.stButton > button,
.stDownloadButton > button {
    padding: 2px 8px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    min-height: 26px !important;
    height: 26px !important;
    line-height: 1.15 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
}

/* selectbox / textarea 매우 컴팩트 */
[data-baseweb="select"] { min-height: 28px !important; }
[data-baseweb="select"] > div {
    min-height: 28px !important;
    padding: 0 8px !important;
    font-size: 12px !important;
}
[data-testid="stTextArea"] textarea {
    font-size: 11.5px !important;
    padding: 5px 8px !important;
    line-height: 1.35 !important;
    min-height: 50px !important;
}
[data-testid="stWidgetLabel"] {
    font-size: 10.5px !important;
    margin-bottom: 1px !important;
    padding-bottom: 0 !important;
    line-height: 1.2 !important;
}
[data-testid="stWidgetLabel"] p { font-size: 10.5px !important; margin: 0 !important; }
/* 좌측 패널 내부 세로 gap 최소 */
[data-testid="column"] [data-testid="stVerticalBlock"] { gap: 0.2rem !important; }
[data-testid="column"] [data-testid="stHorizontalBlock"] { gap: 0.3rem !important; }

/* 채팅 컨테이너 + 입력칸 시각 통합 — 한 박스처럼 보이게 */
[data-testid="stVerticalBlockBorderWrapper"]:has([data-testid="stChatMessage"]),
.chat-merged-container {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    border-bottom: none !important;
}

/* Streamlit chat_input 감싸는 모든 래퍼 — 배경/패딩 제거 */
[data-testid="stBottom"],
[data-testid="stBottomBlockContainer"],
[data-testid="stChatInput"],
[data-testid="stChatInput"] > div,
[data-testid="stChatInputContainer"] {
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    min-height: 0 !important;
    height: auto !important;
}
[data-testid="stBottom"] {
    margin-top: 6px !important;
}

/* chat_input pill — flex 레이아웃으로 textarea + 버튼 한 줄 */
[data-testid="stChatInput"] > div {
    display: flex !important;
    align-items: center !important;
    background: var(--card-pure) !important;
    border: 1px solid var(--line) !important;
    border-radius: 22px !important;
    padding: 3px 4px 3px 14px !important;
    gap: 6px !important;
}
[data-testid="stChatInput"] > div > div {
    flex: 1 !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    min-height: 0 !important;
}
[data-testid="stChatInput"] textarea {
    background: transparent !important;
    border: none !important;
    padding: 6px 0 !important;
    min-height: 28px !important;
    max-height: 80px !important;
    font-size: 13px !important;
    line-height: 1.4 !important;
    box-shadow: none !important;
}
/* submit 버튼 — pill 우측 안쪽 작은 코랄 원형 */
[data-testid="stChatInputSubmitButton"],
[data-testid="stChatInput"] button {
    flex: 0 0 26px !important;
    height: 26px !important;
    width: 26px !important;
    min-height: 26px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    background: var(--coral) !important;
    border: none !important;
    color: #FFFFFF !important;
    position: static !important;
    transform: none !important;
}
[data-testid="stChatInputSubmitButton"] svg,
[data-testid="stChatInput"] button svg {
    width: 14px !important;
    height: 14px !important;
}
[data-testid="stChatInputSubmitButton"]:hover {
    background: #D67A6B !important;
}
</style>
""", unsafe_allow_html=True)


# ========== 상단 헤더 (한 줄로 매우 얇게) ==========
st.markdown(
    """
    <div class="app-header">
        <div class="app-header-title"><span class="app-header-title-emoji">💬</span>보조작가</div>
        <div class="app-header-version">실시간 의뢰 · 카톡 스타일</div>
    </div>
    """,
    unsafe_allow_html=True,
)


# ========== 세션 상태 ==========
if "aux_proj" not in st.session_state:
    st.session_state.aux_proj = "(없음)"
if "aux_genre" not in st.session_state:
    st.session_state.aux_genre = "(미지정)"
if "aux_extra" not in st.session_state:
    st.session_state.aux_extra = ""

# 채팅 로그는 파일에서 로드 — 작가별 + 프로젝트별 분리, 재진입해도 유지
_chat_key = f"{WRITER_NAME}::{st.session_state.aux_proj}"
if "chat_loaded_for" not in st.session_state:
    st.session_state.chat_loaded_for = None
if (st.session_state.chat_loaded_for != _chat_key
        or "chat_messages" not in st.session_state):
    st.session_state.chat_messages = storage.load_chat_log(
        st.session_state.aux_proj, writer_name=WRITER_NAME
    )
    st.session_state.chat_loaded_for = _chat_key


# ========== 좌우 분할 (좌: 패널 / 우: 대화창) ==========
left_col, right_col = st.columns([1, 2.4], gap="medium")


# ============================================================
# 좌측: 컨텍스트 설정 + 빠른 의뢰 + 액션
# ============================================================
with left_col:
    # 컨텍스트
    st.markdown('<div class="aux-panel-title">📂 작업 컨텍스트</div>', unsafe_allow_html=True)

    projects = storage.list_projects()
    proj_names = ["(없음)"] + [p["name"] for p in projects]
    proj_default_idx = proj_names.index(st.session_state.aux_proj) if st.session_state.aux_proj in proj_names else 0
    new_proj = st.selectbox("작품", proj_names, index=proj_default_idx)
    if new_proj != st.session_state.aux_proj:
        # 프로젝트 변경 시 해당 프로젝트의 채팅 로그로 교체 (작가별 분리)
        st.session_state.aux_proj = new_proj
        st.session_state.chat_messages = storage.load_chat_log(
            new_proj, writer_name=WRITER_NAME
        )
        st.session_state.chat_loaded_for = f"{WRITER_NAME}::{new_proj}"
        st.rerun()

    genre_options = ["(미지정)"] + list_genre_names()
    g_default_idx = genre_options.index(st.session_state.aux_genre) if st.session_state.aux_genre in genre_options else 0
    st.session_state.aux_genre = st.selectbox("매체", genre_options, index=g_default_idx)

    st.session_state.aux_extra = st.text_area(
        "보조작가에게 알려둘 것",
        value=st.session_state.aux_extra,
        placeholder=(
            "이 작품을 작업할 때 보조작가가 계속 기억해야 할 정보.\n"
            "예) 시대 = 1990년대 부산 / 톤 = 따뜻한 위로 / "
            "주인공 비유체계 = 야구 / 금기어 = 운명, 인연"
        ),
        height=88,
        help="작업 중에 매번 다시 설명하기 귀찮은 설정 — 캐릭터·시대·톤·금기어 등",
    )

    # 빠른 의뢰 (3열 × 2행)
    st.markdown('<div class="aux-panel-title">⚡ 빠른 의뢰</div>', unsafe_allow_html=True)
    quick_prompts = [
        ("✏️ 이름",
         "이 작품에 어울리는 캐릭터 이름 5개 추천해줘. (이미지/뉘앙스 한 줄 설명 포함)"),
        ("💬 대사",
         "다음 대사가 어색해. 캐릭터 비유 살려서 자연스럽게 다시 써줘:\n\n"),
        ("🎭 비유",
         "이 캐릭터한테 어울리는 고유 비유 체계 (직업/취미 기반) 5가지 추천해줘"),
        ("📖 장면",
         "이 흐름 다음에 올 만한 장면 3가지 아이디어 줘. (각 핵심 사건 1줄)"),
        ("🔍 검토",
         "다음 부분이 좀 약한 거 같아. AI 티 / 어색함 / 캐릭터 일관성 체크해줘:\n\n"),
        ("🎬 씬헤딩",
         "다음 씬 헤딩과 지문이 한국 시나리오 표준에 맞는지 봐줘:\n\n"),
    ]
    for row in range(0, len(quick_prompts), 3):
        bcols = st.columns(3)
        for i in range(3):
            idx = row + i
            if idx < len(quick_prompts):
                with bcols[i]:
                    label, p = quick_prompts[idx]
                    if st.button(label, key=f"qbtn_{idx}", use_container_width=True):
                        st.session_state.pending_prompt = p

    # 액션
    st.markdown('<div class="aux-panel-title">🛠 액션</div>', unsafe_allow_html=True)
    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("🗑 비우기", use_container_width=True, help="대화 초기화 (저장 파일도 비움)"):
            st.session_state.chat_messages = []
            storage.save_chat_log([], st.session_state.aux_proj, writer_name=WRITER_NAME)
            st.rerun()
    with col_b:
        if st.session_state.chat_messages:
            log_text = "\n\n".join([
                f"[{'작가' if m['role'] == 'user' else '보조작가'}]\n{m['content']}"
                for m in st.session_state.chat_messages
            ])
            st.download_button(
                "📥 저장",
                data=log_text.encode("utf-8"),
                file_name=f"대화_{datetime.now().strftime('%m%d_%H%M')}.txt",
                mime="text/plain",
                use_container_width=True,
            )
        else:
            st.button("📥 저장", disabled=True, use_container_width=True)


# ============================================================
# 우측: 대화창 (카톡 — 컨테이너 안에서만 메시지 흐름, 자동 스크롤)
# ============================================================
with right_col:
    # 메시지 컨테이너 — 페이지 스크롤 안 생기는 높이
    msg_container = st.container(height=340, border=True)

    with msg_container:
        if not st.session_state.chat_messages:
            st.markdown(
                '<div style="text-align: center; padding: 24px; color: var(--ink-4); font-size: 13px;">'
                '💬 대화 시작 전 — 좌측 빠른 의뢰 또는 아래 입력창'
                '</div>',
                unsafe_allow_html=True,
            )
        else:
            for msg in st.session_state.chat_messages:
                avatar = "✍️" if msg["role"] == "user" else "🎬"
                with st.chat_message(msg["role"], avatar=avatar):
                    st.markdown(msg["content"])

    # 입력 — column 안에서 컨테이너 바로 아래 (column 폭에 맞게)
    default_input = st.session_state.pop("pending_prompt", "")
    user_input = st.chat_input("보조작가에게 말 걸기...")
    if not user_input and default_input:
        user_input = default_input

    if user_input:
        # 컨텍스트 빌드
        context_parts = []
        if st.session_state.aux_proj and st.session_state.aux_proj != "(없음)":
            ver_num, body = storage.latest_version(st.session_state.aux_proj)
            if body:
                context_parts.append(f"[작업 중: {st.session_state.aux_proj} v{ver_num}]\n{body[:3000]}")
        if st.session_state.aux_genre and st.session_state.aux_genre != "(미지정)":
            letter = parse_genre_choice(st.session_state.aux_genre)
            if letter in GENRES:
                g = GENRES[letter]
                context_parts.append(f"[매체: {g['name']} - {g['분량_표준']}]")
        if st.session_state.aux_extra:
            context_parts.append(f"[메모]\n{st.session_state.aux_extra}")
        context = "\n\n".join(context_parts)

        # 사용자 메시지 = 컨테이너 안에 즉시 그리기
        with msg_container:
            with st.chat_message("user", avatar="✍️"):
                st.markdown(user_input)

        convo = "\n\n".join([
            f"{'작가' if m['role'] == 'user' else '보조작가'}: {m['content']}"
            for m in st.session_state.chat_messages[-10:]
        ] + [f"작가: {user_input}"])

        prompt = f"""# 보조작가 모드

너는 작가 옆에 앉은 보조작가다. 작가가 작업하면서 떠오르는 작은 질문/요청에 짧고 정확하게 답한다.

## 룰
- 답변 짧게 (작가가 작업 중)
- 정확히 답만. 부가 설명 X
- 대사/이름/비유 추천은 표 또는 불릿
- AI 티 X (humanizer 자가 검증)
- "다른 거 더 필요해?" 멘트 X

## 작업 컨텍스트
{context if context else "(없음)"}

## 대화
{convo}
"""

        # AI 응답 = 컨테이너 안에 스트리밍
        with msg_container:
            with st.chat_message("assistant", avatar="🎬"):
                placeholder = st.empty()
                full = ""
                # 보조작가는 짧은 답이 핵심 — Haiku 4.5로 빠르게 (Opus 대비 ~3배 빠름)
                CHAT_MODEL = "claude-haiku-4-5"
                st.session_state.ssm_busy = {"label": "보조작가 응답 중", "detail": ""}
                if sori_client.is_configured():
                    try:
                        for chunk in sori_client.stream_sori(
                            prompt, max_tokens=1500, temperature=0.8, model=CHAT_MODEL
                        ):
                            full += chunk
                            placeholder.markdown(full + "▌")
                        placeholder.markdown(full)
                    except Exception as e:
                        full = f"[오류] {e}"
                        placeholder.markdown(full)
                else:
                    full = sori_client.call_sori(prompt, max_tokens=1500, model=CHAT_MODEL)
                    placeholder.markdown(full)
                st.session_state.pop("ssm_busy", None)

        # 마지막에 session + 파일에 저장 (재진입해도 보존, 작가별 분리)
        st.session_state.chat_messages.append({
            "role": "user",
            "content": user_input,
            "ts": datetime.now().isoformat(),
        })
        st.session_state.chat_messages.append({
            "role": "assistant",
            "content": full,
            "ts": datetime.now().isoformat(),
        })
        storage.save_chat_log(
            st.session_state.chat_messages,
            st.session_state.aux_proj,
            writer_name=WRITER_NAME,
        )
