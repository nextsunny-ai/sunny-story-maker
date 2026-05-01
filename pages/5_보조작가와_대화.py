"""보조작가와 대화 — 좌우 2단 (좌: 설정/액션 / 우: 대화창)
카톡 스타일 채팅 + 작가 친화 패널"""

import streamlit as st
from pathlib import Path
from datetime import datetime

from modules import sori_client, storage
from modules.genres import GENRES, list_genre_names, parse_genre_choice

css_path = Path(__file__).parent.parent / "assets" / "styles.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)


from modules.sidebar import render_sidebar
render_sidebar()
# 카톡 스타일 + 좌우 분할 CSS
st.markdown("""
<style>
.main .block-container { max-width: 1400px !important; padding-bottom: 60px !important; }

[data-testid="stChatMessage"] {
    background: transparent !important;
    padding: 4px 0 !important;
    border: none !important;
}
[data-testid="stChatMessage"][aria-label*="user"] { flex-direction: row-reverse !important; }

[data-testid="stChatMessage"] > div:last-child {
    background: white;
    padding: 12px 16px;
    border-radius: 18px;
    border: 1px solid var(--border);
    max-width: 80%;
    box-shadow: var(--shadow-sm);
    font-size: 14px;
    line-height: 1.55;
}
[data-testid="stChatMessage"][aria-label*="user"] > div:last-child {
    background: linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%);
    border-color: #BFDBFE;
}

/* 좌측 패널 영역 — 회색 카드 */
.aux-panel {
    background: var(--bg-secondary);
    border-radius: 14px;
    padding: 18px;
    border: 1px solid var(--border);
    position: sticky;
    top: 16px;
}
.aux-panel-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 10px;
}

/* 빠른 의뢰 버튼 */
.quick-btn { margin-bottom: 6px; }
</style>
""", unsafe_allow_html=True)


# ========== 상단 헤더 (한 줄로 매우 얇게) ==========
st.markdown(
    '<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0 8px; font-weight: 700; font-size: 14px; color: #2563EB;">'
    '💬 보조작가</div>',
    unsafe_allow_html=True,
)


# ========== 세션 상태 ==========
if "chat_messages" not in st.session_state:
    st.session_state.chat_messages = []
if "aux_proj" not in st.session_state:
    st.session_state.aux_proj = "(없음)"
if "aux_genre" not in st.session_state:
    st.session_state.aux_genre = "(미지정)"
if "aux_extra" not in st.session_state:
    st.session_state.aux_extra = ""


# ========== 좌우 분할 (좌: 패널 / 우: 대화창) ==========
left_col, right_col = st.columns([1, 2.5], gap="large")


# ============================================================
# 좌측: 컨텍스트 설정 + 빠른 의뢰 + 액션
# ============================================================
with left_col:
    # 컨텍스트
    st.markdown('<div class="aux-panel-title">📂 작업 컨텍스트</div>', unsafe_allow_html=True)
    st.caption("선택사항. 설정하면 그 작품 기준으로 답변.")

    projects = storage.list_projects()
    proj_names = ["(없음)"] + [p["name"] for p in projects]
    proj_default_idx = proj_names.index(st.session_state.aux_proj) if st.session_state.aux_proj in proj_names else 0
    st.session_state.aux_proj = st.selectbox("작품", proj_names, index=proj_default_idx, label_visibility="collapsed")

    genre_options = ["(미지정)"] + list_genre_names()
    g_default_idx = genre_options.index(st.session_state.aux_genre) if st.session_state.aux_genre in genre_options else 0
    st.session_state.aux_genre = st.selectbox("매체", genre_options, index=g_default_idx, label_visibility="collapsed")

    st.session_state.aux_extra = st.text_area(
        "메모 (선택)",
        value=st.session_state.aux_extra,
        placeholder="예) 주인공 유건은 야구 비유, 도윤은 커피 비유",
        height=80,
        label_visibility="collapsed",
    )

    st.markdown("<div style='height: 16px'></div>", unsafe_allow_html=True)

    # 빠른 의뢰
    st.markdown('<div class="aux-panel-title">⚡ 빠른 의뢰</div>', unsafe_allow_html=True)
    quick_prompts = [
        ("✏️ 캐릭터 이름 5개 추천",
         "이 작품에 어울리는 캐릭터 이름 5개 추천해줘. (이미지/뉘앙스 한 줄 설명 포함)"),
        ("💬 대사 다시 써줘",
         "다음 대사가 어색해. 캐릭터 비유 살려서 자연스럽게 다시 써줘:\n\n"),
        ("🎭 비유 체계 만들어줘",
         "이 캐릭터한테 어울리는 고유 비유 체계 (직업/취미 기반) 5가지 추천해줘"),
        ("📖 다음 장면 아이디어",
         "이 흐름 다음에 올 만한 장면 3가지 아이디어 줘. (각 핵심 사건 1줄)"),
        ("🔍 이 부분 검토해줘",
         "다음 부분이 좀 약한 거 같아. AI 티 / 어색함 / 캐릭터 일관성 체크해줘:\n\n"),
        ("🎬 씬 헤딩 정리",
         "다음 씬 헤딩과 지문이 한국 시나리오 표준에 맞는지 봐줘:\n\n"),
    ]
    for i, (label, p) in enumerate(quick_prompts):
        if st.button(label, key=f"qbtn_{i}", use_container_width=True):
            st.session_state.pending_prompt = p

    st.markdown("<div style='height: 16px'></div>", unsafe_allow_html=True)

    # 액션
    st.markdown('<div class="aux-panel-title">🛠 액션</div>', unsafe_allow_html=True)
    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("🗑 비우기", use_container_width=True, help="대화 초기화"):
            st.session_state.chat_messages = []
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
    # 메시지 컨테이너 — 화면에서 가장 큰 영역 (높이 자동, 최소 높게)
    msg_container = st.container(height=720, border=True)

    with msg_container:
        if not st.session_state.chat_messages:
            # 빈 상태 — 작게 한 줄만
            st.markdown(
                '<div style="text-align: center; padding: 24px; color: #CBD5E1; font-size: 13px;">'
                '대화 시작 전 — 좌측 빠른 의뢰 또는 아래 입력창'
                '</div>',
                unsafe_allow_html=True,
            )
        else:
            for msg in st.session_state.chat_messages:
                avatar = "✍️" if msg["role"] == "user" else "🎬"
                with st.chat_message(msg["role"], avatar=avatar):
                    st.markdown(msg["content"])

    # 입력 (컨테이너 밖, 페이지 하단)
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
                if sori_client.is_configured():
                    try:
                        for chunk in sori_client.stream_sori(prompt, max_tokens=2000, temperature=0.8):
                            full += chunk
                            placeholder.markdown(full + "▌")
                        placeholder.markdown(full)
                    except Exception as e:
                        full = f"[오류] {e}"
                        placeholder.markdown(full)
                else:
                    full = sori_client.call_sori(prompt, max_tokens=2000)
                    placeholder.markdown(full)

        # 마지막에 session에 저장 (다음 rerun에 보존)
        st.session_state.chat_messages.append({"role": "user", "content": user_input})
        st.session_state.chat_messages.append({"role": "assistant", "content": full})
