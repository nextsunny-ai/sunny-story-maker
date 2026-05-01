#!/bin/bash
# SUNNY Story Maker — 맥 자동 설치 스크립트
# 김감독님 같은 비개발자용. 더블클릭으로 실행.
# Python / git 있으면 건너뛰고, 없으면 안내 후 종료.

set -e
cd "$(dirname "$0")"

echo "========================================"
echo "  SUNNY Story Maker 자동 설치 (맥)"
echo "========================================"
echo ""

# ---------- 1. Python 확인 ----------
echo "[1/5] Python 확인 중..."
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version 2>&1)
    echo "  ✓ $PY_VER 발견됨"
else
    echo ""
    echo "  ⚠ Python이 설치되어 있지 않습니다."
    echo ""
    echo "  ▶ 설치 방법 (둘 중 하나):"
    echo "    a) https://www.python.org/downloads/macos/ 에서 받아 설치"
    echo "    b) 터미널에 다음 명령:"
    echo "       brew install python3"
    echo ""
    echo "  설치 후 이 파일을 다시 더블클릭해주세요."
    echo ""
    read -p "엔터를 눌러 종료..."
    exit 1
fi

# ---------- 2. git 확인 ----------
echo ""
echo "[2/5] git 확인 중..."
if command -v git >/dev/null 2>&1; then
    GIT_VER=$(git --version)
    echo "  ✓ $GIT_VER 발견됨"
else
    echo ""
    echo "  ⚠ git이 설치되어 있지 않습니다."
    echo "    터미널에 'xcode-select --install' 입력하면 자동 설치됩니다."
    echo ""
    read -p "엔터를 눌러 종료..."
    exit 1
fi

# ---------- 3. 가상환경 생성 ----------
echo ""
echo "[3/5] 가상환경 준비 중..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "  ✓ 가상환경 생성"
else
    echo "  ✓ 가상환경 이미 있음 (건너뜀)"
fi

# ---------- 4. 의존성 설치 ----------
echo ""
echo "[4/5] 필요한 라이브러리 설치 중... (1~3분 걸려요)"
source venv/bin/activate
if [ ! -f "venv/.installed" ]; then
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    touch venv/.installed
    echo "  ✓ 설치 완료"
else
    echo "  ✓ 이미 설치되어 있음 (건너뜀)"
fi

# ---------- 5. .env 파일 ----------
echo ""
echo "[5/5] 환경 설정 파일 확인..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        touch .env
    fi
    echo ""
    echo "  ⚠ .env 파일을 새로 만들었습니다."
    echo "    실행 후 우측 상단 ADMIN → 시스템 페이지에서 API 키를 입력하시거나,"
    echo "    .env 파일을 직접 열어 ANTHROPIC_API_KEY=sk-ant-... 형식으로 추가해주세요."
else
    echo "  ✓ .env 파일 있음"
fi

# ---------- 완료 ----------
echo ""
echo "========================================"
echo "  ✓ 설치 완료"
echo "========================================"
echo ""
echo "  지금 실행할까요? (y/n)"
read -p "  > " RUN_NOW

if [ "$RUN_NOW" = "y" ] || [ "$RUN_NOW" = "Y" ]; then
    echo ""
    echo "  Story Maker 실행 중..."
    echo "  브라우저가 자동으로 열립니다."
    echo "  종료: Ctrl+C"
    echo ""
    streamlit run app.py --server.port 8501 --browser.gatherUsageStats false
else
    echo ""
    echo "  나중에 실행하시려면 'start_mac.command' 파일을 더블클릭하세요."
    read -p "엔터를 눌러 종료..."
fi
