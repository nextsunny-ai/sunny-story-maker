"""작품 저장 + 버전 관리 + Drive 동기화
영화/드라마 무한 각색 반복 지원.

Supabase 모드 (SUPABASE_URL + SUPABASE_KEY 설정 시):
  - 모든 데이터 영구 저장됨 (Cloud 재배포에도 안 날아감)
  - 작가별 격리 (RLS 트라이얼은 무 RLS, 한 달 후 잠금)

파일 모드 (Supabase 미설정):
  - output/<project>/ 로컬 저장 (기존 방식)
"""

import json
import os
import shutil
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

from . import db

load_dotenv()

# 프로젝트 루트 기준 (Cloud/로컬 호환)
_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = Path(os.getenv("STORY_MAKER_OUTPUT") or (_ROOT / "output"))
DRIVE_DIR = Path(os.getenv("DRIVE_OUTPUT_DIR") or "")  # 빈 값이면 동기화 X


def slugify(name: str) -> str:
    """파일명용 단순화"""
    return "".join(c if c.isalnum() or c in "_가-힣" else "_" for c in name)[:50]


def _now() -> str:
    """ISO 시간 문자열"""
    return datetime.now().isoformat()


# ============================================================
# Supabase 헬퍼 — 작가/프로젝트 ID 보장
# ============================================================

def _writer_name() -> str:
    """현재 활성 작가명 — 없으면 'guest'"""
    try:
        from . import profile as prof
        active = prof.get_active()
        return active["name"] if active else "guest"
    except Exception:
        return "guest"


def _ensure_project_row(project_name: str, writer_name: str = None, **fields):
    """Supabase에 프로젝트 행 보장 — 있으면 반환, 없으면 생성"""
    sb = db.get_client()
    if not sb:
        return None
    writer = writer_name or _writer_name()
    # 조회
    r = db.safe_call(
        lambda: sb.table("projects")
        .select("*")
        .eq("writer_name", writer)
        .eq("name", project_name)
        .limit(1)
        .execute()
    )
    if r and r.data:
        return r.data[0]
    # 생성
    payload = {"writer_name": writer, "name": project_name, **fields}
    r = db.safe_call(lambda: sb.table("projects").insert(payload).execute())
    return r.data[0] if r and r.data else None


def _touch_project(project_id: str):
    """프로젝트 last_modified 갱신"""
    sb = db.get_client()
    if not sb:
        return
    db.safe_call(
        lambda: sb.table("projects")
        .update({"last_modified": _now()})
        .eq("id", project_id)
        .execute()
    )


# ============================================================
# 프로젝트 폴더 (파일 모드)
# ============================================================

def project_dir(project_name: str, ensure: bool = True) -> Path:
    """프로젝트 폴더 — output/<프로젝트명>/ (파일 모드 + Drive 백업용)"""
    p = OUTPUT_DIR / slugify(project_name)
    if ensure:
        p.mkdir(parents=True, exist_ok=True)
        (p / "versions").mkdir(exist_ok=True)
    return p


# ============================================================
# 버전 저장 / 조회
# ============================================================

def save_version(
    project_name: str,
    body: str,
    metadata: dict = None,
    direction: str = "",
    parent_version: int = None,
) -> dict:
    """새 버전 저장. Supabase 우선, 파일 백업."""
    metadata = metadata or {}
    char_count = len(body)
    saved_at = _now()

    sb = db.get_client()
    if sb:
        proj = _ensure_project_row(
            project_name,
            genre=metadata.get("genre", ""),
            user_input=metadata.get("user_input", {}),
        )
        if proj:
            # 다음 버전 번호
            r = db.safe_call(
                lambda: sb.table("versions")
                .select("version")
                .eq("project_id", proj["id"])
                .order("version", desc=True)
                .limit(1)
                .execute()
            )
            next_v = (r.data[0]["version"] + 1) if (r and r.data) else 1

            payload = {
                "project_id": proj["id"],
                "version": next_v,
                "body": body,
                "metadata": metadata,
                "direction": direction,
                "parent_version": parent_version,
                "char_count": char_count,
                "saved_at": saved_at,
            }
            db.safe_call(lambda: sb.table("versions").insert(payload).execute())
            _touch_project(proj["id"])

            return {
                "version": next_v,
                "saved_at": saved_at,
                "char_count": char_count,
                "direction": direction,
                "parent_version": parent_version,
                **metadata,
            }

    # 파일 모드 (또는 Supabase 실패 폴백)
    return _file_save_version(project_name, body, metadata, direction, parent_version)


