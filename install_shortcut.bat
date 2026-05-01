@echo off
chcp 65001 > nul
setlocal

REM SUNNY Story Maker — 바탕화면 단축키 생성
REM 한 번만 실행하면 바탕화면에 예쁜 아이콘 생성

cd /d %~dp0

echo ========================================
echo SUNNY Story Maker 단축키 설치
echo ========================================
echo.

REM 가상환경 확인
if not exist "venv\Scripts\python.exe" (
    echo [1/3] 가상환경 생성 중...
    python -m venv venv
)
call venv\Scripts\activate.bat

REM Pillow + cairosvg 설치 (아이콘 변환용)
echo [2/3] 아이콘 변환 도구 준비 중...
pip install --quiet pillow cairosvg 2>nul
if errorlevel 1 (
    pip install --quiet pillow 2>nul
)

REM SVG → PNG → ICO 변환
echo [3/3] 아이콘 변환 + 바탕화면 단축키 생성 중...
python -c "from modules.install import install_desktop_shortcut; install_desktop_shortcut()"

if errorlevel 1 (
    echo [에러] 단축키 생성 실패
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ 완료! 바탕화면을 확인해보세요.
echo "SUNNY Story Maker" 아이콘이 생겼습니다.
echo ========================================
echo.
pause