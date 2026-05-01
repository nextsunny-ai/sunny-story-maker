"""Streamlit Cloud 호환 — st.secrets를 os.environ으로 자동 매핑.
모든 페이지 최상단에서 import하면 됨 (또는 sori_client/storage가 자동 import)."""

import os


def init_cloud_env():
    """Streamlit Cloud의 secrets.toml 값들을 환경변수로 등록.
    로컬에선 .env가 이미 dotenv로 로드되므로 무시."""
    try:
        import streamlit as st
        secret_keys = [
            "ANTHROPIC_API_KEY",
            "DEFAULT_MODEL",
            "DRIVE_OUTPUT_DIR",
            "SORI_SKILL_DIR",
            "STORY_MAKER_OUTPUT",
            "FORCE_AUTH_MODE",
        ]
        for k in secret_keys:
            if k in st.secrets and not os.environ.get(k):
                val = st.secrets[k]
                if val:  # 빈 값은 skip
                    os.environ[k] = str(val)
    except Exception:
        # streamlit 미가용 또는 secrets 없음 → 무시 (로컬 .env로 동작)
        pass


# import 시점에 자동 실행
init_cloud_env()
