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

// ★ Windows = subprocess 생성 시 = cmd 창 깜빡임 방지 (= CREATE_NO_WINDOW = 0x08000000)
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

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

/// claude 로그인 완료 여부.
///
/// ★ 2026-05-14 V2.13.1 정정 (= 김감독 진단 + 보고):
///   옛 = `~/.claude/.credentials.json` 파일만 체크 = macOS 무한 로그인 사고.
///   원인: macOS Claude Code CLI = `.credentials.json` 안 만들고 = **macOS Keychain**
///   ("Claude Code-credentials" 항목)에 토큰 저장.
///   정정: `claude auth status` subprocess 호출 = JSON `loggedIn: true` 체크.
///   → Keychain·파일·다른 저장소 어디든 = CLI 자신이 답하므로 = OS 차이 무관.
pub fn is_logged_in() -> bool {
    // 1차: `claude auth status` subprocess (= Keychain 포함 모든 path 검증)
    if let Some(bin) = find_claude_bin() {
        let mut command = std::process::Command::new(&bin);
        command.args(["auth", "status"]);
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(CREATE_NO_WINDOW);
        }
        if let Ok(out) = command.output() {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout);
                // JSON 출력 = {"loggedIn":true,...} 형식
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    if v.get("loggedIn").and_then(|b| b.as_bool()).unwrap_or(false) {
                        return true;
                    }
                }
                // text fallback (= 옛 CLI 버전 호환)
                let lower = stdout.to_lowercase();
                if lower.contains("logged in") && !lower.contains("not logged in") {
                    return true;
                }
            }
        }
    }

    // 2차 fallback: 파일 체크 (= 옛 Windows path 호환 + CLI 호출 실패 시)
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
    let content = content.trim_start_matches('\u{FEFF}');
    let v: serde_json::Value = match serde_json::from_str(content) {
        Ok(v) => v,
        Err(_) => return false,
    };
    let oauth = match v.get("claudeAiOauth") {
        Some(o) => o,
        None => return false,
    };
    let token = oauth.get("accessToken").and_then(|t| t.as_str());
    !token.map(|t| t.is_empty()).unwrap_or(true)
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
///
/// ★ 2026-05-14 V2.13.1 정정 (= 김감독 진단):
///   옛 = `which claude`만 = macOS GUI 앱 = login shell PATH 안 읽음 = 탐지 실패.
///   원인: Anthropic 공식 설치기 (`curl -fsSL https://claude.ai/install.sh | bash`)
///   = `~/.local/bin/claude`에 설치 = GUI 앱 PATH에 없음.
///   정정: which 실패 시 = macOS·Linux 표준 path 3개 fallback.
fn find_claude_bin() -> Option<PathBuf> {
    let cmd = if cfg!(target_os = "windows") {
        "where"
    } else {
        "which"
    };

    let mut command = std::process::Command::new(cmd);
    command.arg("claude");
    // ★ Windows = cmd 창 깜빡임 방지
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let out = command.output().ok();

    let lines: Vec<String> = match &out {
        Some(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            stdout.lines().filter(|l| !l.is_empty()).map(String::from).collect()
        }
        _ => Vec::new(),
    };

    if cfg!(target_os = "windows") {
        // 1) where 결과 = .cmd 디렉토리의 node_modules claude.exe 우선 (= 한글 인코딩 안전)
        for line in &lines {
            if line.ends_with(".cmd") {
                if let Some(dir) = std::path::Path::new(line).parent() {
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
            }
            if line.ends_with(".exe") && std::path::Path::new(line).exists() {
                return Some(PathBuf::from(line));
            }
        }
        // 2) where 가 .cmd 만 줬으면 그 .cmd 반환 (= stream()에서 cmd /c 경유로 실행)
        if let Some(first) = lines.first() {
            return Some(PathBuf::from(first));
        }
        // 3) ★ V2.13.3 — where 실패·빈 결과 = 표준 설치 위치 직접 검색 (AI 프로노트 claude_bin 이식).
        //    사고: 설치 직후 = 프로세스 PATH 아직 옛 값 → where 못 찾음 = '미설치' 오인.
        let names = ["claude.cmd", "claude.exe", "claude"];
        let mut dirs: Vec<PathBuf> = Vec::new();
        if let Some(home) = dirs::home_dir() {
            dirs.push(home.join(".local").join("bin")); // 네이티브 설치 (Anthropic 공식)
            dirs.push(home.join(".npm-global"));
            dirs.push(home.join("AppData").join("Roaming").join("npm"));
        }
        if let Ok(appdata) = env::var("APPDATA") {
            dirs.push(PathBuf::from(appdata).join("npm"));
        }
        if let Ok(local) = env::var("LOCALAPPDATA") {
            dirs.push(PathBuf::from(local).join("npm"));
        }
        dirs.push(PathBuf::from("C:\\Program Files\\nodejs"));
        for d in dirs {
            for n in &names {
                let p = d.join(n);
                if p.is_file() {
                    return Some(p);
                }
            }
        }
        return None;
    }

    // Unix (macOS·Linux): which 결과가 있으면 그것 우선
    if let Some(first) = lines.first() {
        let p = PathBuf::from(first);
        if p.exists() {
            return Some(p);
        }
    }

    // ★ which 실패·결과 없음 = macOS·Linux 표준 path fallback (= 김감독 진단)
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Some(home) = dirs::home_dir() {
        // Anthropic 공식 설치기 default = ~/.local/bin/claude
        candidates.push(home.join(".local").join("bin").join("claude"));
        // npm global (= nvm 등) = ~/.npm-global/bin/claude
        candidates.push(home.join(".npm-global").join("bin").join("claude"));
        // Homebrew node prefix (= 사용자별 다름)
        candidates.push(home.join(".local").join("share").join("claude").join("bin").join("claude"));
    }
    // macOS Homebrew (Apple Silicon)
    candidates.push(PathBuf::from("/opt/homebrew/bin/claude"));
    // Intel Mac·Linux 일반
    candidates.push(PathBuf::from("/usr/local/bin/claude"));
    // Linux 시스템
    candidates.push(PathBuf::from("/usr/bin/claude"));

    for p in candidates {
        if p.exists() {
            return Some(p);
        }
    }

    None
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

    // ★ V2.13.3 — Windows .cmd 는 cmd /c 경유 (= .cmd 직접 spawn = batch 인자 오류 회피, AI 프로노트 패턴).
    //   .exe·Unix 바이너리는 직접 실행.
    let is_cmd = cfg!(target_os = "windows")
        && claude_bin
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("cmd"))
            .unwrap_or(false);

    let mut cmd_builder = if is_cmd {
        let mut c = Command::new("cmd");
        c.arg("/c").arg(&claude_bin);
        c
    } else {
        Command::new(&claude_bin)
    };

    cmd_builder
        .arg("--print")
        .arg("--verbose")
        .arg("--system-prompt-file")
        .arg(&sys_file)
        .arg("--output-format")
        .arg("stream-json")
        .arg("--include-partial-messages")
        .arg("--model")
        .arg(cli_m)
        // ★ V2.13.3 — 부모 Claude Code 세션 env 격리 (CLAUDE_*/ANTHROPIC_*) = 컨텍스트·키 흡수 방지.
        .env_clear()
        .envs(std::env::vars().filter(|(k, _)| {
            !k.starts_with("CLAUDE") && !k.starts_with("ANTHROPIC")
        }))
        .env("LANG", "ko_KR.UTF-8")
        .env("LC_ALL", "ko_KR.UTF-8")
        .env("PYTHONIOENCODING", "utf-8")
        // ★ V2.13.3 — cwd = 임시 디렉터리 = 프로젝트 CLAUDE.md 미로드 = 깨끗한 호출.
        .current_dir(env::temp_dir())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    // ★ Windows = cmd 창 깜빡임 방지 (= GUI 앱에서 자식 process 생성 시 검은 창 안 뜨게).
    //   tokio::process::Command 는 creation_flags 를 자체 제공 (std CommandExt import 불필요).
    #[cfg(target_os = "windows")]
    cmd_builder.creation_flags(CREATE_NO_WINDOW);

    let mut child = cmd_builder.spawn()?;

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

    // stdout = line by line (stream-json).
    // ★ V2.13.3 — idle timeout = claude 가 hang 하면 무한 대기 → 앱 멈춤. 180초 무응답 = 중단·kill.
    let mut reader = BufReader::new(stdout).lines();
    loop {
        match tokio::time::timeout(
            std::time::Duration::from_secs(180),
            reader.next_line(),
        )
        .await
        {
            Ok(Ok(Some(line))) => {
                if line.trim().is_empty() {
                    continue;
                }
                parse_stream_event(&line, channel);
            }
            Ok(Ok(None)) => break, // EOF = 정상 종료
            Ok(Err(e)) => return Err(e.into()),
            Err(_) => {
                let _ = child.start_kill();
                let _ = channel.send(StreamEvent::Error {
                    message: "Claude 응답이 180초간 없어 중단했습니다. 다시 시도해주세요.".into(),
                });
                return Err(CliError::Subprocess(-1, "idle timeout (180s)".into()));
            }
        }
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
