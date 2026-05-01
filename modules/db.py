"""Supabase 연결 + 안전한 폴백
- SUPABASE_URL + SUPABASE_KEY 가 .env / Streamlit Secrets에 있으면 활성화
- 없으면 None 반환 → 호출자가 파일 기반 저장으로 폴백

사용법:
    from modules.db import get_client, is_enabled
    sb = get_client()
    if sb:
        sb.table('projects').insert({...}).execute()
    else:
        # 파일 저장 폴백
        ...
"""

import os
from functools import lru_cache

try:
    from supabase import create_client, Client  # type: ignore
except ImportError:
    create_client = None
    Client = None


def is_enabled() -> bool:
    """Supabase 사용 가능한 상태인지"""
    return bool(
        create_client is not None
        and os.getenv("SUPABASE_URL", "").strip()
        and os.getenv("SUPABASE_KEY", "").strip()
    )


@lru_cache(maxsize=1)
def get_client():
    """Supabase 클라이언트. 설정 안 되어 있으면 None."""
    if not is_enabled():
        return None
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_KEY", "").strip()
    try:
        return create_client(url, key)
    except Exception as e:
        # 연결 실패 시 조용히 None — 파일 저장으로 폴백
        import logging
        logging.warning(f"[db] Supabase client init failed: {e}")
        return None


def safe_call(fn, *args, **kwargs):
    """Supabase 호출 래퍼 — 예외 시 None 반환 (호출자 폴백 가능하게)"""
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        import logging
        logging.warning(f"[db] Supabase call failed: {e}")
        return None
