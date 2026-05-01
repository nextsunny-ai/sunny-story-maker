"""작가 프로필 시스템 — 사용자별 어드민
각 작가가 자기 스타일/선호/노하우/작품 등록.
모든 모드에서 이 프로필이 자동으로 컨텍스트로 들어감."""

import json
from pathlib import Path
from datetime import datetime

PROFILES_DIR = Path("C:/SUNNY_Story_Maker/output/_profiles")
ACTIVE_PROFILE_FILE = PROFILES_DIR / "_active.txt"


def slugify(name: str) -> str:
    return "".join(c if c.isalnum() or c in "_가-힣" else "_" for c in name)[:50]


def list_profiles() -> list[dict]:
    """등록된 작가 프로필 모두"""
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
    """프로필 저장"""
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    name = slugify(profile["name"])
    profile["last_modified"] = datetime.now().isoformat()
    path = PROFILES_DIR / f"{name}.json"
    path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")


def load_profile(name: str) -> dict:
    """이름으로 프로필 로드"""
    path = PROFILES_DIR / f"{slugify(name)}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def delete_profile(name: str) -> bool:
    path = PROFILES_DIR / f"{slugify(name)}.json"
    if path.exists():
        path.unlink()
        return True
    return False


def set_active(name: str):
    """현재 활성 프로필 설정"""
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    ACTIVE_PROFILE_FILE.write_text(name, encoding="utf-8")
    # last_used 갱신
    p = load_profile(name)
    if p:
        p["last_used"] = datetime.now().isoformat()
        save_profile(p)


def get_active() -> dict:
    """현재 활성 프로필 — 없으면 None"""
    if not ACTIVE_PROFILE_FILE.exists():
        return None
    name = ACTIVE_PROFILE_FILE.read_text(encoding="utf-8").strip()
    return load_profile(name) if name else None


def empty_profile() -> dict:
    """새 프로필 템플릿 — 모든 필드 비어있음"""
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
    """프로필을 system prompt에 추가할 컨텍스트로 변환.
    소리에게 보낼 때 'who is the writer' 정보로 사용."""
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
