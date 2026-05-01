"""작품 저장 + 버전 관리 + Drive 동기화
영화/드라마 무한 각색 반복 지원."""

import json
import os
import shutil
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

OUTPUT_DIR = Path("C:/SUNNY_Story_Maker/output")
DRIVE_DIR = Path(os.getenv("DRIVE_OUTPUT_DIR", "G:/내 드라이브/SUNNY_TEAM/05_콘텐츠IP/시나리오"))


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
    idx["last_modified"] = datetime.now().isoformat()
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")


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

LIBRARY_DIR = Path("C:/SUNNY_Story_Maker/output/_library")


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
