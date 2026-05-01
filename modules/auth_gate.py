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


def _cookie_manager():
    """CookieManager 인스턴스. session_state에 한 번만 생성."""
    if not _COOKIES_AVAILABLE:
        return None
    if "_ssm_cm" not in st.session_state:
        st.session_state["_ssm_cm"] = stx.CookieManager(key="ssm_cookie_manager")
    return st.session_state["_ssm_cm"]


def _expiry():
    return datetime.now() + timedelta(days=COOKIE_EXPIRY_DAYS)


def _restore_from_cookies():
    """쿠키 + URL 양쪽에서 세션 복원 시도.
    URL은 페이지 이동에도 잘 유지되므로 fallback으로 사용.
    """
    # 0) Google OAuth 콜백 처리 — ?code=... 가 URL에 있으면 세션 교환
    qp = st.query_params
    oauth_code = qp.get("code", "")
    if oauth_code and not st.session_state.get("auth_user"):
        with st.spinner("Google 로그인 처리 중..."):
            result = auth_user.exchange_code_for_session(oauth_code)
        if result.get("ok"):
            del st.query_params["code"]
            _set_auth(result["user"], result.get("session"))
            st.rerun()
        else:
            st.error(f"Google 로그인 실패: {result.get('error', '')}")
            del st.query_params["code"]

    # 1) URL 쿼리 파라미터에서 우선 복원 (가장 안정적)
    # ip=1 (invite passed)도 URL에 박음 — cookie first-render-None 우회
    if qp.get("ip") == "1" and not st.session_state.get("invite_passed"):
        st.session_state.invite_passed = True

    sid_email = qp.get("sid", "")
    if sid_email and not st.session_state.get("auth_user"):
        st.session_state.auth_user = {"email": sid_email}
        st.session_state.invite_passed = True
        sid_writer = qp.get("sw", "")
        if sid_writer:
            st.session_state.auth_writer_name = sid_writer

    # 2) 쿠키 시도 (있으면 좋고 없으면 패스)
    if not _COOKIES_AVAILABLE:
        return
    cm = _cookie_manager()
    if cm is None:
        return
    cookies = cm.get_all()
    if cookies is None:
        return

    if cookies.get(COOKIE_INVITE) == "1" and not st.session_state.get("invite_passed"):
        st.session_state.invite_passed = True

    email = cookies.get(COOKIE_EMAIL)
    if email and not st.session_state.get("auth_user"):
        st.session_state.auth_user = {"email": email}
        writer = cookies.get(COOKIE_WRITER)
        if writer:
            st.session_state.auth_writer_name = writer


def _persist_to_url():
    """세션을 URL 쿼리 파라미터에 저장 — 가장 안정적, 새로고침/페이지이동에 유지."""
    user = st.session_state.get("auth_user")
    if user and user.get("email"):
        st.query_params["sid"] = user["email"]
    writer = st.session_state.get("auth_writer_name")
    if writer:
        st.query_params["sw"] = writer
    # invite_passed도 URL에 영속화 (cookie first-render-None 우회)
    if st.session_state.get("invite_passed"):
        st.query_params["ip"] = "1"


def _persist_to_cookies():
    """현재 세션 상태를 쿠키에 저장 + URL에도."""
    _persist_to_url()
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


def auth_query_str() -> str:
    """HTML href 링크에 붙일 쿼리 스트링 — 페이지 이동 시 인증 유지.
    예: '&sid=foo@gmail.com&sw=유희정&ip=1' (앞에 & 포함)
    """
    user = st.session_state.get("auth_user")
    if not user or not user.get("email"):
        # 인증 안 됐어도 invite_passed는 유지하고 싶음
        if st.session_state.get("invite_passed"):
            return "&ip=1"
        return ""
    parts = [f"sid={user['email']}"]
    writer = st.session_state.get("auth_writer_name")
    if writer:
        parts.append(f"sw={writer}")
    if st.session_state.get("invite_passed"):
        parts.append("ip=1")
    return "&" + "&".join(parts)


