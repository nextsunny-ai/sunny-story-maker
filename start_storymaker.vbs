' SUNNY Story Maker — Windows 백그라운드 시작 (셸 창 안 보임)
' 바탕화면 바로가기가 이 스크립트를 실행 → 최신 수정본(dev 서버)이 뜸.
' 1) 3001 이미 떠있으면 = 브라우저만 열기
' 2) 죽어있으면 = npm run dev 백그라운드 시작 → 서버 준비될 때까지 대기 → 브라우저 열기
'    (USE_CLAUDE_CODE=true 는 C:\SUNNY_Story_Maker\.env.local 에 있음 = 대표님 Claude 구독으로 AI 사용)

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\SUNNY_Story_Maker"

' ── 1. 이미 떠있나?
On Error Resume Next
Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
http.Open "GET", "http://localhost:3001/login", False
http.Send
If Err.Number = 0 And http.Status = 200 Then
    WshShell.Run "http://localhost:3001/"
    WScript.Quit
End If
Err.Clear
On Error Goto 0

' ── 2. 죽어있음 — dev 서버 시작 (배치 _start_server.cmd = node+next 직접 + USE_CLAUDE_CODE).
'   ★ start "" /min 로 띄워야 이 스크립트(wscript)가 끝나도 서버가 안 죽고 유지됨 (검증).
'   최소화 창 = 서버 표시(끄면 종료=직관적). 빈 제목("")이 안전.
WshShell.Run "cmd /c start """" /min ""C:\SUNNY_Story_Maker\_start_server.cmd""", 0, True

' ── 3. 서버 준비될 때까지 폴링 (최대 약 90초). 첫 컴파일이 오래 걸릴 수 있으므로 고정 대기 대신 확인.
Dim i, ready
ready = False
For i = 1 To 45
    WScript.Sleep 2000
    On Error Resume Next
    Set chk = CreateObject("WinHttp.WinHttpRequest.5.1")
    chk.Open "GET", "http://localhost:3001/login", False
    chk.Send
    If Err.Number = 0 And chk.Status = 200 Then
        ready = True
        Err.Clear
        On Error Goto 0
        Exit For
    End If
    Err.Clear
    On Error Goto 0
Next

' ── 4. 브라우저 열기 (준비됐든 시간초과든 일단 연다)
WshShell.Run "http://localhost:3001/"
