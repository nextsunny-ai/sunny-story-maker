# SUNNY Story Maker 런처 — 바탕화면 바로가기가 이걸 숨김 실행.
# 1) 서버 떠있으면 브라우저만 / 2) 아니면 서버(배치) 분리 실행 → 준비될 때까지 대기 → 브라우저.
# Start-Process 분리 = 이 런처가 끝나도 서버 유지(검증됨). USE_CLAUDE_CODE 는 배치/.env.local 에 있음.

function Test-Up {
  try { return (Invoke-WebRequest 'http://localhost:3001/login' -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { return $false }
}

if (-not (Test-Up)) {
  Start-Process -FilePath 'C:\SUNNY_Story_Maker\_start_server.cmd' -WindowStyle Minimized
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Up) { break }
  }
}

Start-Process 'http://localhost:3001/'
