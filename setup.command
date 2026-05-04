#!/bin/bash
# SUNNY Story Maker — Mac 자동 셋업
# 더블클릭 한 번으로:
#   1. Homebrew 체크·자동 설치
#   2. Node.js 체크·자동 설치 (brew)
#   3. Python3 체크·자동 설치 (brew, hwp/기타 변환 안전망)
#   4. Claude Code 체크·자동 설치 (npm)
#   5. npm install (PDF/DOCX 라이브러리: unpdf, mammoth, docx 등 자동)
#   6. .env.local 생성 + 바탕화면 바로가기 + 첫 실행

set -e
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

clear
echo "════════════════════════════════════════════════════════════"
echo "   SUNNY Story Maker — Mac 자동 셋업"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "폴더: $PROJECT_DIR"
echo ""

# ============ [1/6] Homebrew (자동 설치) ============
echo "[1/6] Homebrew 확인…"
if ! command -v brew &> /dev/null; then
    echo "  → Homebrew 없음. 자동 설치 (5~10분 소요)…"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # M1/M2 Mac PATH 추가
    if [[ -d "/opt/homebrew/bin" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    echo "  ✓ Homebrew 설치 완료"
else
    echo "  ✓ $(brew --version | head -1)"
fi
echo ""

# ============ [2/6] Node.js (자동 설치) ============
echo "[2/6] Node.js 확인…"
if ! command -v node &> /dev/null; then
    echo "  → Node.js 없음. brew로 자동 설치…"
    brew install node
    echo "  ✓ Node.js 설치 완료"
else
    NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -lt "20" ]; then
        echo "  → Node.js v$NODE_VER 너무 옛날. 최신으로 업그레이드…"
        brew upgrade node || brew install node
    fi
    echo "  ✓ Node.js $(node --version)"
fi
echo ""

# ============ [3/6] Python3 (자동 설치 — 안전망) ============
echo "[3/6] Python3 확인 (안전망 — 추후 hwp 변환 등 위해)…"
if ! command -v python3 &> /dev/null; then
    echo "  → Python3 없음. brew로 자동 설치…"
    brew install python
    echo "  ✓ Python3 설치 완료"
else
    echo "  ✓ Python $(python3 --version | sed 's/Python //')"
fi
echo ""

# ============ [4/6] Claude Code (자동 설치) ============
echo "[4/6] Claude Code 확인…"
if ! command -v claude &> /dev/null; then
    echo "  → Claude Code 없음. npm으로 자동 설치…"
    npm install -g @anthropic-ai/claude-code
    echo "  ✓ Claude Code 설치 완료"
    echo ""
    echo "  ⚠ 첫 사용을 위해 본인 Claude 계정 로그인이 필요합니다:"
    echo "     'claude' 명령 → 안내에 따라 OAuth 로그인 (브라우저 자동 열림)"
    echo ""
    read -p "  로그인 완료 후 Enter 키…"
else
    echo "  ✓ Claude Code $(claude --version 2>&1 | head -1)"
fi
echo ""

# ============ [5/6] 의존성 설치 (Node 패키지) ============
echo "[5/6] 의존성 설치 중… (1~3분 소요)"
echo "  → unpdf (PDF 읽기) + mammoth (DOCX 읽기) + docx (DOCX 쓰기) + Next.js 등"
npm install --silent 2>&1 | tail -3
echo "  ✓ 완료"
echo ""

# ============ [6/6] 환경 설정 + 바탕화면 + 첫 실행 ============
echo "[6/6] 환경 설정·바탕화면 바로가기·첫 실행…"

if [ -f ".env.local" ]; then
    echo "  → .env.local 이미 있음, 그대로 사용"
else
    cat > .env.local << 'ENVEOF'
USE_CLAUDE_CODE=true
BYPASS_AUTH=true
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=opus
ANTHROPIC_MODEL_FAST=haiku
NEXT_PUBLIC_SUPABASE_URL=https://lcasxovjrgbnraxzyvnf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4O8VnABcy6xEansgj0ccnA_c4u5Efz0
INVITE_CODE=SUNNY2026!
ENVEOF
    echo "  ✓ .env.local 생성 (Claude Code 모드, API 비용 0)"
fi

SHORTCUT="$HOME/Desktop/Story_Maker.command"
cat > "$SHORTCUT" << EOF2
#!/bin/bash
cd "$PROJECT_DIR"
PORT=3001
if lsof -ti:\$PORT > /dev/null 2>&1; then
    open "http://localhost:\$PORT"
    exit 0
fi
osascript -e 'tell app "Terminal" to do script "cd '"$PROJECT_DIR"' && npm run dev"'
sleep 7
open "http://localhost:\$PORT"
EOF2
chmod +x "$SHORTCUT"
echo "  ✓ 바탕화면 바로가기 'Story_Maker.command' 생성"

PORT=3001
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "  → 포트 $PORT 이미 사용 중. 브라우저만 엽니다."
    open "http://localhost:$PORT"
else
    osascript -e "tell app \"Terminal\" to do script \"cd $PROJECT_DIR && npm run dev\""
    echo "  → 새 Terminal 창에서 dev 서버 시작 중…"
    sleep 7
    open "http://localhost:$PORT"
fi
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ 셋업 완료!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  사용:"
echo "    • 시작: 바탕화면 'Story_Maker.command' 더블클릭"
echo "    • 종료: 떠있는 Terminal 창에서 Ctrl+C"
echo "    • URL : http://localhost:3001"
echo ""
echo "  설치된 것:"
echo "    • Homebrew (Mac 패키지 관리)"
echo "    • Node.js $(node --version 2>/dev/null || echo '?')"
echo "    • Python $(python3 --version 2>/dev/null | sed 's/Python //' || echo '?')"
echo "    • Claude Code (본인 구독으로 무료)"
echo "    • Story Maker (PDF/DOCX 자동 파싱·생성 포함)"
echo ""
echo "  비용: 본인 Claude Pro/Max 구독 안에서 무료"
echo ""
read -p "Enter 키로 이 창 닫기…"
