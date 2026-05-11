// SUNNY Story Maker — Tauri 데스크탑 앱 (= 글로벌 룰 16 BYOK 정통)
//
// 작가 흐름:
// 1. 가입 (story.sunnytoon.com Supabase) → trial_30days 자동 발급
// 2. .exe 다운로드 → 더블클릭
// 3. 첫 실행 = login (Supabase) → JWT 라이선스 받음 → ~/.sunny-story-maker/license.json 저장
// 4. 사용 = Anthropic API 직접 stream (= ~/.claude/.credentials.json OAuth 토큰)
// 5. 7일 후 = 자동 라이선스 재발급 → 사장님 plan 변경 = 즉시 반영

mod anthropic;
mod license;

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

// ─── 라이선스 명령 ──────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct LicenseStatus {
    pub valid: bool,
    pub plan: String,
    pub status: String,
    pub valid_until: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
async fn license_check_local() -> LicenseStatus {
    match license::load() {
        Ok(storage) => {
            let valid = license::is_valid(&storage);
            LicenseStatus {
                valid,
                plan: storage.plan,
                status: storage.status,
                valid_until: storage.valid_until,
                error: if valid { None } else { Some("expired or invalid".into()) },
            }
        }
        Err(e) => LicenseStatus {
            valid: false,
            plan: "unknown".into(),
            status: "missing".into(),
            valid_until: None,
            error: Some(e.to_string()),
        },
    }
}

#[tauri::command]
async fn license_save(token: String, plan: String, status: String, valid_until: Option<String>) -> Result<(), String> {
    let now = chrono::Utc::now();
    let expires = now + chrono::Duration::days(7);
    let storage = license::LicenseStorage {
        token,
        plan,
        status,
        valid_until,
        issued_at: now.to_rfc3339(),
        expires_at: expires.to_rfc3339(),
    };
    license::save(&storage).map_err(|e| e.to_string())
}

#[tauri::command]
async fn license_clear() -> Result<(), String> {
    license::clear().map_err(|e| e.to_string())
}

// ─── Anthropic OAuth 토큰 ──────────────────────────────────

#[derive(Debug, Serialize)]
pub struct OAuthStatus {
    pub available: bool,
    pub error: Option<String>,
}

#[tauri::command]
async fn anthropic_oauth_status() -> OAuthStatus {
    match anthropic::get_oauth_token() {
        Ok(_) => OAuthStatus { available: true, error: None },
        Err(e) => OAuthStatus { available: false, error: Some(e.to_string()) },
    }
}

// ─── Stream Agent (= Anthropic API 직접 stream) ────────────

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "event", rename_all = "snake_case")]
pub enum StreamEvent {
    Delta { text: String },
    Usage { input_tokens: u32, output_tokens: u32 },
    Error { message: String },
    Done,
}

#[derive(Debug, Deserialize)]
pub struct StreamArgs {
    pub model: String,
    #[serde(rename = "systemPrompt")]
    pub system_prompt: String,
    #[serde(rename = "userMessage")]
    pub user_message: String,
}

/// Stream agent — Channel을 통해 SSE delta를 클라이언트에 전송.
/// JS 측: `invoke("stream_agent", { args, channel })` + channel.onmessage = (event) => ...
#[tauri::command]
async fn stream_agent(args: StreamArgs, channel: Channel<StreamEvent>) -> Result<(), String> {
    use futures_util::StreamExt;
    use tokio::io::AsyncBufReadExt;

    let token = anthropic::get_oauth_token().map_err(|e| {
        let _ = channel.send(StreamEvent::Error {
            message: format!("OAuth 토큰 없음: {}. 'claude /login' 실행 후 다시 시도해주세요.", e),
        });
        e.to_string()
    })?;

    let res = anthropic::stream_messages(&token, &args.model, &args.system_prompt, &args.user_message)
        .await
        .map_err(|e| {
            let _ = channel.send(StreamEvent::Error { message: e.to_string() });
            e.to_string()
        })?;

    // SSE stream 파싱: bytes_stream() → StreamReader → BufReader → lines()
    let byte_stream = res
        .bytes_stream()
        .map(|r| r.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)));
    let reader = tokio_util::io::StreamReader::new(byte_stream);
    let mut lines = tokio::io::BufReader::new(reader).lines();

    let mut buf = String::new();
    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        if line.is_empty() {
            // 이벤트 종료 = buf flush
            if !buf.is_empty() {
                process_sse_chunk(&buf, &channel);
                buf.clear();
            }
            continue;
        }
        buf.push_str(&line);
        buf.push('\n');
    }
    if !buf.is_empty() {
        process_sse_chunk(&buf, &channel);
    }

    let _ = channel.send(StreamEvent::Done);
    Ok(())
}

fn process_sse_chunk(chunk: &str, channel: &Channel<StreamEvent>) {
    // SSE 이벤트 = "event: foo\ndata: {...}"
    let mut event_type: Option<&str> = None;
    let mut data_line: Option<&str> = None;
    for line in chunk.lines() {
        if let Some(rest) = line.strip_prefix("event:") {
            event_type = Some(rest.trim());
        } else if let Some(rest) = line.strip_prefix("data:") {
            data_line = Some(rest.trim());
        }
    }
    let (Some(event_type), Some(data_line)) = (event_type, data_line) else {
        return;
    };
    let parsed: serde_json::Value = match serde_json::from_str(data_line) {
        Ok(v) => v,
        Err(_) => return,
    };
    match event_type {
        "content_block_delta" => {
            if let Some(text) = parsed.get("delta").and_then(|d| d.get("text")).and_then(|t| t.as_str()) {
                let _ = channel.send(StreamEvent::Delta { text: text.to_string() });
            }
        }
        "message_delta" => {
            if let Some(usage) = parsed.get("usage") {
                let input = usage.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                let output = usage.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                let _ = channel.send(StreamEvent::Usage {
                    input_tokens: input,
                    output_tokens: output,
                });
            }
        }
        "error" => {
            if let Some(msg) = parsed.get("error").and_then(|e| e.get("message")).and_then(|m| m.as_str()) {
                let _ = channel.send(StreamEvent::Error { message: msg.to_string() });
            }
        }
        _ => {}
    }
}

// ─── Tauri 진입점 ───────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default()
            .level(if cfg!(debug_assertions) {
                log::LevelFilter::Info
            } else {
                log::LevelFilter::Warn
            })
            .build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            license_check_local,
            license_save,
            license_clear,
            anthropic_oauth_status,
            stream_agent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
