@echo off
chcp 65001 > nul
setlocal

REM SUNNY Story Maker v1.0 실행
REM 위치: C:\SUNNY_Story_Maker\run.bat

cd /d %~dp0

echo ========================================
echo SUNNY Story Maker v1.0
echo ========================================
echo.

REM 가상환경 확인 및 생성
if not exist "venv\Scripts\python.exe" (
    echo [1/3] 가상환경 생성 중...
    python -m venv venv
    if errorlevel 1 (
        echo [에러] Python이 설치되어 있지 않거나 PATH에 없습니다.
        pause
        exit /b 1
    )
)

REM 가상환경 활성화
call venv\Scripts\activate.bat

REM 의존성 설치 (최초 1회 또는 변경 시)
if not exist "venv\.installed" (
    echo [2/3] 의존성 설치 중... (1~2분 소요)
    pip install --upgrade pip
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [에러] 의존성 설치 실패
        pause
        exit /b 1
    )
    echo. > venv\.installed
)

REM .env 확인
if not exist ".env" (
    echo [경고] .env 파일이 없습니다.
    echo .env.example을 .env로 복사 후 ANTHROPIC_API_KEY를 입력해주세요.
    echo 또는 실행 후 [설정] 페이지에서 입력 가능합니다.
    copy .env.example .env > nul
)

echo [3/3] Streamlit 실행 중...
echo.
echo 브라우저가 자동으로 열립니다. (안 열리면 http://localhost:8501)
echo 종료: Ctrl+C
echo.

streamlit run app.py --server.port 8501 --server.headless false --browser.gatherUsageStats false

pause