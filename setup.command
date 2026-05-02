#!/bin/bash
# SUNNY Story Maker — Mac 자동 셋업
# 더블클릭 한 번으로: npm install + 환경변수 + 바탕화면 바로가기 + 첫 실행

set -e
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

clear
echo "════════════════════════════════════════════════════════════"
echo "   SUNNY Story Maker — 자동 셋업"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "폴더: $PROJECT_DIR"
echo ""

echo "[1/5] 사전 확인…"
if ! command -v node &> /dev/null; then
    echo ""; echo "❌ Node.js가 설치되지 않았어요."
    echo "   → https://nodejs.org 에서 LTS 버전 설치 후 다시 실행해주세요."
    echo ""; read -p "Enter 키로 종료…"; exit 1
fi
if ! command -v claude &> /dev/null; then
    echo ""; echo "❌ Claude Code가 설치되지 않았어요."
    echo "   → 터미널에 다음 명령어:"
    echo "     npm install -g @anthropic-ai/claude-code"
    echo "   → 설치 후 'claude' 명령으로 본인 계정 로그인 후 다시 실행."
    echo ""; read -p "Enter 키로 종료…"; exit 1
fi
echo "  ✓ Node.js $(node --version)"
echo "  ✓ Claude Code $(claude --version 2>&1 | head -1)"
echo ""

echo "[2/5] 의존성 설치 중… (1~3분 소요)"
npm install --silent 2>&1 | tail -3
echo "  ✓ 완료"
echo ""

echo "[3/5] 환경변수 셋업…"
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
echo ""

echo "[4/5] 바탕화면 바로가기 만드는 중…"
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
echo "  ✓ 바탕화면에 Story_Maker.command 생성"
echo ""

echo "[5/5] 첫 실행 중…"
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
echo "  비용: 본인 Claude Pro/Max 구독 안에서 무료"
echo ""
read -p "Enter 키로 이 창 닫기…"
