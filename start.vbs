' SUNNY Story Maker — 작가용 즉시 반응 실행 래퍼
' 동작: 클릭 즉시 로딩 페이지 표시 → 백그라운드 streamlit 실행 → 자동 전환

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
strLoading = strDir & "\assets\loading.html"
strApp = "http://localhost:8501"

WshShell.CurrentDirectory = strDir

' 1. 이미 streamlit 떠있는지 확인 (HEAD 요청)
Dim alreadyRunning : alreadyRunning = False
On Error Resume Next
Set objHTTP = CreateObject("MSXML2.XMLHTTP")
objHTTP.Open "HEAD", strApp, False
objHTTP.Send
If Err.Number = 0 And objHTTP.Status >= 200 And objHTTP.Status < 500 Then
    alreadyRunning = True
End If
Err.Clear
On Error Goto 0

If alreadyRunning Then
    ' 이미 떠있으면 바로 앱 열기
    WshShell.Run strApp
Else
    ' 2. 로딩 페이지 즉시 표시 (작가가 뭔가 동작한다고 인식)
    WshShell.Run """" & strLoading & """"

    ' 3. 백그라운드로 streamlit 실행 (pythonw = 콘솔 없음)
    strCmd = """" & strDir & "\venv\Scripts\pythonw.exe"" -m streamlit run """ & strDir & "\app.py"" --server.port 8501 --server.headless true --browser.gatherUsageStats false"
    WshShell.Run strCmd, 0, False

    ' 로딩 페이지가 자체적으로 폴링하면서 streamlit 떠지면 자동 redirect
    ' (loading.html 안의 JS가 0.8초마다 fetch 시도 → 성공하면 location.replace)
End If

Set objHTTP = Nothing
Set WshShell = Nothing
Set fso = Nothing