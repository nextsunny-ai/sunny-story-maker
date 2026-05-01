"""작가 프로필 시스템 — Supabase + 파일 폴백
모든 모드에서 이 프로필이 자동으로 컨텍스트로 들어감."""

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
# Supabase ↔ 프로필 dict 변환
# ============================================================

PROFILE_KEYS = [
    "name", "tagline", "career", "preferred_genres", "preferred_tone",
    "writing_style", "favorite_authors", "preferred_metaphor_systems",
    "personal_anti_patterns", "preferred_font", "preferred_targets",
    "default_export_format", "notes", "ip_count",
    "created_at", "last_used", "last_modified", "is_active",
]


def _row_to_profile(row: dict) -> dict:
    """Supabase 행 → 프로필 dict (기본값 채움)"""
    if not row:
        return None
    out = {k: row.get(k) for k in PROFILE_KEYS}
    out["preferred_genres"] = out.get("preferred_genres") or []
    out["preferred_metaphor_systems"] = out.get("preferred_metaphor_systems") or []
    out["personal_anti_patterns"] = out.get("personal_anti_patterns") or []
    out["preferred_targets"] = out.get("preferred_targets") or []
    out["preferred_formats"] = {}  # legacy 호환
    return out


def _profile_to_payload(profile: dict) -> dict:
    """프로필 dict → Supabase 페이로드"""
    payload = {k: profile.get(k) for k in PROFILE_KEYS if k in profile}
    # 시간 필드 정리
    for tk in ("created_at", "last_used", "last_modified"):
        if payload.get(tk) == "":
            payload[tk] = None
    return payload


# ============================================================
# 프로필 CRUD
# ============================================================

def list_profiles() -> list[dict]:
    """등록된 작가 프로필 모두"""
    sb = db.get_client()
    if sb:
        r = db.safe_call(
            lambda: sb.table("writers")
            .select("*")
            .order("last_used", desc=True, nullsfirst=False)
            .execute()
        )
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
            profiles.append(json.loads(p.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue
    profiles.sort(key=lambda x: x.get("last_used", ""), reverse=True)
    return profiles


def save_profile(profile: dict):
    """프로필 저장 (생성/업데이트)"""
    profile["last_modified"] = datetime.now().isoformat()

    sb = db.get_client()
    if sb:
        payload = _profile_to_payload(profile)
        # upsert by name
        db.safe_call(
            lambda: sb.table("writers").upsert(payload, on_conflict="name").execute()
        )
        return

    # 파일 모드
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    name = slugify(profile["name"])
    path = PROFILES_DIR / f"{name}.json"
    path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")


def load_profile(name: str) -> dict:
    """이름으로 프로필 로드"""
    if not name:
        return None

    sb = db.get_client()
    if sb:
        r = db.safe_call(
            lambda: sb.table("writers").select("*").eq("name", name).limit(1).execute()
        )
        if r and r.data:
            return _row_to_profile(r.data[0])

    # 파일 모드
    path = PROFILES_DIR / f"{slugify(name)}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def delete_profile(name: str) -> bool:
    sb = db.get_client()
    if sb:
        db.safe_call(lambda: sb.table("writers").delete().eq("name", name).execute())
        return True

    # 파일 모드
    path = PROFILES_DIR / f"{slugify(name)}.json"
    if path.exists():
        path.unlink()
        return True
    return False


def set_active(name: str):
    """현재 활성 프로필 설정"""
    sb = db.get_client()
    if sb:
        # 모든 작가 비활성화 후 해당만 활성화 + last_used 갱신
        db.safe_call(
            lambda: sb.table("writers").update({"is_active": False}).neq("name", "").execute()
        )
        db.safe_call(
            lambda: sb.table("writers")
            .update({
                "is_active": True,
                "last_used": datetime.now().isoformat(),
            })
            .eq("name", name)
            .execute()
        )

    # 파일 모드 (병행 — 같은 PC에서 활성 프로필 빠르게 알기 위해)
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    ACTIVE_PROFILE_FILE.write_text(name, encoding="utf-8")
    p = load_profile(name)
    if p and not sb:  # Supabase 모드면 위에서 갱신함, 파일 모드만 추가 갱신
        p["last_used"] = datetime.now().isoformat()
        save_profile(p)


def get_active() -> dict:
    """현재 활성 프로필"""
    sb = db.get_client()
    if sb:
        r = db.safe_call(
            lambda: sb.table("writers")
            .select("*")
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        if r and r.data:
            return _row_to_profile(r.data[0])

    # 파일 모드
    if not ACTIVE_PROFILE_FILE.exists():
        return None
    name = ACTIVE_PROFILE_FILE.read_text(encoding="utf-8").strip()
    return load_profile(name) if name else None


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
    }


def build_profile_context(profile: dict) -> str:
    """프로필을 system prompt에 추가할 컨텍스트로 변환."""
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
    return "\n".join(parts)
