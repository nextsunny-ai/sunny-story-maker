// claude CLI subprocess 호출 (= 글로벌 룰 16 BYOK 정공법)
//
// 옛 사고 (2026-05-13 새벽 검증):
//   Anthropic Messages API 직접 호출 (= OAuth token + Bearer) = HTTP 401 차단됨
//   (Anthropic 2026-04-04 정책 = 외부 앱 OAuth 토큰 사용 금지)
//
// 진짜 작동 path (= 검증 완료):
//   `claude` CLI = Anthropic 공식 도구 = 약관 OK
//   spawn("claude", "--print", ...) = subprocess = stdout stream 받음
//   작가 본인 Pro/Max 구독 = 추가 비용 0
//
// 옛 route.ts:streamViaClaudeCode (line 391-511)를 Rust로 이식.
// 한글 인코딩 정공법: system-prompt-file에 UTF-8 BOM + 의뢰를 첫 머리에 박음.

use crate::StreamEvent;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, thiserror::Error)]
pub enum CliError {
    #[error("claude CLI not found in PATH — run `npm install -g @anthropic-ai/claude-code`")]
    NotFound,
    #[error("claude CLI not logged in — run `claude /login`")]
    NotLoggedIn,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("subprocess failed (exit {0}): {1}")]
    Subprocess(i32, String),
}

/// claude CLI 설치 여부 (= binary 검색).
pub fn is_installed() -> bool {
    find_claude_bin().is_some()
}

/// claude /login 완료 여부 (= ~/.claude/.credentials.json + accessToken + 만료 X).
pub fn is_logged_in() -> bool {
    let mut path = match dirs::home_dir() {
        Some(p) => p,
        None => return false,
    };
    path.push(".claude");
    path.push(".credentials.json");
    if !path.exists() {
        return false;
    }
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return false,
    };
    let v: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return false,
    };
    let oauth = match v.get("claudeAiOauth") {
        Some(o) => o,
        None => return false,
    };
    let token = oauth.get("accessToken").and_then(|t| t.as_str());
    if token.map(|t| t.is_empty()).unwrap_or(true) {
        return false;
    }
    if let Some(expires_at) = oauth.get("expiresAt").and_then(|e| e.as_i64()) {
        let now_ms = chrono::Utc::now().timestamp_millis();
        if expires_at < now_ms {
            return false;
        }
    }
    true
}

/// claude CLI 사용 가능 여부 (= 설치 + 로그인).
pub fn is_available() -> bool {
    is_installed() && is_logged_in()
}

/// 진단 사유 = "ready" | "not-installed" | "not-logged-in"
pub fn status_reason() -> &'static str {
    if !is_installed() {
        "not-installed"
    } else if !is_logged_in() {
        "not-logged-in"
    } else {
        "ready"
    }
}

