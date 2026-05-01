"""작품 저장 + 버전 관리 + Drive 동기화
영화/드라마 무한 각색 반복 지원."""

import json
import os
import shutil
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# 프로젝트 루트 기준 (Cloud/로컬 호환)
_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = Path(os.getenv("STORY_MAKER_OUTPUT") or (_ROOT / "output"))
DRIVE_DIR = Path(os.getenv("DRIVE_OUTPUT_DIR") or "")  # 빈 값이면 동기화 X


def slugify(name: str) -> str:
    """파일명용 단순화"""
    return "".join(c if c.isalnum() or c in "_가-힣" else "_" for c in name)[:50]


def project_dir(project_name: str, ensure: bool = True) -> Path:
    """프로젝트 폴더 — output/<프로젝트명>/"""
    p = OUTPUT_DIR / slugify(project_name)
    if ensure:
        p.mkdir(parents=True, exist_ok=True)
        (p / "versions").mkdir(exist_ok=True)
    return p


def save_version(
    project_name: str,
    body: str,
    metadata: dict = None,
    direction: str = "",
    parent_version: int = None,
) -> dict:
    """새 버전 저장. 자동 증가. 무한 반복 가능.
    Returns: 저장된 버전 정보 dict."""
    p = project_dir(project_name)
    versions_dir = p / "versions"

    # 다음 버전 번호 자동 계산
    existing = list(versions_dir.glob("v*.txt"))
    if existing:
        nums = [int(f.stem[1:]) for f in existing if f.stem[1:].isdigit()]
        next_num = max(nums) + 1 if nums else 1
    else:
        next_num = 1

    # 본문 저장
    body_path = versions_dir / f"v{next_num}.txt"
    body_path.write_text(body, encoding="utf-8")

    # 메타데이터
    meta_path = versions_dir / f"v{next_num}.json"
    meta = {
        "version": next_num,
        "saved_at": datetime.now().isoformat(),
        "char_count": len(body),
        "direction": direction,
        "parent_version": parent_version,
        **(metadata or {}),
    }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    # 인덱스 갱신
    _update_index(project_name, meta)

    return meta


def list_versions(project_name: str) -> list[dict]:
    """프로젝트의 모든 버전 (최신순)"""
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
# 산출물 (Artifacts) — 작품별 다중 산출물 관리
# 로그라인 / 시놉시스 / 트리트먼트 / 캐릭터시트 / 세계관 / 회차구성 / 기획안 / 대본
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

    a_dir = artifacts_dir(project_name)
    base_name = f"{artifact['order']:02d}_{artifact['key']}"

    # 기존 버전 확인
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
        "saved_at": datetime.now().isoformat(),
        "char_count": len(body),
        **(metadata or {}),
    }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def load_artifact(project_name: str, artifact_key: str, version: int = None) -> tuple[str, dict]:
    """산출물 로드. version 미지정 시 최신."""
    artifact = next((a for a in ARTIFACT_TYPES if a["key"] == artifact_key), None)
    if not artifact:
        return "", {}

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
    """작품의 산출물 현황 — {type_key: {has, latest_version, char_count}}"""
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


def _update_index(project_name: str, version_meta: dict):
    """프로젝트 인덱스 — 모든 버전 한 눈에"""
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
    idx["last_modified"] = datetime.now().isoformat()
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")


def _chat_path(project_name: str = "", writer_name: str = "") -> Path:
    """채팅 로그 경로 — 작가별 + 프로젝트별 분리.
    - 프로젝트 지정: output/<project>/chat__<writer>.json
    - 프로젝트 없음: output/_chat/<writer>.json
    writer_name 비면 'guest'로 묶음.
    """
    w = slugify(writer_name) if writer_name else "guest"
    if project_name and project_name != "(없음)":
        d = project_dir(project_name)
        return d / f"chat__{w}.json"
    base = OUTPUT_DIR / "_chat"
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{w}.json"


def load_chat_log(project_name: str = "", writer_name: str = "") -> list:
    """채팅 메시지 불러오기 (없으면 빈 리스트) — 작가별 분리"""
    fp = _chat_path(project_name, writer_name)
    if not fp.exists():
        return []
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def save_chat_log(messages: list, project_name: str = "", writer_name: str = "") -> None:
    """채팅 메시지 전체 저장 — 작가별 분리"""
    fp = _chat_path(project_name, writer_name)
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8")


def append_chat_message(message: dict, project_name: str = "", writer_name: str = "") -> None:
    """메시지 한 개 추가 — 매 발화마다 호출"""
    msgs = load_chat_log(project_name, writer_name)
    msgs.append(message)
    save_chat_log(msgs, project_name, writer_name)


def active_letters() -> set:
    """작업이 진행된 매체 letter 집합 — 홈 카드 강조용"""
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
        # fallback: 가장 최근 버전 메타에서 추출
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
    """모든 프로젝트 (최근 수정순)"""
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
    """프로젝트를 Google Drive로 동기화"""
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
    """두 버전 비교 — 작가가 무한 반복할 때 변경 추적용"""
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


# ============ IP 라이브러리 (4사 IP + 신규) ============

LIBRARY_DIR = OUTPUT_DIR / "_library"


def save_ip(ip_data: dict):
    """IP 시트 저장 (캐릭터/세계관)"""
    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    ip_path = LIBRARY_DIR / f"{slugify(ip_data['name'])}.json"
    ip_path.write_text(json.dumps(ip_data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_ip(ip_name: str) -> dict:
    ip_path = LIBRARY_DIR / f"{slugify(ip_name)}.json"
    if not ip_path.exists():
        return None
    return json.loads(ip_path.read_text(encoding="utf-8"))


def list_ips() -> list[dict]:
    """등록된 IP 모두 — 사용자가 라이브러리에서 직접 등록"""
    if not LIBRARY_DIR.exists():
        return []

    ips = []
    for p in LIBRARY_DIR.glob("*.json"):
        try:
            ips.append(json.loads(p.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue

    return ips
