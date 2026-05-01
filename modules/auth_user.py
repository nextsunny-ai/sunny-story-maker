"""사용자 인증 (Supabase Auth + 초대 코드 게이트)

흐름:
  1. 초대 코드 입력 → 코드 맞으면 다음 단계
  2. 가입(이메일/비번) 또는 로그인
  3. 성공 시 session_state에 user 정보 저장
  4. 모든 페이지에서 require_login() 호출 → 미인증 시 게이트 표시
"""

import os
import re
from . import db


INVITE_CODE_KEY = "INVITE_CODE"
GMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@gmail\.com$")


def _get_secret(key: str, default: str = "") -> str:
    """env → Streamlit secrets 폴백"""
    val = os.getenv(key, "").strip()
    if val:
        return val
    try:
        import streamlit as st
        if hasattr(st, "secrets") and key in st.secrets:
            v = st.secrets[key]
            return str(v).strip() if v else default
    except Exception:
        pass
    return default


def get_invite_code() -> str:
    """현재 설정된 초대 코드"""
    return _get_secret(INVITE_CODE_KEY)


def is_valid_invite(code: str) -> bool:
    """입력된 코드가 유효한가"""
    expected = get_invite_code()
    return bool(expected) and code.strip() == expected


def is_gmail(email: str) -> bool:
    """Gmail 형식인가"""
    return bool(GMAIL_PATTERN.match(email.strip().lower()))


def signup(email: str, password: str) -> dict:
    """신규 가입.
    Returns: {"ok": bool, "user": dict|None, "error": str}
    """
    sb = db.get_client()
    if not sb:
        return {"ok": False, "user": None, "error": "Supabase 미연결"}

    email = email.strip().lower()
    if not is_gmail(email):
        return {"ok": False, "user": None, "error": "Gmail 주소만 사용 가능합니다 (@gmail.com)"}

    if len(password) < 6:
        return {"ok": False, "user": None, "error": "비밀번호는 6자 이상이어야 합니다"}

    try:
        result = sb.auth.sign_up({"email": email, "password": password})
        user = result.user
        session = result.session
        if user is None:
            return {"ok": False, "user": None, "error": "가입 실패 (이미 존재하는 이메일일 수 있어요)"}
        # 자동 로그인 — session 있으면 사용
        return {
            "ok": True,
            "user": {"id": user.id, "email": user.email},
            "session": session,
            "error": "",
        }
    except Exception as e:
        msg = str(e)
        if "already registered" in msg.lower() or "user_already_exists" in msg.lower():
            return {"ok": False, "user": None, "error": "이미 가입된 이메일입니다. 로그인해 주세요."}
        return {"ok": False, "user": None, "error": f"가입 오류: {msg}"}


def login(email: str, password: str) -> dict:
    """로그인.
    Returns: {"ok": bool, "user": dict|None, "error": str}
    """
    sb = db.get_client()
    if not sb:
        return {"ok": False, "user": None, "error": "Supabase 미연결"}

    email = email.strip().lower()

    try:
        result = sb.auth.sign_in_with_password({"email": email, "password": password})
        user = result.user
        if user is None:
            return {
                "ok": False,
                "user": None,
                "error": (
                    "로그인 실패. 가입 안 하셨으면 위의 **'✨ 신규 가입'** 탭에서 먼저 가입해주세요. "
                    "이미 가입했으면 비밀번호를 다시 확인해주세요."
                ),
            }
        return {
            "ok": True,
            "user": {"id": user.id, "email": user.email},
            "session": result.session,
            "error": "",
        }
    except Exception as e:
        msg = str(e)
        if "invalid" in msg.lower() or "credentials" in msg.lower():
            return {
                "ok": False,
                "user": None,
                "error": (
                    "이 이메일로 가입된 적이 없거나 비밀번호가 틀립니다.\n\n"
                    "👉 **처음이세요?** 위의 **'✨ 신규 가입'** 탭으로 가셔서 먼저 가입하세요.\n"
                    "👉 **이미 가입한 적 있으세요?** 그때 정한 비밀번호를 다시 확인해주세요."
                ),
            }
        return {"ok": False, "user": None, "error": f"로그인 오류: {msg}"}


def logout() -> None:
    """로그아웃 — 세션 정리 + Supabase signout"""
    sb = db.get_client()
    if sb:
        try:
            sb.auth.sign_out()
        except Exception:
            pass


def email_to_writer_name(email: str) -> str:
    """이메일을 기본 작가명으로 변환 (예: kim@gmail.com → kim)"""
    if not email:
        return "guest"
    return email.split("@")[0]


# ============================================================
# Google OAuth
# ============================================================

DEFAULT_REDIRECT = "https://sunny-storymaker.streamlit.app"


def get_app_url() -> str:
    """앱 URL — env 우선, 없으면 기본값"""
    return _get_secret("APP_URL", DEFAULT_REDIRECT)


def get_google_oauth_url() -> str:
    """Google OAuth 시작 URL — 사용자를 이 URL로 보내면 Google 로그인 후 우리 앱으로 돌아옴.
    Returns: OAuth URL 문자열, 실패 시 빈 문자열.
    """
    sb = db.get_client()
    if not sb:
        return ""
    try:
        result = sb.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": get_app_url(),
            },
        })
        return getattr(result, "url", "") or ""
    except Exception as e:
        import logging
        logging.warning(f"[auth] Google OAuth URL 생성 실패: {e}")
        return ""


def exchange_code_for_session(code: str) -> dict:
    """OAuth 콜백에서 받은 code를 세션으로 교환.
    Returns: {"ok": bool, "user": dict|None, "session": ..., "error": str}
    """
    sb = db.get_client()
    if not sb:
        return {"ok": False, "user": None, "error": "Supabase 미연결"}
    try:
        result = sb.auth.exchange_code_for_session({"auth_code": code})
        user = result.user
        session = result.session
        if user is None:
            return {"ok": False, "user": None, "error": "사용자 정보 가져오기 실패"}
        return {
            "ok": True,
            "user": {"id": user.id, "email": user.email or ""},
            "session": session,
            "error": "",
        }
    except Exception as e:
        return {"ok": False, "user": None, "error": f"코드 교환 실패: {e}"}