/// 작가가 = "Claude 로그인 시작" 버튼 클릭 = `claude auth login --claudeai` 자동 실행.
/// = OAuth 2.0 authorization code flow = 자동 브라우저 열림 + Claude 페이지 = 작가 = 1~2 클릭 = 완료.
/// 1회 셋업 예외 (글로벌 룰 15 cmd 창 X = 일반 실행에는 적용. OAuth 1회는 TTY 필요 = 어쩔 수 없는 path).
pub fn open_login_terminal() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Windows: cmd /k = 명령 실행 후 창 유지 (= 작가가 OAuth URL 확인 가능).
        // start = 새 창 = 부모 .exe와 독립. --claudeai = Claude 구독 path (= 정확).
        std::process::Command::new("cmd")
            .args(["/c", "start", "cmd", "/k", "claude", "auth", "login", "--claudeai"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        let script = "tell application \"Terminal\" to do script \"claude auth login --claudeai\"";
        std::process::Command::new("osascript")
            .args(["-e", script])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        let tried = std::process::Command::new("gnome-terminal")
            .args(["--", "bash", "-c", "claude auth login --claudeai; echo; read -p '엔터로 닫기'"])
            .spawn();
        if tried.is_err() {
            let tried2 = std::process::Command::new("konsole")
                .args(["-e", "bash", "-c", "claude auth login --claudeai; echo; read -p '엔터로 닫기'"])
                .spawn();
            if tried2.is_err() {
                std::process::Command::new("xterm")
                    .args(["-e", "bash -c 'claude auth login --claudeai; echo; read -p \"엔터로 닫기\"'"])
                    .spawn()
                    .map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

/// claude CLI binary 경로 검색.
/// Windows: where claude → .cmd 디렉토리 → node_modules/.../claude.exe
/// Unix: which claude
fn find_claude_bin() -> Option<PathBuf> {
    let cmd = if cfg!(target_os = "windows") {
        "where"
    } else {
        "which"
    };

    let out = std::process::Command::new(cmd)
        .arg("claude")
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&out.stdout);
    let lines: Vec<&str> = stdout.lines().filter(|l| !l.is_empty()).collect();

    if cfg!(target_os = "windows") {
        // .cmd 가 있는 디렉토리의 node_modules/@anthropic-ai/claude-code/bin/claude.exe 검색
        for line in &lines {
            if line.ends_with(".cmd") {
                let dir = std::path::Path::new(line).parent()?;
                let exe = dir
                    .join("node_modules")
                    .join("@anthropic-ai")
                    .join("claude-code")
                    .join("bin")
                    .join("claude.exe");
                if exe.exists() {
                    return Some(exe);
                }
            }
            if line.ends_with(".exe") && std::path::Path::new(line).exists() {
                return Some(PathBuf::from(line));
            }
        }
        // .cmd fallback (cmd.exe 통해서 = 한글 깨질 위험 있지만 = 마지막 옵션)
        lines.first().map(PathBuf::from)
    } else {
        lines.first().map(PathBuf::from)
    }
}

/// model 이름을 claude CLI 단축형으로 변환.
fn cli_model(model: &str) -> &'static str {
    let m = model.to_lowercase();
    if m.contains("haiku") {
        "haiku"
    } else if m.contains("sonnet") {
        "sonnet"
    } else {
        "opus"
    }
}

/// 한글 인코딩 정공법 system prompt 빌드.
/// UTF-8 BOM + 의뢰를 첫 머리에 박음 (= claude.exe Windows binary가 stdin args를 cp949로 처리 → file은 utf-8 read).
fn build_combined_prompt(system_prompt: &str, user_message: &str) -> String {
    let mut s = String::new();
    s.push('\u{FEFF}'); // UTF-8 BOM
    s.push_str("# ★★★★★ 즉시 수행할 작업 의뢰 ★★★★★\n\n");
    s.push_str("아래 의뢰를 그대로 수행하여 응답으로 출력하라. ");
    s.push_str("사용자의 stdin 메시지는 트리거일 뿐 (글자 깨짐 가능 — 무시할 것). ");
    s.push_str("**오직 아래 의뢰만 보고 응답한다.**\n\n");
    s.push_str("---\n\n");
    s.push_str(user_message);
    s.push_str("\n\n---\n\n");
    s.push_str("# 위 작업 의뢰를 응답으로 즉시 출력하라. 작가 인사·자기소개·확인 질문 X. 결과물만 출력.\n\n");
    s.push_str("---\n\n");
    s.push_str("# 작가 페르소나 / 노하우 (참조용)\n\n");
    s.push_str(system_prompt);
    s
}

/// 임시 파일 경로 생성 (= tempdir + 고유 이름).
fn temp_prompt_file() -> PathBuf {
    let mut path = env::temp_dir();
    let stamp = chrono::Utc::now().timestamp_millis();
    let rand: u32 = rand_suffix();
    path.push(format!("sm_sys_{}_{}.txt", stamp, rand));
    path
}

fn rand_suffix() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    now ^ (std::process::id())
}

/// claude CLI subprocess 호출 + stdout stream → Channel.
/// SSE event 종류: delta(text), usage(input/output tokens), error, done.
pub async fn stream(
    system_prompt: &str,
    user_message: &str,
    model: &str,
    channel: &Channel<StreamEvent>,
) -> Result<(), CliError> {
    let claude_bin = find_claude_bin().ok_or(CliError::NotFound)?;

    // 임시 system prompt 파일 (UTF-8 BOM + 의뢰 첫 머리)
    let sys_file = temp_prompt_file();
    let combined = build_combined_prompt(system_prompt, user_message);
    fs::write(&sys_file, &combined)?;

    let cli_m = cli_model(model);

    let mut child = Command::new(&claude_bin)
        .arg("--print")
        .arg("--verbose")
        .arg("--system-prompt-file")
        .arg(&sys_file)
        .arg("--output-format")
        .arg("stream-json")
        .arg("--include-partial-messages")
        .arg("--model")
        .arg(cli_m)
        .env("LANG", "ko_KR.UTF-8")
        .env("LC_ALL", "ko_KR.UTF-8")
        .env("PYTHONIOENCODING", "utf-8")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()?;

    // stdin = ASCII trigger only (한글 깨짐 우회 — 실제 의뢰는 system-prompt-file에 박힘)
    if let Some(mut stdin) = child.stdin.take() {
        use tokio::io::AsyncWriteExt;
        let trigger = b"Execute the task at the top of system prompt. Output the result only. No greeting.";
        let _ = stdin.write_all(trigger).await;
        let _ = stdin.shutdown().await;
    }

    let stdout = child.stdout.take().ok_or_else(|| {
        CliError::Subprocess(-1, "stdout pipe not available".into())
    })?;
    let stderr = child.stderr.take();

    // stdout = line by line (stream-json)
    let mut reader = BufReader::new(stdout).lines();
    while let Some(line) = reader.next_line().await? {
        if line.trim().is_empty() {
            continue;
        }
        parse_stream_event(&line, channel);
    }

    // stderr 수집 (= exit code != 0 일 때 error 메시지로 박음)
    let stderr_text = if let Some(stderr) = stderr {
        let mut s = String::new();
        let mut r = BufReader::new(stderr).lines();
        while let Some(line) = r.next_line().await? {
            s.push_str(&line);
            s.push('\n');
        }
        s
    } else {
        String::new()
    };

    let status = child.wait().await?;

    // 임시 파일 정리
    let _ = fs::remove_file(&sys_file);

    if !status.success() {
        let code = status.code().unwrap_or(-1);
        // 401·로그인 안 됨 패턴 감지
        let lower = stderr_text.to_lowercase();
        if lower.contains("not authenticated") || lower.contains("login") || lower.contains("401") {
            let _ = channel.send(StreamEvent::Error {
                message: "Claude 로그인이 필요합니다. 터미널에서 `claude /login`을 실행한 후 다시 시도해주세요.".into(),
            });
            return Err(CliError::NotLoggedIn);
        }
        let msg = format!("claude CLI exit {}: {}", code, stderr_text.chars().take(500).collect::<String>());
        let _ = channel.send(StreamEvent::Error { message: msg.clone() });
        return Err(CliError::Subprocess(code, msg));
    }

    Ok(())
}

/// stream-json 한 줄 → StreamEvent 전송.
fn parse_stream_event(line: &str, channel: &Channel<StreamEvent>) {
    let v: serde_json::Value = match serde_json::from_str(line) {
        Ok(v) => v,
        Err(_) => return,
    };

    let event_type = v.get("type").and_then(|t| t.as_str()).unwrap_or("");

    match event_type {
        // partial message (--include-partial-messages)
        "stream_event" => {
            let ev = v.get("event").cloned().unwrap_or(serde_json::Value::Null);
            let inner_type = ev.get("type").and_then(|t| t.as_str()).unwrap_or("");
            if inner_type == "content_block_delta" {
                let delta = ev.get("delta").cloned().unwrap_or(serde_json::Value::Null);
                if delta.get("type").and_then(|t| t.as_str()) == Some("text_delta") {
                    if let Some(text) = delta.get("text").and_then(|t| t.as_str()) {
                        let _ = channel.send(StreamEvent::Delta { text: text.to_string() });
                    }
                }
            } else if inner_type == "message_delta" {
                if let Some(usage) = ev.get("usage") {
                    let input = usage.get("input_tokens").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                    let output = usage.get("output_tokens").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                    let _ = channel.send(StreamEvent::Usage {
                        input_tokens: input,
                        output_tokens: output,
                    });
                }
            }
        }

        // assistant message (full block — partial 없을 때 fallback)
        "assistant" => {
            if let Some(content) = v.get("message").and_then(|m| m.get("content")).and_then(|c| c.as_array()) {
                for block in content {
                    if block.get("type").and_then(|t| t.as_str()) == Some("text") {
                        if let Some(text) = block.get("text").and_then(|t| t.as_str()) {
                            let _ = channel.send(StreamEvent::Delta { text: text.to_string() });
                        }
                    }
                }
            }
        }

        // result (= 최종 usage)
        "result" => {
            if let Some(usage) = v.get("usage") {
                let input = usage.get("input_tokens").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                let output = usage.get("output_tokens").and_then(|x| x.as_u64()).unwrap_or(0) as u32;
                let _ = channel.send(StreamEvent::Usage {
                    input_tokens: input,
                    output_tokens: output,
                });
            }
        }

        _ => {}
    }
}
