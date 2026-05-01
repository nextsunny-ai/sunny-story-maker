@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM SUNNY Story Maker — 배포용 ZIP 패키징
REM 작가에게 보낼 ZIP 파일 자동 생성. 개인 데이터(.env, output) 제외.

cd /d %~dp0

set VERSION=1.0
set NAME=SUNNY_Story_Maker_v%VERSION%
set DIST=dist\%NAME%

echo ========================================
echo SUNNY Story Maker 배포 ZIP 생성
echo 버전: %VERSION%
echo ========================================
echo.

REM 이전 빌드 정리
if exist "%DIST%" rmdir /s /q "%DIST%"
if exist "dist\%NAME%.zip" del "dist\%NAME%.zip"

mkdir "%DIST%" 2>nul

echo [1/4] 파일 복사 중 (개인 데이터 제외)...

REM 핵심 파일/폴더만 복사 (output, venv, .env 제외)
xcopy /E /I /Q "modules" "%DIST%\modules" > nul
xcopy /E /I /Q "pages" "%DIST%\pages" > nul
xcopy /E /I /Q "assets" "%DIST%\assets" > nul

copy "app.py" "%DIST%\" > nul
copy "requirements.txt" "%DIST%\" > nul
copy "run.bat" "%DIST%\" > nul
copy "install_shortcut.bat" "%DIST%\" > nul
copy ".env.example" "%DIST%\" > nul
copy "README.md" "%DIST%\" > nul
copy ".gitignore" "%DIST%\" > nul

REM output 폴더는 빈 상태로 (작가가 작업 시 생성됨)
mkdir "%DIST%\output" 2>nul
echo (작가의 작품이 자동 저장되는 폴더입니다.) > "%DIST%\output\README.txt"

echo [2/4] 첫 실행 안내 작성 중...
(
echo SUNNY Story Maker v%VERSION% — 처음 실행하기
echo.
echo 1^) Python 3.10+ 설치 ^(https://www.python.org/downloads/^)
echo 2^) install_shortcut.bat 더블클릭 ^(바탕화면 단축키 자동 생성^)
echo 3^) 바탕화면의 SUNNY Story Maker 아이콘 클릭
echo 4^) 첫 실행 시 자동으로 의존성 설치 ^(1~2분^)
echo 5^) 브라우저에서 자동 오픈됩니다
echo.
echo 로그인 옵션 두 가지:
echo   - Claude 구독자: 자동 감지됨. 별도 설정 불필요
echo   - API 키 보유자: 설정 페이지에서 입력
echo.
echo 둘 다 없으면 Claude.ai 가입 ^(월 $20 Pro 추천^)
) > "%DIST%\빠른_시작.txt"

echo [3/4] ZIP 파일 생성 중...
powershell -NoProfile -Command "Compress-Archive -Path '%DIST%\*' -DestinationPath 'dist\%NAME%.zip' -Force"

if errorlevel 1 (
    echo [에러] ZIP 생성 실패
    pause
    exit /b 1
)

echo [4/4] 임시 폴더 정리 중...
rmdir /s /q "%DIST%"

echo.
echo ========================================
echo ✓ 완료!
echo.
echo 배포 파일: dist\%NAME%.zip
echo.
echo 다음 단계:
echo   1^) 위 ZIP 파일을 Google Drive에 업로드
echo   2^) 공유 링크 생성 ^(보기 전용^)
echo   3^) 작가에게 링크 + 빠른_시작.txt 안내 전달
echo ========================================
echo.

REM 출력 폴더 자동 열기
explorer dist

pause