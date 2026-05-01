"""학습 시스템 — 작가가 쓰면서 노하우 누적
- 작가가 좋아한 패턴 / 반려한 패턴 자동 기록
- 자주 받는 디렉션 학습
- 다음 작업 시 자동 컨텍스트로 반영"""

import json
from pathlib import Path
from datetime import datetime
from modules import profile as prof

LEARNING_DIR = Path("C:/SUNNY_Story_Maker/output/_learning")


def lessons_path(profile_name: str) -> Path:
    LEARNING_DIR.mkdir(parents=True, exist_ok=True)
    return LEARNING_DIR / f"{prof.slugify(profile_name)}.json"


def load_lessons(profile_name: str) -> dict:
    p = lessons_path(profile_name)
    if not p.exists():
        return {
            "loved": [],     # 작가가 칭찬한 패턴
            "rejected": [],  # 작가가 반려한 패턴
            "directions": [],  # 자주 받는 수정 디렉션
            "metaphors": [],   # 작가가 좋아한 비유
            "stats": {
                "total_works": 0,
                "total_versions": 0,
                "total_reviews": 0,
                "total_adaptations": 0,
            },
        }
    return json.loads(p.read_text(encoding="utf-8"))


def save_lessons(profile_name: str, lessons: dict):
    p = lessons_path(profile_name)
    lessons["last_modified"] = datetime.now().isoformat()
    p.write_text(json.dumps(lessons, ensure_ascii=False, indent=2), encoding="utf-8")


def add_lesson(profile_name: str, kind: str, content: str, context: dict = None):
    """학습 1건 추가.
    kind: 'loved' | 'rejected' | 'directions' | 'metaphors'"""
    if not profile_name:
        return
    lessons = load_lessons(profile_name)
    if kind not in lessons:
        lessons[kind] = []
    lessons[kind].append({
        "content": content,
        "context": context or {},
        "added_at": datetime.now().isoformat(),
    })
    # 너무 많아지면 최근 50개만 유지
    if len(lessons[kind]) > 50:
        lessons[kind] = lessons[kind][-50:]
    save_lessons(profile_name, lessons)


def increment_stat(profile_name: str, stat_key: str, by: int = 1):
    if not profile_name:
        return
    lessons = load_lessons(profile_name)
    lessons.setdefault("stats", {})
    lessons["stats"][stat_key] = lessons["stats"].get(stat_key, 0) + by
    save_lessons(profile_name, lessons)


def build_lessons_context(profile_name: str) -> str:
    """누적 학습을 system prompt 컨텍스트로 변환.
    소리에게 보낼 때 '이 작가의 누적 노하우' 정보로 사용."""
    if not profile_name:
        return ""
    lessons = load_lessons(profile_name)

    parts = []
    if lessons.get("loved"):
        parts.append("## 이 작가가 좋아한 패턴 (재현 권장)")
        for item in lessons["loved"][-10:]:  # 최근 10개
            parts.append(f"- {item['content']}")

    if lessons.get("rejected"):
        parts.append("\n## 이 작가가 반려한 패턴 (회피 필수)")
        for item in lessons["rejected"][-10:]:
            parts.append(f"- {item['content']}")

    if lessons.get("metaphors"):
        parts.append("\n## 이 작가가 자주 쓴 비유 체계")
        recent = list({m["content"] for m in lessons["metaphors"][-15:]})
        for m in recent:
            parts.append(f"- {m}")

    if lessons.get("directions"):
        parts.append("\n## 이 작가의 수정 디렉션 패턴 (자주 요구하는 방향)")
        for item in lessons["directions"][-10:]:
            parts.append(f"- {item['content']}")

    if not parts:
        return ""
    return "\n".join(parts) + "\n\n→ 위 누적 학습을 모든 출력에 반영해."


def get_summary(profile_name: str) -> dict:
    """프로필별 학습 요약 (어드민 화면용)"""
    if not profile_name:
        return {}
    lessons = load_lessons(profile_name)
    return {
        "loved_count": len(lessons.get("loved", [])),
        "rejected_count": len(lessons.get("rejected", [])),
        "directions_count": len(lessons.get("directions", [])),
        "metaphors_count": len(lessons.get("metaphors", [])),
        "stats": lessons.get("stats", {}),
        "last_modified": lessons.get("last_modified", ""),
    }
