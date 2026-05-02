# V2 변경사항 → LOCAL 폴더 sync → ZIP 새로 빌드 (다운로드용)
# 사용법: .\scripts\rebuild_local_zip.ps1

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$src = "C:\SUNNY_Story_Maker"
$local = "C:\SUNNY_Story_Maker_LOCAL"
$zip = "$src\_private_downloads\sunny-story-maker-local.zip"

if (-not (Test-Path "$src\_private_downloads")) {
    New-Item -ItemType Directory -Path "$src\_private_downloads" -Force | Out-Null
}

Write-Host "[1/4] V2 -> LOCAL sync (LOCAL 전용 파일은 보존)..."
# V2 변경사항을 LOCAL에 반영. 단 LOCAL 전용 파일은 robocopy /XF로 제외
$xf_files = @(
    ".env", ".env.local",
    "app\api\agent\stream\route.ts",  # LOCAL은 Claude Code subprocess 분기 들어있음
    "package.json",                   # LOCAL은 port 3001 + name 다름
    "package-lock.json",              # LOCAL은 의존성 같지만 lock 별도
    "SETUP_FOR_WRITERS.md"            # LOCAL 전용 가이드
)
$xd_dirs = @("node_modules", ".next", ".vercel", ".git", "__pycache__", "output", "_private_downloads", "scripts")

robocopy $src $local /MIR /XD @xd_dirs /XF @xf_files /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
$rc = $LASTEXITCODE
# robocopy exit codes 0~7 = success
if ($rc -ge 8) { Write-Error "robocopy 실패 (exit $rc)"; exit 1 }

Write-Host "[2/4] LOCAL -> tmp 카피 (ZIP 빌드용)..."
$tmp = "$env:TEMP\ssm_local_zip_$(Get-Random)"
New-Item -ItemType Directory -Path $tmp | Out-Null

$exclude = @('node_modules', '.next', '.vercel', '.git', '__pycache__', 'output', '_private_downloads', 'scripts', '.env')
Get-ChildItem -Path $local -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
Get-ChildItem -Path $tmp -Recurse -Force -Directory | Where-Object { $_.Name -eq '__pycache__' } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "[3/4] ZIP 빌드..."
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$tmp\*" -DestinationPath $zip -Force
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

$size_kb = [math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Host "[4/4] 완료: $zip ($size_kb KB)"
