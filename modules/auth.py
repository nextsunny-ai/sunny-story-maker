"""인증 자동 감지 — 작가에게는 보이지 않게 처리
우선순위:
1. Claude Code CLI 감지 (Pro/Max 구독자 — API 키 X)
2. ANTHROPIC_API_KEY 환경변수
3. 둘 다 없으면 안내

작가에게는 단순히 '✓ 사용 가능' / '⚠ 로그인 필요' 두 가지만 보임.
'API', 'CLI', '키' 같은 용어 노출 X."""

import os
import shutil
import subprocess
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _find_claude_executable() -> str:
    """Claude Code CLI 실행파일 찾기 — Windows의 .cmd/.ps1까지 포함"""
    # 1. 일반 PATH 검색
    for cmd_name in ("claude", "claude.cmd", "claude.exe"):
        found = shutil.which(cmd_name)
        if found:
            return found

    # 2. Windows npm 글로벌 경로 직접 검색
    if os.name == "nt":
        appdata = os.environ.get("APPDATA", "")
        if appdata:
            for ext in (".cmd", ".exe", ".ps1"):
                candidate = Path(appdata) / "npm" / f"claude{ext}"
                if candidate.exists():
                    return str(candidate)
    return ""


def detect_claude_code() -> bool:
    """Claude Code CLI가 설치되어 있는지 (Pro/Max 구독자에게 권장 경로)"""
    exe = _find_claude_executable()
    if not exe:
        return False
    try:
        if exe.endswith(".ps1"):
            args = ["powershell", "-NoProfile", "-NonInteractive",
                    "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
                    "-File", exe, "--version"]
        else:
            args = [exe, "--version"]

        kwargs = {}
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = subprocess.SW_HIDE
            kwargs["startupinfo"] = si

        result = subprocess.run(
            args, capture_output=True, text=True, timeout=8, shell=False, **kwargs,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return False


def has_api_key() -> bool:
    """API 키 환경변수가 있는지"""
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    return bool(key) and key.startswith("sk-ant-")


def get_auth_mode() -> str:
    """현재 사용 가능한 인증 방식.
    'claude_code' | 'api_key' | 'none'"""
    # 사용자 설정 우선
    forced = os.getenv("FORCE_AUTH_MODE", "").strip().lower()
    if forced in ("claude_code", "api_key"):
        if forced == "claude_code" and detect_claude_code():
            return "claude_code"
        if forced == "api_key" and has_api_key():
            return "api_key"

    # 자동 감지 — Claude Code 우선 (작가 친화)
    if detect_claude_code():
        return "claude_code"
    if has_api_key():
        return "api_key"
    return "none"


def is_ready() -> bool:
    """작가가 사용 가능한 상태인지 (단순 판정)"""
    return get_auth_mode() != "none"


def get_status_for_writer() -> dict:
    """작가에게 보여줄 단순 상태 — 기술 용어 X"""
    mode = get_auth_mode()
    if mode == "claude_code":
        return {
            "ready": True,
            "label": "✓ 작가 에이전트 사용 가능",
            "detail": "Claude 구독 계정으로 자동 연결됐습니다.",
            "color": "success",
        }
    if mode == "api_key":
        return {
            "ready": True,
            "label": "✓ 작가 에이전트 사용 가능",
            "detail": "고급 모드로 연결됐습니다.",
            "color": "success",
        }
    return {
        "ready": False,
        "label": "⚠ 로그인 필요",
        "detail": "Claude 구독 또는 키 등록이 필요합니다. [설정] 페이지를 열어주세요.",
        "color": "warning",
    }


def install_guide_for_writer() -> dict:
    """작가가 첫 실행 시 보여줄 안내 (기술 용어 최소화)"""
    return {
        "title": "처음이신가요? 한 가지만 준비하면 됩니다.",
        "options": [
            {
                "name": "권장 방법 — Claude 구독",
                "description": (
                    "월 $20 Claude Pro 또는 Max 구독으로 바로 사용 가능합니다.\n"
                    "이미 Claude 쓰고 계시면 이 방식이 가장 편해요."
                ),
                "action_label": "Claude.ai에서 가입하기",
                "url": "https://claude.ai/upgrade",
                "tech_step": "그 후 https://docs.claude.com/en/docs/claude-code/quickstart 에서 데스크탑 앱(Claude Code) 설치",
            },
            {
                "name": "고급 모드 — 자체 키",
                "description": (
                    "기술이 익숙한 분만. Anthropic API 키를 직접 발급받아 입력합니다.\n"
                    "사용량 단위로 비용 청구돼요."
                ),
                "action_label": "Anthropic 콘솔 가기",
                "url": "https://console.anthropic.com/account/keys",
                "tech_step": "발급한 키를 [설정] 페이지의 입력란에 붙여넣기",
            },
        ],
        "default_recommendation": "Claude 구독을 권장합니다 (가장 쉬움)",
    }
