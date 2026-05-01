$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
$src = "C:\SUNNY_Story_Maker"
$drive_dir = "G:\내 드라이브\SUNNY_TEAM\05_콘텐츠IP\시나리오\SUNNY_Story_Maker_FINAL"
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$zip_name = "SUNNY_Story_Maker_$timestamp.zip"
$zip_path = Join-Path $drive_dir $zip_name
$latest_path = Join-Path $drive_dir "SUNNY_Story_Maker_LATEST.zip"
if (-not (Test-Path $drive_dir)) { New-Item -ItemType Directory -Path $drive_dir -Force | Out-Null }
$tmp = "$env:TEMP\ssm_sync_$(Get-Random)"
New-Item -ItemType Directory -Path $tmp | Out-Null
$exclude = @('venv','output','.git','__pycache__','.env')
Get-ChildItem -Path $src -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
Get-ChildItem -Path $tmp -Recurse -Force -Directory | Where-Object { $_.Name -eq '__pycache__' } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$tmp\.env" -ErrorAction SilentlyContinue
Compress-Archive -Path "$tmp\*" -DestinationPath $zip_path -Force
Copy-Item $zip_path $latest_path -Force
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
$old_zips = Get-ChildItem $drive_dir -Filter "SUNNY_Story_Maker_2*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -Skip 5
foreach ($f in $old_zips) { Remove-Item $f.FullName -ErrorAction SilentlyContinue }
if (Test-Path $zip_path) {
    $size = (Get-Item $zip_path).Length / 1KB
    Write-Host "[Drive sync] $zip_name ($($size.ToString('0.0')) KB)"
}