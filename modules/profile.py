"""작가 프로필 시스템 — Supabase + 파일 폴백
한 이메일에 여러 작가 가능 (페르소나). 활성 작가는 브라우저 세션별로 분리.
"""

import json
import os
from pathlib import Path
from datetime import datetime

from . import db

_ROOT = Path(__file__).resolve().parent.parent
PROFILES_DIR = Path(os.getenv("STORY_MAKER_OUTPUT") or (_ROOT / "output")) / "_profiles"
ACTIVE_PROFILE_FILE = PROFILES_DIR / "_active.txt"


def slugify(name: str) -> str:
    return "".join(c if c.isalnum() or c in "_가-힣" else "_" for c in name)[:50]


# ============================================================
# 현재 사용자 이메일 (세션에서)
# ============================================================

def current_email() -> str:
    """현재 로그인된 이메일. 미로그인 시 빈 문자열."""
    try:
        import streamlit as st
        u = st.session_state.get("auth_user")
        return u.get("email", "") if u else ""
    except Exception:
        return ""


# ============================================================
# Supabase ↔ 프로필 dict 변환
# ============================================================

PROFILE_KEYS = [
    "name", "tagline", "career", "preferred_genres", "preferred_tone",
    "writing_style", "favorite_authors", "preferred_metaphor_systems",
    "personal_anti_patterns", "preferred_font", "preferred_targets",
    "default_export_format", "notes", "ip_count",
    "created_at", "last_used", "last_modified", "is_active",
    "auth_email",  # 한 메일에 여러 작가 가능
    "skill_md",    # 작가 노하우 MD (시스템 프롬프트에 포함)
]


def _row_to_profile(row: dict) -> dict:
    if not row:
        return None
    out = {k: row.get(k) for k in PROFILE_KEYS}
    out["preferred_genres"] = out.get("preferred_genres") or []
    out["preferred_metaphor_systems"] = out.get("preferred_metaphor_systems") or []
    out["personal_anti_patterns"] = out.get("personal_anti_patterns") or []
    out["preferred_targets"] = out.get("preferred_targets") or []
    out["preferred_formats"] = {}
    return out


def _profile_to_payload(profile: dict) -> dict:
    payload = {k: profile.get(k) for k in PROFILE_KEYS if k in profile}
    for tk in ("created_at", "last_used", "last_modified"):
        if payload.get(tk) == "":
            payload[tk] = None
    return payload


# ============================================================
# 프로필 CRUD — 모두 현재 이메일 기준 필터
# ============================================================

def list_profiles() -> list[dict]:
    """현재 로그인 이메일의 작가들만"""
    email = current_email()
    sb = db.get_client()
    if sb:
        q = sb.table("writers").select("*").order("last_used", desc=True, nullsfirst=False)
        if email:
            q = q.eq("auth_email", email)
        r = db.safe_call(lambda: q.execute())
        if r and r.data is not None:
            return [_row_to_profile(row) for row in r.data]

    # 파일 모드
    if not PROFILES_DIR.exists():
        return []
    profiles = []
    for p in PROFILES_DIR.glob("*.json"):
        if p.name.startswith("_"):
            continue
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            if email and data.get("auth_email") and data.get("auth_email") != email:
                continue
            profiles.append(data)
        except json.JSONDecodeError:
            continue
    profiles.sort(key=lambda x: x.get("last_used", ""), reverse=True)
    return profiles


def save_profile(profile: dict):
    """프로필 저장 (생성/업데이트). 현재 이메일 자동 연결."""
    profile["last_modified"] = datetime.now().isoformat()
    if not profile.get("auth_email"):
        profile["auth_email"] = current_email()

    sb = db.get_client()
    if sb:
        payload = _profile_to_payload(profile)
        # auth_email + name 복합 unique → 그 조합으로 upsert
        db.safe_call(
            lambda: sb.table("writers")
            .upsert(payload, on_conflict="auth_email,name")
            .execute()
        )
        return

    # 파일 모드
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    name = slugify(profile["name"])
    path = PROFILES_DIR / f"{name}.json"
    path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")


def load_profile(name: str, email: str = None) -> dict:
    """이름으로 프로필 로드. email 명시 안 하면 현재 로그인 이메일."""
    if not name:
        return None
    if email is None:
        email = current_email()

    sb = db.get_client()
    if sb:
        q = sb.table("writers").select("*").eq("name", name)
        if email:
            q = q.eq("auth_email", email)
        r = db.safe_call(lambda: q.limit(1).execute())
        if r and r.data:
            return _row_to_profile(r.data[0])

    # 파일 모드
    path = PROFILES_DIR / f"{slugify(name)}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def delete_profile(name: str) -> bool:
    """현재 이메일의 작가만 삭제"""
    email = current_email()
    sb = db.get_client()
    if sb:
        q = sb.table("writers").delete().eq("name", name)
        if email:
            q = q.eq("auth_email", email)
        db.safe_call(lambda: q.execute())
        return True

    path = PROFILES_DIR / f"{slugify(name)}.json"
    if path.exists():
        path.unlink()
        return True
    return False


