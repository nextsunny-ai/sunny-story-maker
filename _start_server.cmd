@echo off
rem SUNNY Story Maker dev 서버 — 바로가기(start_storymaker.vbs)가 호출.
rem USE_CLAUDE_CODE=true = 대표님 Claude 구독으로 AI 사용 (= 추가 비용 0).
cd /d "C:\SUNNY_Story_Maker"
set "USE_CLAUDE_CODE=true"
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next dev -p 3001 >> "C:\SUNNY_Story_Maker\_devserver.log" 2>&1
