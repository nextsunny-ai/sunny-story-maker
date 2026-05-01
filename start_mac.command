#!/bin/bash
# SUNNY Story Maker — 맥 실행 (이미 설치된 후)
# 더블클릭하면 Story Maker가 실행됩니다.

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "⚠ 가상환경이 없습니다. 먼저 setup_mac.command를 실행해주세요."
    read -p "엔터를 눌러 종료..."
    exit 1
fi

source venv/bin/activate

echo "SUNNY Story Maker 실행 중..."
echo "브라우저가 자동으로 열립니다 (안 열리면 http://localhost:8501)"
echo "종료: Ctrl+C"
echo ""

streamlit run app.py --server.port 8501 --browser.gatherUsageStats false