def _clear_cookies():
    """로그아웃 시 쿠키 + URL 세션 삭제."""
    # URL 정리
    for k in ("sid", "sw"):
        if k in st.query_params:
            del st.query_params[k]
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
    # ★ 핵심: 인증 성공 시 invite도 영속화 (cookie first-render-None 우회)
    # 이게 빠지면 페이지 이동마다 invite 게이트 다시 뜸
    st.session_state.invite_passed = True
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

    # ★ 통합 로그인 화면 — 초대 코드 + (Google OR 이메일/비번) 한 번에
    # 이전엔 초대 → 로그인 두 단계였는데, 두 번 입력 강제라 답답해서 한 화면으로 합침
    # 이메일/비번 form엔 초대 코드 input 포함 (한 번에 검증)
    # Google 로그인은 invite_passed 통과 후 활성 (다른 탭에 안전한 OAuth)

    google_url = auth_user.get_google_oauth_url()

    # Google 로그인 (한 번 누르면 평생 자동 — 권장)
    if google_url:
        if st.session_state.get("invite_passed"):
            st.markdown(
                f"""
                <a href="{google_url}" target="_blank" rel="noopener" style="
                    display: flex; align-items: center; justify-content: center;
                    gap: 10px; padding: 14px 18px; margin-bottom: 14px;
                    background: white; border: 1.5px solid #dadce0;
                    border-radius: 10px; text-decoration: none;
                    color: #3c4043; font-size: 14px; font-weight: 500;
                    cursor: pointer;
                ">
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                        <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC04"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    <span>Google 계정으로 로그인 / 가입</span>
                </a>
                """,
                unsafe_allow_html=True,
            )
            st.caption("🆕 새 탭에서 Google 로그인 → 완료되면 이 탭 새로고침(F5)")
        else:
            # 초대 코드 미통과 시 — 안내만
            st.info("Google 로그인을 사용하려면 아래에서 **초대 코드 먼저 입력** 후 다시 새로고침해주세요.")

        st.markdown("<div style='text-align:center; color:#999; margin: 16px 0; font-size:12px;'>또는 이메일/비번으로</div>", unsafe_allow_html=True)

    tab_login, tab_signup = st.tabs(["🔓 로그인", "✨ 신규 가입"])

    # invite_passed 통과 시 초대 코드 input은 안 보임 (한 번 입력 후 영구)
    invite_already = st.session_state.get("invite_passed", False)

    with tab_login:
        with st.form("login_form"):
            if not invite_already:
                invite_code = st.text_input("🔑 초대 코드", type="password",
                                             help="관리자에게서 받으신 초대 코드")
            else:
                invite_code = ""  # 이미 통과
            email = st.text_input("Gmail", placeholder="example@gmail.com")
            password = st.text_input("비밀번호", type="password")
            submitted = st.form_submit_button("로그인", type="primary", use_container_width=True)
            if submitted:
                # 초대 코드 검증 (이미 통과했으면 스킵)
                if not invite_already and not auth_user.is_valid_invite(invite_code):
                    st.error("초대 코드가 맞지 않습니다.")
                else:
                    if not invite_already:
                        st.session_state.invite_passed = True
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
            if not invite_already:
                su_invite_code = st.text_input("🔑 초대 코드", type="password",
                                                key="su_invite", help="관리자에게서 받으신 초대 코드")
            else:
                su_invite_code = ""
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
                if not invite_already and not auth_user.is_valid_invite(su_invite_code):
                    st.error("초대 코드가 맞지 않습니다.")
                elif password != password2:
                    st.error("비밀번호가 일치하지 않습니다.")
                else:
                    if not invite_already:
                        st.session_state.invite_passed = True
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
        f"""
        <div style='
            font-size: 11px;
            color: #888;
            padding: 12px 12px 6px;
            margin-top: 16px;
            border-top: 1px solid rgba(0,0,0,0.08);
            line-height: 1.5;
            word-break: break-all;
        '>
            <div style='font-size:10px; opacity:0.7; margin-bottom:2px;'>로그인 계정</div>
            <div style='font-size:12px; color:#444; font-weight:500;'>{user['email']}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.sidebar.button("🚪 로그아웃", use_container_width=True):
        auth_user.logout()
        _clear_cookies()
        for key in ("auth_user", "auth_session", "invite_passed", "auth_writer_name", "active_writer_name"):
            st.session_state.pop(key, None)
        st.rerun()
