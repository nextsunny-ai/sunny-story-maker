; NSIS installer hooks — SUNNY Story Maker
; 설치 후 = 바탕화면 단축키 + URL scheme(story-maker://) 등록
; 제거 시 = 단축키 + URL scheme 삭제

!macro NSIS_HOOK_POSTINSTALL
  ; 바탕화면 단축키 (= 현재 사용자)
  CreateShortcut "$DESKTOP\SUNNY Story Maker.lnk" "$INSTDIR\sunny-story-maker.exe" "" "$INSTDIR\sunny-story-maker.exe" 0

  ; URL scheme 등록 = story-maker:// = OAuth callback 받음
  WriteRegStr HKCR "story-maker" "" "URL:SUNNY Story Maker Protocol"
  WriteRegStr HKCR "story-maker" "URL Protocol" ""
  WriteRegStr HKCR "story-maker\DefaultIcon" "" "$\"$INSTDIR\sunny-story-maker.exe$\",0"
  WriteRegStr HKCR "story-maker\shell" "" ""
  WriteRegStr HKCR "story-maker\shell\open" "" ""
  WriteRegStr HKCR "story-maker\shell\open\command" "" "$\"$INSTDIR\sunny-story-maker.exe$\" $\"%1$\""
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; 바탕화면 단축키 삭제
  Delete "$DESKTOP\SUNNY Story Maker.lnk"

  ; URL scheme 삭제
  DeleteRegKey HKCR "story-maker"
!macroend