# ============================================================
# 활성 작가 — 세션 기반 (DB의 is_active는 무시)
# ============================================================

def set_active(name: str):
    """활성 작가 설정 — 브라우저 세션에만 저장 (다른 사용자 영향 X)"""
    try:
        import streamlit as st
        st.session_state["active_writer_name"] = name
    except Exception:
        pass

    # last_used 갱신만 DB에
    sb = db.get_client()
    if sb:
        email = current_email()
        q = sb.table("writers").update({"last_used": datetime.now().isoformat()}).eq("name", name)
        if email:
            q = q.eq("auth_email", email)
        db.safe_call(lambda: q.execute())

    # 파일 모드 호환
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    ACTIVE_PROFILE_FILE.write_text(name, encoding="utf-8")


def get_active() -> dict:
    """현재 세션의 활성 작가"""
    try:
        import streamlit as st
        name = st.session_state.get("active_writer_name", "")
    except Exception:
        name = ""

    if name:
        p = load_profile(name)
        if p:
            return p

    # 세션에 없으면 — 현재 이메일의 첫 번째 작가 자동 활성화
    profiles = list_profiles()
    if profiles:
        first = profiles[0]
        set_active(first["name"])
        return first

    # 파일 모드 폴백
    if ACTIVE_PROFILE_FILE.exists():
        name = ACTIVE_PROFILE_FILE.read_text(encoding="utf-8").strip()
        if name:
            return load_profile(name)
    return None


def empty_profile() -> dict:
    """새 프로필 템플릿"""
    return {
        "name": "",
        "tagline": "",
        "career": "",
        "preferred_genres": [],
        "preferred_tone": "",
        "writing_style": "",
        "favorite_authors": "",
        "preferred_metaphor_systems": [],
        "personal_anti_patterns": [],
        "preferred_formats": {},
        "preferred_font": "Hahmlet",
        "preferred_targets": [],
        "default_export_format": "docx",
        "notes": "",
        "ip_count": 0,
        "created_at": datetime.now().isoformat(),
        "last_used": "",
        "auth_email": current_email(),
    }


def build_profile_context(profile: dict) -> str:
    """프로필을 system prompt 컨텍스트로."""
    if not profile:
        return ""

    parts = ["## 작가 프로필 (이 작업의 발주자)"]

    if profile.get("name"):
        parts.append(f"- **이름**: {profile['name']}")
    if profile.get("tagline"):
        parts.append(f"- **한 줄 소개**: {profile['tagline']}")
    if profile.get("career"):
        parts.append(f"- **경력**: {profile['career']}")
    if profile.get("preferred_genres"):
        parts.append(f"- **선호 장르**: {', '.join(profile['preferred_genres'])}")
    if profile.get("preferred_tone"):
        parts.append(f"- **선호 톤**: {profile['preferred_tone']}")
    if profile.get("writing_style"):
        parts.append(f"- **작가 스타일**: {profile['writing_style']}")
    if profile.get("favorite_authors"):
        parts.append(f"- **좋아하는 작가**: {profile['favorite_authors']}")
    if profile.get("preferred_metaphor_systems"):
        parts.append(f"- **비유 체계 (이 작가가 자주 쓰는)**: {', '.join(profile['preferred_metaphor_systems'])}")
    if profile.get("personal_anti_patterns"):
        parts.append("- **이 작가가 절대 안 쓰는 패턴**:")
        for p in profile["personal_anti_patterns"]:
            parts.append(f"  - {p}")
    if profile.get("preferred_targets"):
        parts.append(f"- **선호 타겟층**: {', '.join(profile['preferred_targets'])}")
    if profile.get("notes"):
        parts.append(f"- **추가 노트**:\n{profile['notes']}")

    parts.append("\n→ 이 작가의 스타일에 맞춰 작업해. 작가 톤 침범 X. 작가 안티패턴 절대 사용 X.")

    # 작가가 직접 작성한 학습 MD 자료 — 시스템 프롬프트 끝에 추가
    skill_md = (profile.get("skill_md") or "").strip()
    if skill_md:
        parts.append("\n## 작가 본인이 작성한 학습 자료 (MD)")
        parts.append("아래 내용은 이 작가가 직접 작성한 노하우/스타일 가이드. 모든 출력에 반영해.")
        parts.append("")
        parts.append(skill_md)

    return "\n".join(parts)
