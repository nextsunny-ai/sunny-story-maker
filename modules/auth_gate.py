"""인증 게이트 — 모든 페이지 첫 부분에서 require_login() 호출
미인증 시 초대 코드 → 가입/로그인 화면을 띄우고 st.stop()으로 본문 차단.
새로고침해도 로그인 유지 — 쿠키 사용 (extra-streamlit-components).
"""

from datetime import datetime, timedelta
import streamlit as st

try:
    import extra_streamlit_components as stx
    _COOKIES_AVAILABLE = True
except ImportError:
    _COOKIES_AVAILABLE = False

from . import auth_user, profile as prof


# ============================================================
# 쿠키 매니저 (싱글톤) — 새로고침 후에도 로그인 유지
# ============================================================

COOKIE_INVITE = "ssm_invite"
COOKIE_EMAIL = "ssm_email"
COOKIE_WRITER = "ssm_writer"
COOKIE_EXPIRY_DAYS = 30


@st.cache_resource
def _cookie_manager():
    if not _COOKIES_AVAILABLE:
        return None
    return stx.CookieManager(key="ssm_cookie_manager")


def _expiry():
    return datetime.now() + timedelta(days=COOKIE_EXPIRY_DAYS)


def _restore_from_cookies():
    """페이지 진입 시 쿠키에서 세션 복원. 쿠키 매니저 첫 호출 시 None 가능 → 다음 rerun에 채워짐."""
    if not _COOKIES_AVAILABLE:
        return
    cm = _cookie_manager()
    if cm is None:
        return
    cookies = cm.get_all()
    if cookies is None:
        return  # 쿠키 아직 로드 중 — 다음 rerun에 시도

    if cookies.get(COOKIE_INVITE) == "1" and not st.session_state.get("invite_passed"):
        st.session_state.invite_passed = True

    email = cookies.get(COOKIE_EMAIL)
    if email and not st.session_state.get("auth_user"):
        st.session_state.auth_user = {"email": email}
        writer = cookies.get(COOKIE_WRITER)
        if writer:
            st.session_state.auth_writer_name = writer


def _persist_to_cookies():
    """현재 세션 상태를 쿠키에 저장."""
    if not _COOKIES_AVAILABLE:
        return
    cm = _cookie_manager()
    if cm is None:
        return
    expires = _expiry()
    if st.session_state.get("invite_passed"):
        cm.set(COOKIE_INVITE, "1", expires_at=expires, key="set_invite")
    user = st.session_state.get("auth_user")
    if user and user.get("email"):
        cm.set(COOKIE_EMAIL, user["email"], expires_at=expires, key="set_email")
    writer = st.session_state.get("auth_writer_name")
    if writer:
        cm.set(COOKIE_WRITER, writer, expires_at=expires, key="set_writer")


def _clear_cookies():
    """로그아웃 시 쿠키 삭제."""
    if not _COOKIES_AVAILABLE:
        return
    cm = _cookie_manager()
    if cm is None:
        return
    for name, key in [
        (COOKIE_INVITE, "del_invite"),
        (COOKIE_EMAIL, "del_email"),
        (COOKIE_WRITER, "del_writer"),
    ]:
        try:
            cm.delete(name, key=key)
        except Exception:
            pass


def _is_authed() -> bool:
    return bool(st.session_state.get("auth_user"))


def _set_auth(user: dict, session=None):
    """session_state에 인증 정보 저장 + 작가 프로필 처리 + 쿠키 저장."""
    st.session_state.auth_user = user
    if session is not None:
        st.session_state.auth_session = session

    email = user.get("email", "")

    # 가입 시 직접 입력한 작가명이 있으면 — 그 이름으로 작가 생성
    override = st.session_state.pop("signup_writer_override", None)
    if override:
        existing = prof.load_profile(override)
        if not existing:
            new_p = prof.empty_profile()
            new_p["name"] = override
            new_p["tagline"] = email
            new_p["auth_email"] = email
            prof.save_profile(new_p)
        prof.set_active(override)
        st.session_state.auth_writer_name = override
        _persist_to_cookies()
        return

    # 본인의 기존 작가 확인
    existing_profiles = prof.list_profiles()
    if existing_profiles:
        prof.set_active(existing_profiles[0]["name"])
        st.session_state.auth_writer_name = existing_profiles[0]["name"]
        _persist_to_cookies()
        return

    # 작가 없음 — 이메일 앞부분으로 자동 생성
    default_name = auth_user.email_to_writer_name(email)
    new_p = prof.empty_profile()
    new_p["name"] = default_name
    new_p["tagline"] = email
    new_p["auth_email"] = email
    prof.save_profile(new_p)
    prof.set_active(default_name)
    st.session_state.auth_writer_name = default_name
    _persist_to_cookies()


def _gate_ui():
    """초대 코드 + 가입/로그인 화면"""
    st.markdown(
        """
        <div style="text-align:center; padding: 60px 0 20px;">
          <div style="font-size: 22px; color:#666; letter-spacing: 0.5px; margin-bottom: 4px;">
            SUNNY
          </div>
          <div style="font-size: 56px; font-weight: 800; letter-spacing: -1.5px; color: #1A1610;">
            Story <span style="color:#EE9A8B;">Maker</span>
          </div>
          <div style="font-size: 14px; color: #666; margin-top: 10px;">
            한국 시나리오 작가의 통합 창작 도구
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # 1단계: 초대 코드
    if not st.session_state.get("invite_passed"):
        st.markdown("### 🔑 초대 코드 입력")
        st.caption("관리자에게서 받으신 초대 코드를 입력해주세요.")
        with st.form("invite_form"):
            code = st.text_input("초대 코드", type="password", placeholder="")
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
    """페이지 진입 시 호출 — 쿠키에서 세션 복원 시도 → 미인증이면 게이트."""
    # 1) 쿠키에서 세션 복원 시도 (새로고침 후에도 로그인 유지)
    if not _is_authed():
        _restore_from_cookies()

    # 2) 그래도 미인증이면 게이트 띄움
    if not _is_authed():
        _gate_ui()

    # 3) 인증된 경우: 세션의 작가명으로 활성 보장
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
    st.sidebar.markdown(
        f"<div style='font-size:11px; color:#888; padding:4px 8px;'>로그인: {user['email']}</div>",
        unsafe_allow_html=True,
    )
    if st.sidebar.button("🚪 로그아웃", use_container_width=True):
        auth_user.logout()
        _clear_cookies()
        for key in ("auth_user", "auth_session", "invite_passed", "auth_writer_name", "active_writer_name"):
            st.session_state.pop(key, None)
        st.rerun()
