"""인증 게이트 — 모든 페이지 첫 부분에서 require_login() 호출
미인증 시 초대 코드 → 가입/로그인 화면을 띄우고 st.stop()으로 본문 차단.
"""

import streamlit as st
from . import auth_user, profile as prof


def _is_authed() -> bool:
    return bool(st.session_state.get("auth_user"))


def _set_auth(user: dict, session=None):
    """session_state에 인증 정보 저장 + 작가 프로필 자동 생성/활성화"""
    st.session_state.auth_user = user
    if session is not None:
        st.session_state.auth_session = session

    # 작가명: 가입 시 직접 입력했으면 그걸로, 아니면 이메일 앞부분
    email = user.get("email", "")
    writer_name = (
        st.session_state.pop("signup_writer_override", None)
        or auth_user.email_to_writer_name(email)
    )
    # 이메일 ↔ 작가명 매핑 저장 (다음 로그인 시 같은 작가로 활성화)
    st.session_state.auth_writer_name = writer_name

    existing = prof.load_profile(writer_name)
    if not existing:
        new_p = prof.empty_profile()
        new_p["name"] = writer_name
        new_p["tagline"] = email
        prof.save_profile(new_p)
    prof.set_active(writer_name)


def _gate_ui():
    """초대 코드 + 가입/로그인 화면"""
    st.markdown(
        """
        <div style="text-align:center; padding: 60px 0 30px;">
          <div style="font-size: 38px; font-weight: 700; letter-spacing: -0.5px;">
            SUNNY <span style="color:#EE9A8B;">Story Maker</span>
          </div>
          <div style="font-size: 14px; color: #666; margin-top: 6px;">
            한국 시나리오 작가의 통합 창작 도구
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # 1단계: 초대 코드
    if not st.session_state.get("invite_passed"):
        st.markdown("### 🔑 초대 코드 입력")
        st.caption("관리자(유희정)에게서 받으신 초대 코드를 입력해주세요.")
        with st.form("invite_form"):
            code = st.text_input("초대 코드", type="password", placeholder="예: SUNNY2026!")
            submitted = st.form_submit_button("입장", type="primary", use_container_width=True)
            if submitted:
                if auth_user.is_valid_invite(code):
                    st.session_state.invite_passed = True
                    st.rerun()
                else:
                    st.error("초대 코드가 맞지 않습니다.")
        st.stop()

    # 2단계: 가입/로그인
    st.markdown("### 📝 가입 / 로그인")
    st.caption("Gmail 주소로만 가입 가능합니다.")

    tab_login, tab_signup = st.tabs(["🔓 로그인", "✨ 신규 가입"])

    with tab_login:
        with st.form("login_form"):
            email = st.text_input("Gmail", placeholder="example@gmail.com")
            password = st.text_input("비밀번호", type="password")
            submitted = st.form_submit_button("로그인", type="primary", use_container_width=True)
            if submitted:
                with st.spinner("로그인 중..."):
                    result = auth_user.login(email, password)
                if result["ok"]:
                    _set_auth(result["user"], result.get("session"))
                    st.success(f"✓ 환영합니다, {result['user']['email']}")
                    st.rerun()
                else:
                    st.error(result["error"])

    with tab_signup:
        with st.form("signup_form"):
            email = st.text_input("Gmail (아이디)", placeholder="example@gmail.com", key="su_email")
            password = st.text_input("새 비밀번호 (6자 이상)", type="password", key="su_pw")
            password2 = st.text_input("비밀번호 확인", type="password", key="su_pw2")
            writer_name = st.text_input(
                "작가명 (선택 — 비워두면 이메일 앞부분 사용)",
                placeholder="예: 유희정",
                key="su_writer",
                help="기존에 만든 작품·프로필이 있으면 그 작가명 그대로 입력하시면 데이터 그대로 이어집니다.",
            )
            submitted = st.form_submit_button("가입하기", type="primary", use_container_width=True)
            if submitted:
                if password != password2:
                    st.error("비밀번호가 일치하지 않습니다.")
                else:
                    with st.spinner("가입 처리 중..."):
                        result = auth_user.signup(email, password)
                    if result["ok"]:
                        # 작가명 직접 입력했으면 그걸로
                        if writer_name.strip():
                            st.session_state.signup_writer_override = writer_name.strip()
                        _set_auth(result["user"], result.get("session"))
                        st.success(f"✓ 가입 완료! {result['user']['email']}로 로그인되었습니다.")
                        st.rerun()
                    else:
                        st.error(result["error"])

    st.stop()


def require_login():
    """페이지 진입 시 호출 — 미인증이면 게이트 표시 + st.stop()"""
    if not _is_authed():
        _gate_ui()
    # 인증된 경우: 세션의 작가명으로 활성 보장
    user = st.session_state.auth_user
    writer_name = (
        st.session_state.get("auth_writer_name")
        or auth_user.email_to_writer_name(user.get("email", ""))
    )
    active = prof.get_active()
    if not active or active.get("name") != writer_name:
        prof.set_active(writer_name)


def render_logout_button():
    """사이드바에 로그아웃 버튼 표시 (auth된 사용자만)"""
    if not _is_authed():
        return
    user = st.session_state.auth_user
    st.sidebar.markdown(f"<div style='font-size:11px; color:#888; padding:4px 8px;'>로그인: {user['email']}</div>", unsafe_allow_html=True)
    if st.sidebar.button("🚪 로그아웃", use_container_width=True):
        auth_user.logout()
        for key in ("auth_user", "auth_session", "invite_passed"):
            st.session_state.pop(key, None)
        st.rerun()
