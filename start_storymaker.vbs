' SUNNY Story Maker — Windows 백그라운드 시작 (셸 창 안 보임)
' 1. dev 서버 = 백그라운드 (창 숨김)
' 2. 8초 대기 (서버 startup)
' 3. 브라우저 자동 열림

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\SUNNY_Story_Maker_LOCAL"

' 이미 dev 서버 떠있는지 확인 — port 3001 사용 중이면 브라우저만 열기
On Error Resume Next
Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
http.Open "GET", "http://localhost:3001/login", False
http.Send
If Err.Number = 0 And http.Status = 200 Then
    ' 살아있음 — 브라우저만 열기
    WshShell.Run "http://localhost:3001/"
    WScript.Quit
End If
On Error Goto 0

' 죽어있음 — npm run dev 백그라운드 (창 숨김 = 0)
WshShell.Run "cmd /c npm run dev", 0, False

' 8초 대기 후 브라우저 열기 (Next.js startup 시간)
WScript.Sleep 8000
WshShell.Run "http://localhost:3001/"
