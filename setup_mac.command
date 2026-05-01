#!/bin/bash
# SUNNY Story Maker — 맥 자동 설치 (비개발자용)
# 더블클릭만 하면 끝까지 자동 진행. 단계별 안내 + 실패 시 친절한 가이드.

cd "$(dirname "$0")"

# 색상
G='\033[0;32m'  # 초록
Y='\033[1;33m'  # 노랑
R='\033[0;31m'  # 빨강
B='\033[1;34m'  # 파랑
NC='\033[0m'    # 리셋

print_header() {
    echo ""
    echo -e "${B}========================================${NC}"
    echo -e "${B}  $1${NC}"
    echo -e "${B}========================================${NC}"
    echo ""
}

print_ok() { echo -e "  ${G}✓${NC} $1"; }
print_warn() { echo -e "  ${Y}⚠${NC} $1"; }
print_err() { echo -e "  ${R}✗${NC} $1"; }

show_manual_guide() {
    echo ""
    echo -e "${Y}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${Y}  자동 설치가 실패했어요. 수동 설치 안내:${NC}"
    echo -e "${Y}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  같은 폴더의 INSTALL_GUIDE.md 파일을 열어보세요."
    echo "  (텍스트 편집기 / 메모장에서 열림)"
    echo ""
    echo "  또는 박선희 대표에게 카톡으로 연락 주세요."
    echo ""
    read -p "엔터를 눌러 종료..."
    exit 1
}

print_header "SUNNY Story Maker 자동 설치"

# ---------- 1. Python 확인 (있으면 자동 건너뜀) ----------
echo "[1/4] Python 확인..."
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version 2>&1)
    print_ok "$PY_VER 발견됨 — 건너뜀"
else
    print_warn "Python이 없네요. 자동 설치 시도 중..."
    # brew 있으면 brew로 설치
    if command -v brew >/dev/null 2>&1; then
        echo "  Homebrew 발견 — 'brew install python3' 실행..."
        if brew install python3; then
            print_ok "Python 자동 설치 완료"
        else
            print_err "brew install 실패"
            show_manual_guide
        fi
    else
        # brew 없으면 안내
        echo ""
        print_err "자동으로 Python을 설치할 수 없습니다."
        echo ""
        echo -e "${B}  방법 1 — Python 공식 사이트${NC}"
        echo "    1) https://www.python.org/downloads/macos/ 열기"
        echo "    2) 노란 큰 버튼 'Download Python 3.x' 클릭"
        echo "    3) 다운로드 받은 .pkg 파일 더블클릭 → 설치"
        echo "    4) 설치 후 이 파일(setup_mac.command)을 다시 더블클릭"
        echo ""
        echo -e "${B}  방법 2 — 터미널 한 줄 (Homebrew 설치)${NC}"
        echo '    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        echo "    설치 후 'brew install python3' 입력"
        echo ""
        show_manual_guide
    fi
fi

# ---------- 2. 가상환경 ----------
echo ""
echo "[2/4] 가상환경 준비..."
if [ ! -d "venv" ]; then
    if python3 -m venv venv 2>/dev/null; then
        print_ok "가상환경 생성"
    else
        print_err "가상환경 생성 실패"
        show_manual_guide
    fi
else
    print_ok "가상환경 이미 있음 — 건너뜀"
fi

# ---------- 3. 의존성 설치 ----------
echo ""
echo "[3/4] 필요한 라이브러리 설치 중... (1~3분)"
source venv/bin/activate

if [ ! -f "venv/.installed" ]; then
    pip install --upgrade pip --quiet 2>&1 | tail -3
    if pip install -r requirements.txt --quiet 2>&1 | tail -5; then
        touch venv/.installed
        print_ok "라이브러리 설치 완료"
    else
        print_err "라이브러리 설치 실패"
        echo ""
        echo "  네트워크 문제일 수 있어요. 잠시 후 다시 시도해주세요."
        echo "  계속 실패하면 INSTALL_GUIDE.md 또는 박선희 대표에게 연락."
        echo ""
        read -p "엔터를 눌러 종료..."
        exit 1
    fi
else
    print_ok "이미 설치됨 — 건너뜀"
fi

# ---------- 4. .env 파일 ----------
echo ""
echo "[4/4] 환경 설정..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo "ANTHROPIC_API_KEY=" > .env
    fi
    print_warn ".env 파일을 새로 만들었어요. API 키는 실행 후 어드민 → 시스템에서 입력하세요."
else
    print_ok ".env 파일 있음 — 건너뜀"
fi

# ---------- 완료 + 자동 실행 ----------
print_header "✓ 설치 완료 — 바로 실행합니다"

echo "  브라우저가 자동으로 열립니다."
echo "  안 열리면 http://localhost:8501"
echo ""
echo "  종료: 이 터미널 창에서 Ctrl+C"
echo "  다음 실행: start_mac.command 더블클릭"
echo ""

streamlit run app.py --server.port 8501 --browser.gatherUsageStats false