def _file_save_version(project_name, body, metadata, direction, parent_version):
    p = project_dir(project_name)
    versions_dir = p / "versions"
    existing = list(versions_dir.glob("v*.txt"))
    if existing:
        nums = [int(f.stem[1:]) for f in existing if f.stem[1:].isdigit()]
        next_num = max(nums) + 1 if nums else 1
    else:
        next_num = 1

    body_path = versions_dir / f"v{next_num}.txt"
    body_path.write_text(body, encoding="utf-8")

    meta_path = versions_dir / f"v{next_num}.json"
    meta = {
        "version": next_num,
        "saved_at": _now(),
        "char_count": len(body),
        "direction": direction,
        "parent_version": parent_version,
        **(metadata or {}),
    }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    _update_index(project_name, meta)
    return meta


def list_versions(project_name: str) -> list[dict]:
    """프로젝트의 모든 버전 (최신순)"""
    sb = db.get_client()
    if sb:
        proj = _ensure_project_row(project_name)
        if proj:
            r = db.safe_call(
                lambda: sb.table("versions")
                .select("version,saved_at,direction,char_count,metadata")
                .eq("project_id", proj["id"])
                .order("version", desc=True)
                .execute()
            )
            if r and r.data is not None:
                return [
                    {
                        "version": row["version"],
                        "saved_at": row["saved_at"],
                        "direction": row.get("direction") or "",
                        "char_count": row.get("char_count") or 0,
                        **(row.get("metadata") or {}),
                    }
                    for row in r.data
                ]

    # 파일 모드
    p = project_dir(project_name, ensure=False)
    if not p.exists():
        return []
    versions_dir = p / "versions"
    if not versions_dir.exists():
        return []

    metas = []
    for meta_path in sorted(versions_dir.glob("v*.json"), reverse=True):
        try:
            metas.append(json.loads(meta_path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
    return metas


def load_version(project_name: str, version: int) -> str:
    """특정 버전 본문 로드"""
    sb = db.get_client()
    if sb:
        proj = _ensure_project_row(project_name)
        if proj:
            r = db.safe_call(
                lambda: sb.table("versions")
                .select("body")
                .eq("project_id", proj["id"])
                .eq("version", version)
                .limit(1)
                .execute()
            )
            if r and r.data:
                return r.data[0].get("body") or ""

    # 파일 모드
    p = project_dir(project_name, ensure=False)
    body_path = p / "versions" / f"v{version}.txt"
    if not body_path.exists():
        return ""
    return body_path.read_text(encoding="utf-8")


def latest_version(project_name: str) -> tuple[int, str]:
    """가장 최신 버전 번호 + 본문"""
    versions = list_versions(project_name)
    if not versions:
        return 0, ""
    latest = versions[0]["version"]
    return latest, load_version(project_name, latest)


# ============================================================
# 산출물 (Artifacts)
# ============================================================

ARTIFACT_TYPES = [
    {"key": "logline",     "name": "로그라인",     "order": 1, "ext": ".md"},
    {"key": "synopsis",    "name": "시놉시스",     "order": 2, "ext": ".md"},
    {"key": "treatment",   "name": "트리트먼트",   "order": 3, "ext": ".md"},
    {"key": "characters",  "name": "캐릭터시트",   "order": 4, "ext": ".md"},
    {"key": "worldview",   "name": "세계관",       "order": 5, "ext": ".md"},
    {"key": "episodes",    "name": "회차구성표",   "order": 6, "ext": ".md"},
    {"key": "proposal",    "name": "기획안",       "order": 7, "ext": ".md"},
    {"key": "script",      "name": "대본",         "order": 8, "ext": ".md"},
]


def artifacts_dir(project_name: str) -> Path:
    p = project_dir(project_name) / "artifacts"
    p.mkdir(exist_ok=True)
    return p


def save_artifact(project_name: str, artifact_key: str, body: str, metadata: dict = None) -> dict:
    """작품의 특정 산출물 저장. 같은 산출물 다시 저장하면 v2, v3로 누적."""
    artifact = next((a for a in ARTIFACT_TYPES if a["key"] == artifact_key), None)
    if not artifact:
        raise ValueError(f"Unknown artifact type: {artifact_key}")

    metadata = metadata or {}
    char_count = len(body)
    saved_at = _now()

    sb = db.get_client()
    if sb:
        proj = _ensure_project_row(
            project_name,
            genre=metadata.get("genre", ""),
            user_input=metadata.get("user_input", {}),
        )
        if proj:
            # 다음 버전
            r = db.safe_call(
                lambda: sb.table("artifacts")
                .select("artifact_version")
                .eq("project_id", proj["id"])
                .eq("artifact_key", artifact_key)
                .order("artifact_version", desc=True)
                .limit(1)
                .execute()
            )
            next_v = (r.data[0]["artifact_version"] + 1) if (r and r.data) else 1

            payload = {
                "project_id": proj["id"],
                "artifact_key": artifact_key,
                "body": body,
                "metadata": metadata,
                "artifact_version": next_v,
                "char_count": char_count,
                "saved_at": saved_at,
            }
            db.safe_call(lambda: sb.table("artifacts").insert(payload).execute())
            _touch_project(proj["id"])

            return {
                "type": artifact_key,
                "name": artifact["name"],
                "version": next_v,
                "saved_at": saved_at,
                "char_count": char_count,
                **metadata,
            }

    # 파일 모드
    a_dir = artifacts_dir(project_name)
    base_name = f"{artifact['order']:02d}_{artifact['key']}"
    existing = list(a_dir.glob(f"{base_name}_v*.md"))
    if existing:
        nums = [int(f.stem.split("_v")[-1]) for f in existing if f.stem.split("_v")[-1].isdigit()]
        next_v = max(nums) + 1 if nums else 1
    else:
        next_v = 1

    body_path = a_dir / f"{base_name}_v{next_v}.md"
    body_path.write_text(body, encoding="utf-8")
    meta_path = a_dir / f"{base_name}_v{next_v}.json"
    meta = {
        "type": artifact_key,
        "name": artifact["name"],
        "version": next_v,
        "saved_at": saved_at,
        "char_count": char_count,
        **(metadata or {}),
    }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def load_artifact(project_name: str, artifact_key: str, version: int = None) -> tuple[str, dict]:
    """산출물 로드. version 미지정 시 최신."""
    artifact = next((a for a in ARTIFACT_TYPES if a["key"] == artifact_key), None)
    if not artifact:
        return "", {}

    sb = db.get_client()
    if sb:
        proj = _ensure_project_row(project_name)
        if proj:
            q = (
                sb.table("artifacts")
                .select("body,metadata,artifact_version,saved_at,char_count")
                .eq("project_id", proj["id"])
                .eq("artifact_key", artifact_key)
            )
            if version is not None:
                q = q.eq("artifact_version", version)
            else:
                q = q.order("artifact_version", desc=True).limit(1)
            r = db.safe_call(lambda: q.execute())
            if r and r.data:
                row = r.data[0]
                meta = {
                    "type": artifact_key,
                    "name": artifact["name"],
                    "version": row["artifact_version"],
                    "saved_at": row["saved_at"],
                    "char_count": row.get("char_count", 0),
                    **(row.get("metadata") or {}),
                }
                return row.get("body") or "", meta

    # 파일 모드
    a_dir = artifacts_dir(project_name)
    base_name = f"{artifact['order']:02d}_{artifact['key']}"

    if version is None:
        existing = list(a_dir.glob(f"{base_name}_v*.md"))
        if not existing:
            return "", {}
        nums = [int(f.stem.split("_v")[-1]) for f in existing if f.stem.split("_v")[-1].isdigit()]
        if not nums:
            return "", {}
        version = max(nums)

    body_path = a_dir / f"{base_name}_v{version}.md"
    meta_path = a_dir / f"{base_name}_v{version}.json"
    body = body_path.read_text(encoding="utf-8") if body_path.exists() else ""
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    return body, meta


def list_artifacts(project_name: str) -> dict:
    """작품의 산출물 현황"""
    sb = db.get_client()
    if sb:
        proj = _ensure_project_row(project_name)
        if proj:
            r = db.safe_call(
                lambda: sb.table("artifacts")
                .select("artifact_key,artifact_version,char_count,saved_at")
                .eq("project_id", proj["id"])
                .execute()
            )
            by_key = {}
            if r and r.data:
                for row in r.data:
                    k = row["artifact_key"]
                    if k not in by_key or row["artifact_version"] > by_key[k]["artifact_version"]:
                        by_key[k] = row

            result = {}
            for artifact in ARTIFACT_TYPES:
                k = artifact["key"]
                if k in by_key:
                    row = by_key[k]
                    result[k] = {
                        "has": True,
                        "name": artifact["name"],
                        "order": artifact["order"],
                        "latest_version": row["artifact_version"],
                        "char_count": row.get("char_count", 0),
                        "saved_at": row.get("saved_at", ""),
                    }
                else:
                    result[k] = {
                        "has": False,
                        "name": artifact["name"],
                        "order": artifact["order"],
                    }
            return result

    # 파일 모드
    a_dir = artifacts_dir(project_name)
    result = {}
    for artifact in ARTIFACT_TYPES:
        base_name = f"{artifact['order']:02d}_{artifact['key']}"
        existing = list(a_dir.glob(f"{base_name}_v*.md"))
        if existing:
            nums = [int(f.stem.split("_v")[-1]) for f in existing if f.stem.split("_v")[-1].isdigit()]
            latest_v = max(nums) if nums else 0
            body, meta = load_artifact(project_name, artifact["key"], latest_v)
            result[artifact["key"]] = {
                "has": True,
                "name": artifact["name"],
                "order": artifact["order"],
                "latest_version": latest_v,
                "char_count": meta.get("char_count", len(body)),
                "saved_at": meta.get("saved_at", ""),
            }
        else:
            result[artifact["key"]] = {
                "has": False,
                "name": artifact["name"],
                "order": artifact["order"],
            }
    return result


# ============================================================
# 채팅 (보조작가 대화)
# ============================================================

def _chat_path(project_name: str = "", writer_name: str = "") -> Path:
    """파일 모드 채팅 경로"""
    w = slugify(writer_name) if writer_name else "guest"
    if project_name and project_name != "(없음)":
        d = project_dir(project_name)
        return d / f"chat__{w}.json"
    base = OUTPUT_DIR / "_chat"
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{w}.json"


def load_chat_log(project_name: str = "", writer_name: str = "") -> list:
    """채팅 메시지 불러오기 (작가별 분리)"""
    sb = db.get_client()
    if sb:
        w = writer_name or "guest"
        proj_name = project_name if (project_name and project_name != "(없음)") else ""
        r = db.safe_call(
            lambda: sb.table("chat_messages")
            .select("role,content,ts")
            .eq("writer_name", w)
            .eq("project_name", proj_name)
            .order("ts", desc=False)
            .execute()
        )
        if r and r.data is not None:
            return [
                {"role": row["role"], "content": row["content"], "ts": row["ts"]}
                for row in r.data
            ]

    # 파일 모드
    fp = _chat_path(project_name, writer_name)
    if not fp.exists():
        return []
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def save_chat_log(messages: list, project_name: str = "", writer_name: str = "") -> None:
    """채팅 메시지 전체 저장 — Supabase 모드는 race 방지 위해 ts 기준 incremental insert만 (delete X)"""
    sb = db.get_client()
    if sb:
        w = writer_name or "guest"
        proj_name = project_name if (project_name and project_name != "(없음)") else ""
        # 이미 저장된 ts 집합 조회 → 신규 메시지만 insert (race 방지)
        r = db.safe_call(
            lambda: sb.table("chat_messages")
            .select("ts")
            .eq("writer_name", w)
            .eq("project_name", proj_name)
            .execute()
        )
        existing_ts = {row["ts"] for row in (r.data if r and r.data else [])}
        new_payload = [
            {
                "writer_name": w,
                "project_name": proj_name,
                "role": m.get("role", "user"),
                "content": m.get("content", ""),
                "ts": m.get("ts", _now()),
            }
            for m in messages
            if m.get("ts") and m["ts"] not in existing_ts
        ]
        if new_payload:
            db.safe_call(lambda: sb.table("chat_messages").insert(new_payload).execute())
        return

    # 파일 모드
    fp = _chat_path(project_name, writer_name)
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8")


def append_chat_message(message: dict, project_name: str = "", writer_name: str = "") -> None:
    """메시지 한 개 추가"""
    sb = db.get_client()
    if sb:
        w = writer_name or "guest"
        proj_name = project_name if (project_name and project_name != "(없음)") else ""
        payload = {
            "writer_name": w,
            "project_name": proj_name,
            "role": message.get("role", "user"),
            "content": message.get("content", ""),
            "ts": message.get("ts", _now()),
        }
        db.safe_call(lambda: sb.table("chat_messages").insert(payload).execute())
        return

    msgs = load_chat_log(project_name, writer_name)
    msgs.append(message)
    save_chat_log(msgs, project_name, writer_name)


# ============================================================
# 프로젝트 목록 + 활성 매체
# ============================================================

def active_letters() -> set:
    """작업이 진행된 매체 letter 집합"""
    sb = db.get_client()
    if sb:
        r = db.safe_call(
            lambda: sb.table("projects").select("genre").execute()
        )
        if r and r.data is not None:
            letters = {row["genre"] for row in r.data if row.get("genre")}
            return letters

    # 파일 모드
    if not OUTPUT_DIR.exists():
        return set()
    letters = set()
    for p in OUTPUT_DIR.iterdir():
        if not p.is_dir():
            continue
        idx_path = p / "index.json"
        if not idx_path.exists():
            continue
        try:
            idx = json.loads(idx_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        g = idx.get("genre")
        if g:
            letters.add(g)
            continue
        vdir = p / "versions"
        if not vdir.exists():
            continue
        for jf in sorted(vdir.glob("v*.json"), reverse=True):
            try:
                vm = json.loads(jf.read_text(encoding="utf-8"))
                if vm.get("genre"):
                    letters.add(vm["genre"])
                    break
            except json.JSONDecodeError:
                continue
    return letters


def list_projects() -> list[dict]:
    """모든 프로젝트 (최근 수정순). N+1 회피 — 버전 수는 단일 쿼리로 일괄 조회."""
    sb = db.get_client()
    if sb:
        writer = _writer_name()
        # 1) 작가 본인 프로젝트만 (다른 작가 작품 섞이지 않게)
        r = db.safe_call(
            lambda: sb.table("projects")
            .select("id,name,last_modified")
            .eq("writer_name", writer)
            .order("last_modified", desc=True)
            .execute()
        )
        if r and r.data is not None:
            project_ids = [row["id"] for row in r.data]
            counts = {}
            if project_ids:
                # 2) 모든 버전을 한 번에 받아 Python에서 카운트 — N+1 → 2쿼리
                vc_r = db.safe_call(
                    lambda: sb.table("versions")
                    .select("project_id")
                    .in_("project_id", project_ids)
                    .execute()
                )
                if vc_r and vc_r.data:
                    for v in vc_r.data:
                        pid = v.get("project_id")
                        if pid:
                            counts[pid] = counts.get(pid, 0) + 1
            return [
                {
                    "name": row["name"],
                    "path": "",
                    "version_count": counts.get(row["id"], 0),
                    "last_modified": row.get("last_modified", ""),
                }
                for row in r.data
            ]

    # 파일 모드
    if not OUTPUT_DIR.exists():
        return []

    projects = []
    for p in OUTPUT_DIR.iterdir():
        if not p.is_dir():
            continue
        idx_path = p / "index.json"
        if idx_path.exists():
            try:
                idx = json.loads(idx_path.read_text(encoding="utf-8"))
                projects.append({
                    "name": idx.get("project", p.name),
                    "path": str(p),
                    "version_count": len(idx.get("versions", [])),
                    "last_modified": idx.get("last_modified", ""),
                })
            except json.JSONDecodeError:
                continue

    projects.sort(key=lambda x: x["last_modified"], reverse=True)
    return projects


def sync_to_drive(project_name: str) -> bool:
    """프로젝트를 Google Drive로 동기화 (파일 모드 한정)"""
    src = project_dir(project_name, ensure=False)
    if not src.exists():
        return False
    if not DRIVE_DIR.exists():
        return False
    dst = DRIVE_DIR / "Story_Maker_Works" / slugify(project_name)
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    return True


def diff_versions(project_name: str, v1: int, v2: int) -> dict:
    """두 버전 비교"""
    body1 = load_version(project_name, v1)
    body2 = load_version(project_name, v2)
    return {
        "v1": v1,
        "v2": v2,
        "v1_chars": len(body1),
        "v2_chars": len(body2),
        "diff_chars": len(body2) - len(body1),
        "v1_lines": body1.count("\n") + 1,
        "v2_lines": body2.count("\n") + 1,
        "body1": body1,
        "body2": body2,
    }


def _update_index(project_name: str, version_meta: dict):
    """파일 모드 인덱스 갱신"""
    p = project_dir(project_name)
    idx_path = p / "index.json"
    idx = {"project": project_name, "versions": []}
    if idx_path.exists():
        try:
            idx = json.loads(idx_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    idx["versions"].append({
        "version": version_meta["version"],
        "saved_at": version_meta["saved_at"],
        "direction": version_meta.get("direction", ""),
        "char_count": version_meta.get("char_count", 0),
    })
    if version_meta.get("genre") and not idx.get("genre"):
        idx["genre"] = version_meta["genre"]
    idx["last_modified"] = _now()
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")


# ============================================================
# IP 라이브러리 (파일 모드만 — 차후 Supabase 추가)
# ============================================================

LIBRARY_DIR = OUTPUT_DIR / "_library"


def save_ip(ip_data: dict):
    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    ip_path = LIBRARY_DIR / f"{slugify(ip_data['name'])}.json"
    ip_path.write_text(json.dumps(ip_data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_ip(ip_name: str) -> dict:
    ip_path = LIBRARY_DIR / f"{slugify(ip_name)}.json"
    if not ip_path.exists():
        return None
    return json.loads(ip_path.read_text(encoding="utf-8"))


def list_ips() -> list[dict]:
    if not LIBRARY_DIR.exists():
        return []
    ips = []
    for p in LIBRARY_DIR.glob("*.json"):
        try:
            ips.append(json.loads(p.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue
    return ips
