# SUNNY Story Maker — Windows 자동 셋업 (PowerShell)
# 우클릭 → "PowerShell로 실행" 한 번으로:
#   1. winget 확인 (Win 10/11 표준)
#   2. Node.js 체크·자동 설치
#   3. Python3 체크·자동 설치 (안전망)
#   4. Claude Code 체크·자동 설치 (npm)
#   5. npm install (PDF/DOCX 라이브러리: unpdf, mammoth, docx 자동)
#   6. .env.local 생성 + 바탕화면 바로가기 + 첫 실행
#
# 처음 실행 시 PowerShell 보안 정책 에러 나면:
#   PowerShell을 관리자 권한으로 열고 실행:
#     Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

Clear-Host
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   SUNNY Story Maker — Windows 자동 셋업" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "폴더: $ProjectDir"
Write-Host ""

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

# ============ [1/6] winget (자동 설치 안내) ============
Write-Host "[1/6] winget 확인…" -ForegroundColor Yellow
if (-not (Test-Command "winget")) {
    Write-Host "  ❌ winget이 없습니다." -ForegroundColor Red
    Write-Host "  → Microsoft Store에서 'App Installer' 검색 후 설치"
    Write-Host "  → 또는 Windows 11 최신 업데이트 적용"
    Write-Host ""
    Read-Host "  Enter 키로 종료…"
    exit 1
}
Write-Host "  ✓ winget 사용 가능"
Write-Host ""

# ============ [2/6] Node.js (자동 설치) ============
Write-Host "[2/6] Node.js 확인…" -ForegroundColor Yellow
if (-not (Test-Command "node")) {
    Write-Host "  → Node.js 없음. winget으로 자동 설치…"
    winget install -e --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    # 설치 직후 PATH 갱신 (현재 세션)
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "  ✓ Node.js 설치 완료"
} else {
    $nodeVer = (node --version) -replace 'v', ''
    $major = [int]($nodeVer.Split('.')[0])
    if ($major -lt 20) {
        Write-Host "  → Node.js v$nodeVer 너무 옛날. 최신으로 업그레이드…"
        winget upgrade -e --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    }
    Write-Host "  ✓ Node.js $(node --version)"
}
Write-Host ""

# ============ [3/6] Python3 (자동 설치 — 안전망) ============
Write-Host "[3/6] Python3 확인 (안전망 — 추후 hwp 변환 등 위해)…" -ForegroundColor Yellow
if (-not (Test-Command "python") -and -not (Test-Command "python3")) {
    Write-Host "  → Python 없음. winget으로 자동 설치…"
    winget install -e --id Python.Python.3.12 --silent --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "  ✓ Python 설치 완료"
} else {
    $pyCmd = if (Test-Command "python") { "python" } else { "python3" }
    Write-Host "  ✓ $(& $pyCmd --version 2>&1)"
}
Write-Host ""

# ============ [4/6] Claude Code (자동 설치) ============
Write-Host "[4/6] Claude Code 확인…" -ForegroundColor Yellow
if (-not (Test-Command "claude")) {
    Write-Host "  → Claude Code 없음. npm으로 자동 설치…"
    npm install -g "@anthropic-ai/claude-code"
    Write-Host "  ✓ Claude Code 설치 완료"
    Write-Host ""
    Write-Host "  ⚠ 첫 사용을 위해 본인 Claude 계정 로그인이 필요합니다:" -ForegroundColor Yellow
    Write-Host "     'claude' 명령 → 안내에 따라 OAuth 로그인 (브라우저 자동 열림)"
    Write-Host ""
    Read-Host "  로그인 완료 후 Enter 키…"
} else {
    Write-Host "  ✓ Claude Code 설치됨"
}
Write-Host ""

# ============ [5/6] 의존성 설치 (Node 패키지) ============
Write-Host "[5/6] 의존성 설치 중… (1~3분 소요)" -ForegroundColor Yellow
Write-Host "  → unpdf (PDF 읽기) + mammoth (DOCX 읽기) + docx (DOCX 쓰기) + Next.js 등"
npm install --silent 2>&1 | Select-Object -Last 3
Write-Host "  ✓ 완료"
Write-Host ""

