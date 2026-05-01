"""Supabase 연결 + 안전한 폴백
- env(SUPABASE_URL/KEY) 또는 Streamlit Secrets 둘 중 하나에 있으면 활성화
- 없으면 None 반환 → 호출자가 파일 기반 저장으로 폴백
"""

import os

try:
    from supabase import create_client, Client  # type: ignore
except ImportError:
    create_client = None
    Client = None


def _get_secret(key: str) -> str:
    """env → Streamlit secrets 순서로 값 찾기."""
    val = os.getenv(key, "").strip()
    if val:
        return val
    # Streamlit secrets 폴백 (Cloud 환경)
    try:
        import streamlit as st
        if hasattr(st, "secrets") and key in st.secrets:
            v = st.secrets[key]
            return str(v).strip() if v else ""
    except Exception:
        pass
    return ""


def is_enabled() -> bool:
    """Supabase 사용 가능 여부"""
    if create_client is None:
        return False
    return bool(_get_secret("SUPABASE_URL") and _get_secret("SUPABASE_KEY"))


# lru_cache 제거 — Streamlit rerun마다 secrets 다시 확인 필요할 수도
_client_cache = {"client": None, "tried": False}


def get_client():
    """Supabase 클라이언트. 매 호출에서 한 번 시도하고 결과 캐시."""
    if _client_cache["tried"]:
        return _client_cache["client"]

    _client_cache["tried"] = True
    if not is_enabled():
        return None

    url = _get_secret("SUPABASE_URL")
    key = _get_secret("SUPABASE_KEY")
    try:
        _client_cache["client"] = create_client(url, key)
    except Exception as e:
        import logging
        logging.warning(f"[db] Supabase client init failed: {e}")
        _client_cache["client"] = None
    return _client_cache["client"]


def reset_cache():
    """클라이언트 캐시 초기화 (테스트/디버깅용)"""
    _client_cache["client"] = None
    _client_cache["tried"] = False


def safe_call(fn, *args, **kwargs):
    """Supabase 호출 래퍼 — 예외 시 None 반환"""
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        import logging
        logging.warning(f"[db] Supabase call failed: {e}")
        return None


def diagnose() -> dict:
    """진단 정보 — 어드민에서 띄울 용도"""
    return {
        "supabase_module_imported": create_client is not None,
        "url_set": bool(_get_secret("SUPABASE_URL")),
        "key_set": bool(_get_secret("SUPABASE_KEY")),
        "is_enabled": is_enabled(),
        "client_created": get_client() is not None,
    }
