"""학습 시스템 — 작가가 쓰면서 노하우 누적
- 작가가 좋아한 패턴 / 반려한 패턴 자동 기록
- 자주 받는 디렉션 학습
- 다음 작업 시 자동 컨텍스트로 반영
- Supabase 우선, 파일 폴백
"""

import json
import os
from pathlib import Path
from datetime import datetime
from modules import profile as prof
from modules import db

_ROOT = Path(__file__).resolve().parent.parent
LEARNING_DIR = Path(os.getenv("STORY_MAKER_OUTPUT") or (_ROOT / "output")) / "_learning"


def lessons_path(profile_name: str) -> Path:
    LEARNING_DIR.mkdir(parents=True, exist_ok=True)
    return LEARNING_DIR / f"{prof.slugify(profile_name)}.json"


def _empty_lessons() -> dict:
    return {
        "loved": [],
        "rejected": [],
        "directions": [],
        "metaphors": [],
        "stats": {
            "total_works": 0,
            "total_versions": 0,
            "total_reviews": 0,
            "total_adaptations": 0,
        },
    }


def load_lessons(profile_name: str) -> dict:
    """누적 학습 로드 — Supabase 우선"""
    sb = db.get_client()
    if sb:
        result = _empty_lessons()
        # learning_lessons 테이블에서 조회 (loved/rejected/direction)
        for kind in ("loved", "rejected", "direction"):
            r = db.safe_call(
                lambda k=kind: sb.table("learning_lessons")
                .select("content,context,created_at")
                .eq("writer_name", profile_name)
                .eq("kind", k)
                .order("created_at", desc=False)
                .execute()
            )
            if r and r.data:
                # 'direction' → 'directions' 매핑
                key = "directions" if kind == "direction" else kind
                result[key] = [
                    {
                        "content": row["content"],
                        "context": row.get("context") or {},
                        "added_at": row["created_at"],
                    }
                    for row in r.data
                ]
        return result

    # 파일 모드
    p = lessons_path(profile_name)
    if not p.exists():
        return _empty_lessons()
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return _empty_lessons()


def save_lessons(profile_name: str, lessons: dict):
    """파일 모드 저장 (Supabase는 add_lesson 단위로 직접 insert)"""
    p = lessons_path(profile_name)
    lessons["last_modified"] = datetime.now().isoformat()
    p.write_text(json.dumps(lessons, ensure_ascii=False, indent=2), encoding="utf-8")


def add_lesson(profile_name: str, kind: str, content: str, context: dict = None):
    """학습 1건 추가.
    kind: 'loved' | 'rejected' | 'directions' | 'metaphors'"""
    if not profile_name:
        return

    sb = db.get_client()
    if sb:
        # directions/metaphors는 DB 레벨에선 'direction'으로 통합 (테이블 check 제약)
        # metaphors는 별도 종류로 두고 싶으면 schema 수정 필요. 일단 direction으로 매핑.
        db_kind = "direction" if kind in ("directions", "metaphors") else kind
        if db_kind not in ("loved", "rejected", "direction"):
            return  # 알 수 없는 kind
        payload = {
            "writer_name": profile_name,
            "kind": db_kind,
            "content": content,
            "context": context or {},
        }
        db.safe_call(lambda: sb.table("learning_lessons").insert(payload).execute())
        return

    # 파일 모드
    lessons = load_lessons(profile_name)
    if kind not in lessons:
        lessons[kind] = []
    lessons[kind].append({
        "content": content,
        "context": context or {},
        "added_at": datetime.now().isoformat(),
    })
    if len(lessons[kind]) > 50:
        lessons[kind] = lessons[kind][-50:]
    save_lessons(profile_name, lessons)


def increment_stat(profile_name: str, stat_key: str, by: int = 1):
    """통계 카운터 — 파일 모드 한정 (Supabase는 별도 stats 테이블 필요)"""
    if not profile_name:
        return
    # 일단 파일에 누적
    lessons = load_lessons(profile_name)
    lessons.setdefault("stats", {})
    lessons["stats"][stat_key] = lessons["stats"].get(stat_key, 0) + by
    save_lessons(profile_name, lessons)


def build_lessons_context(profile_name: str) -> str:
    """누적 학습을 system prompt 컨텍스트로 변환."""
    if not profile_name:
        return ""
    lessons = load_lessons(profile_name)

    parts = []
    if lessons.get("loved"):
        parts.append("## 이 작가가 좋아한 패턴 (재현 권장)")
        for item in lessons["loved"][-10:]:
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
