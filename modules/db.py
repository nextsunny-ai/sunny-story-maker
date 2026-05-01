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


# 클라이언트 캐시 — 성공 시 영구 캐시, 실패 시 재시도 허용
# 한 번 실패했다고 영영 파일모드로 떨어지지 않게 (Streamlit Cloud 콜드스타트 보호)
_client_cache = {"client": None, "last_attempt_ts": 0.0, "fail_count": 0}
_RETRY_COOLDOWN_SEC = 5.0  # 연속 실패 시 5초마다 재시도 허용


def get_client():
    """Supabase 클라이언트. 성공한 클라이언트는 재사용, 실패는 cooldown 후 재시도."""
    import time
    if _client_cache["client"] is not None:
        return _client_cache["client"]

    # 직전 실패 후 쿨다운 안 지났으면 None 반환 (Streamlit rerun 폭격 방지)
    now = time.monotonic()
    if _client_cache["fail_count"] > 0 and (now - _client_cache["last_attempt_ts"]) < _RETRY_COOLDOWN_SEC:
        return None

    _client_cache["last_attempt_ts"] = now

    if not is_enabled():
        _client_cache["fail_count"] += 1
        return None

    url = _get_secret("SUPABASE_URL")
    key = _get_secret("SUPABASE_KEY")
    try:
        client = create_client(url, key)
        _client_cache["client"] = client
        _client_cache["fail_count"] = 0
        return client
    except Exception as e:
        import logging
        logging.warning(f"[db] Supabase client init failed (attempt {_client_cache['fail_count']+1}): {e}")
        _client_cache["fail_count"] += 1
        return None


def reset_cache():
    """클라이언트 캐시 초기화 (테스트/디버깅용)"""
    _client_cache["client"] = None
    _client_cache["last_attempt_ts"] = 0.0
    _client_cache["fail_count"] = 0


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