# ============ [6/6] 환경 설정 + 바탕화면 + 첫 실행 ============
Write-Host "[6/6] 환경 설정·바탕화면 바로가기·첫 실행…" -ForegroundColor Yellow

if (Test-Path ".env.local") {
    Write-Host "  → .env.local 이미 있음, 그대로 사용"
} else {
@"
USE_CLAUDE_CODE=true
BYPASS_AUTH=true
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=opus
ANTHROPIC_MODEL_FAST=haiku
NEXT_PUBLIC_SUPABASE_URL=https://lcasxovjrgbnraxzyvnf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4O8VnABcy6xEansgj0ccnA_c4u5Efz0
INVITE_CODE=SUNNY2026!
"@ | Out-File -Encoding utf8 -NoNewline ".env.local"
    Write-Host "  ✓ .env.local 생성 (Claude Code 모드, API 비용 0)"
}

# 바탕화면 바로가기 — Story_Maker.lnk (셸 창 안 보임 — vbs wrapper 통해 백그라운드 실행)
# 1. start_storymaker.vbs 신설 (창 숨김 + dev 서버 + 브라우저 자동 열기)
$vbsPath = Join-Path $ProjectDir "start_storymaker.vbs"
@"
' SUNNY Story Maker — Windows 백그라운드 시작 (셸 창 안 보임)
Set WshShell = CreateObject(`"WScript.Shell`")
WshShell.CurrentDirectory = `"$ProjectDir`"

' 이미 dev 서버 떠있는지 확인
On Error Resume Next
Set http = CreateObject(`"WinHttp.WinHttpRequest.5.1`")
http.Open `"GET`", `"http://localhost:3001/login`", False
http.Send
If Err.Number = 0 And http.Status = 200 Then
    WshShell.Run `"http://localhost:3001/`"
    WScript.Quit
End If
On Error Goto 0

' 죽어있음 — npm run dev 백그라운드 (창 숨김)
WshShell.Run `"cmd /c npm run dev`", 0, False
WScript.Sleep 8000
WshShell.Run `"http://localhost:3001/`"
"@ | Out-File -Encoding ascii $vbsPath

# 2. 바탕화면 .lnk = wscript → vbs (셸 X)
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Story_Maker.lnk"
$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$vbsPath`""
$shortcut.WorkingDirectory = $ProjectDir
$shortcut.IconLocation = "%SystemRoot%\System32\SHELL32.dll,13"
$shortcut.Description = "SUNNY Story Maker"
$shortcut.WindowStyle = 7  # Minimized (단, wscript는 창 자체 안 띄움)
$shortcut.Save()
Write-Host "  ✓ 바탕화면 바로가기 'Story_Maker.lnk' 생성 (셸 창 X — 브라우저만 자동 열림)"

# 첫 실행
$port = 3001
$tcpTest = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
if ($tcpTest.TcpTestSucceeded) {
    Write-Host "  → 포트 $port 이미 사용 중. 브라우저만 엽니다."
    Start-Process "http://localhost:$port"
} else {
    Write-Host "  → 새 PowerShell 창에서 dev 서버 시작 중…"
    Start-Process powershell -ArgumentList "-NoExit -Command", "cd '$ProjectDir'; npm run dev"
    Start-Sleep -Seconds 8
    Start-Process "http://localhost:$port"
}
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ 셋업 완료!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  사용:"
Write-Host "    • 시작: 바탕화면 'Story_Maker.lnk' 더블클릭"
Write-Host "    • 종료: 떠있는 PowerShell 창에서 Ctrl+C"
Write-Host "    • URL : http://localhost:3001"
Write-Host ""
Write-Host "  설치된 것:"
Write-Host "    • Node.js $(if (Test-Command 'node') { node --version } else { '?' })"
$pyVer = if (Test-Command 'python') { (python --version 2>&1) -replace 'Python ', '' }
        elseif (Test-Command 'python3') { (python3 --version 2>&1) -replace 'Python ', '' }
        else { '?' }
Write-Host "    • Python $pyVer"
Write-Host "    • Claude Code (본인 구독으로 무료)"
Write-Host "    • Story Maker (PDF/DOCX 자동 파싱·생성 포함)"
Write-Host ""
Write-Host "  비용: 본인 Claude Pro/Max 구독 안에서 무료"
Write-Host ""
Read-Host "Enter 키로 이 창 닫기…"
