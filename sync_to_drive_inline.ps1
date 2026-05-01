$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$src = "C:\SUNNY_Story_Maker"
$drive_root = "G:\내 드라이브\SUNNY_TEAM\05_콘텐츠IP\시나리오\SUNNY_Story_Maker_FINAL"
$drive_files = Join-Path $drive_root "current"
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$zip_name = "SUNNY_Story_Maker_$timestamp.zip"
$zip_path = Join-Path $drive_root $zip_name
$latest_path = Join-Path $drive_root "SUNNY_Story_Maker_LATEST.zip"

if (-not (Test-Path $drive_root)) { New-Item -ItemType Directory -Path $drive_root -Force | Out-Null }
if (-not (Test-Path $drive_files)) { New-Item -ItemType Directory -Path $drive_files -Force | Out-Null }

$exclude = @('venv','output','.git','__pycache__','.env')

# 1) 파일 그대로 Drive에 동기화 (current/ 폴더) — 사장님이 풀지 않고 바로 볼 수 있음
# robocopy로 미러 (변경된 것만 복사, 삭제된 것도 정리)
$exclude_dirs = $exclude -join " "
robocopy $src $drive_files /MIR /XD venv output .git __pycache__ /XF .env *.pyc /NFL /NDL /NJH /NJS /NC /NS /NP > $null 2>&1

# 2) ZIP 백업도 (다운로드용)
$tmp = "$env:TEMP\ssm_sync_$(Get-Random)"
New-Item -ItemType Directory -Path $tmp | Out-Null
Get-ChildItem -Path $src -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
Get-ChildItem -Path $tmp -Recurse -Force -Directory | Where-Object { $_.Name -eq '__pycache__' } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$tmp\.env" -ErrorAction SilentlyContinue
Compress-Archive -Path "$tmp\*" -DestinationPath $zip_path -Force
Copy-Item $zip_path $latest_path -Force
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

# 옛 ZIP 5개 넘으면 정리
$old_zips = Get-ChildItem $drive_root -Filter "SUNNY_Story_Maker_2*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -Skip 5
foreach ($f in $old_zips) { Remove-Item $f.FullName -ErrorAction SilentlyContinue }

if (Test-Path $zip_path) {
    $size = (Get-Item $zip_path).Length / 1KB
    Write-Host "[Drive sync] files synced + $zip_name ($($size.ToString('0.0')) KB)"
}