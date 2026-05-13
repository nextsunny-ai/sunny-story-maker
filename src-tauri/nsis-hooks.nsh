; NSIS installer hooks — SUNNY Story Maker
; 설치 후 = 바탕화면 단축키 생성 / 제거 시 = 단축키 삭제

!macro NSIS_HOOK_POSTINSTALL
  ; 바탕화면 단축키 (= 현재 사용자)
  CreateShortcut "$DESKTOP\SUNNY Story Maker.lnk" "$INSTDIR\sunny-story-maker.exe" "" "$INSTDIR\sunny-story-maker.exe" 0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; 제거 시 = 바탕화면 단축키 삭제
  Delete "$DESKTOP\SUNNY Story Maker.lnk"
!macroend
