# Story Maker -> Drive sync
# 2026-05-12: "Every PC should see the final version"
#
# Master = C:\SUNNY_Story_Maker (git repo)
# Drive  = G:\Drive\SUNNY_TEAM\SUNNY_Story_Maker_FINAL\SUNNY_Story_Maker_LOCAL (read-only mirror)
#
# Usage: powershell -ExecutionPolicy Bypass -File sync-to-drive.ps1
#
# Run AFTER every git push.

$ErrorActionPreference = 'Stop'

$SRC = 'C:\SUNNY_Story_Maker'
$DST = 'G:\내 드라이브\SUNNY_TEAM\SUNNY_Story_Maker_FINAL\SUNNY_Story_Maker_LOCAL'

if (-not (Test-Path $SRC)) {
    Write-Host "[X] Source missing: $SRC" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $DST)) {
    New-Item -ItemType Directory -Path $DST -Force | Out-Null
}

Write-Host "--- Story Maker -> Drive sync ---" -ForegroundColor Cyan
Write-Host "SRC: $SRC"
Write-Host "DST: $DST"
Write-Host ""

# robocopy:
#   /MIR = mirror (DST identical to SRC, prune extras)
#   /XD  = exclude dirs (node_modules, build outputs, runtime data, env, vcs)
#   /XF  = exclude files (env, credentials, build cache, logs)
#   /R:1 /W:1 = retry once, wait 1s
#   /NFL /NDL /NJH /NS /NC /NP = minimal output
$result = robocopy $SRC $DST `
    /MIR `
    /XD node_modules .next .git target _works _resources _private_downloads .vercel .claude-flow dist `
    /XF .env .env.local .env.production .credentials.json tsconfig.tsbuildinfo "*.log" `
    /R:1 /W:1 /NFL /NDL /NJH /NS /NC /NP

# robocopy exit codes: 0=no-op, 1=copied, 2=extras-removed, 3=both, >=8=error
$code = $LASTEXITCODE

Write-Host ""
if ($code -lt 8) {
    Write-Host "[OK] Drive sync done (robocopy exit: $code)" -ForegroundColor Green
    Write-Host "     Other PC Claudes can now read Drive for the latest version" -ForegroundColor Gray

    # Write info marker
    $lastCommit = git -C $SRC log --format='%h %s' -1
    $now = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $infoLines = @(
        "# Story Maker -- Drive sync marker",
        "last_sync: $now",
        "git_commit: $lastCommit",
        "src: $SRC",
        "dst: $DST",
        "----------------------------------",
        "This folder is NOT a git repo.",
        "Master = C:\SUNNY_Story_Maker (laptop) or GitHub origin/v2-wip.",
        "This folder = read-only mirror for other PC Claudes to see the latest version.",
        "DO NOT edit here. Edit at the master location only."
    )
    $infoLines | Out-File -FilePath (Join-Path $DST '_DRIVE_SYNC_INFO.md') -Encoding UTF8

    exit 0
} else {
    Write-Host "[X] Drive sync failed (robocopy exit: $code)" -ForegroundColor Red
    exit $code
}
