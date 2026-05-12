// SUNNY Story Maker — Tauri 데스크탑 앱 (= 글로벌 룰 16 BYOK 정통)
//
// 작가 흐름:
// 1. 가입 (story.sunnytoon.com Supabase) → trial_30days 자동 발급
// 2. .exe 다운로드 → 더블클릭
// 3. 첫 실행 = login (Supabase) → JWT 라이선스 받음 → ~/.sunny-story-maker/license.json 저장
// 4. 사용 = `claude` CLI subprocess 호출 (= 작가 본인 Pro/Max 구독)
// 5. 7일 후 = 자동 라이선스 재발급 → 사장님 plan 변경 = 즉시 반영
//
// ★ 2026-05-13 정정: OAuth 토큰 직접 Messages API 호출 path = 차단됨 (HTTP 401).
//   진짜 작동 path = `claude` CLI subprocess (Anthropic 공식 도구, 약관 OK).
//   route.ts:streamViaClaudeCode 함수를 Rust로 이식 = claude_cli.rs.

mod claude_cli;
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

// ─── claude CLI 상태 (= 시작 시 검증용) ─────────────────────

#[derive(Debug, Serialize)]
pub struct ClaudeCliStatus {
    pub available: bool,
    /// "ready" | "not-installed" | "not-logged-in"
    pub reason: String,
    pub error: Option<String>,
}

#[tauri::command]
async fn claude_cli_status() -> ClaudeCliStatus {
    let reason = claude_cli::status_reason().to_string();
    let (available, error) = match reason.as_str() {
        "ready" => (true, None),
        "not-installed" => (
            false,
            Some(
                "Claude Code CLI가 설치되지 않았습니다. https://claude.com/code 에서 설치 후 다시 시작해주세요."
                    .to_string(),
            ),
        ),
        "not-logged-in" => (
            false,
            Some(
                "Claude 로그인이 필요합니다. 아래 '터미널 열어 로그인하기' 버튼을 누르세요. 터미널 창에서 안내된 OAuth URL을 브라우저로 열어 로그인하면 완료됩니다."
                    .to_string(),
            ),
        ),
        _ => (false, Some("알 수 없는 상태입니다.".to_string())),
    };
    ClaudeCliStatus { available, reason, error }
}

#[tauri::command]
async fn claude_open_login_terminal() -> Result<(), String> {
    claude_cli::open_login_terminal()
}

// 옛 호환 — anthropic_oauth_status를 호출하던 코드가 있을 수 있음 (라이선스 페이지 등).
// 같은 결과로 claude_cli_status를 위임.
#[tauri::command]
async fn anthropic_oauth_status() -> ClaudeCliStatus {
    claude_cli_status().await
}

// ─── Stream Agent (= claude CLI subprocess stream) ──────────

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

/// Stream agent — `claude` CLI subprocess 호출 → stdout SSE → Channel로 frontend 전송.
/// JS 측: `invoke("stream_agent", { args, channel })` + channel.onmessage = (event) => ...
#[tauri::command]
async fn stream_agent(args: StreamArgs, channel: Channel<StreamEvent>) -> Result<(), String> {
    match claude_cli::stream(&args.system_prompt, &args.user_message, &args.model, &channel).await {
        Ok(_) => {
            let _ = channel.send(StreamEvent::Done);
            Ok(())
        }
        Err(e) => {
            // Error 이벤트는 claude_cli::stream 내부에서 이미 send 되었을 가능성이 큼.
            // 보장 차원에서 한 번 더 send (frontend = 중복 무시).
            let msg = e.to_string();
            let _ = channel.send(StreamEvent::Error { message: msg.clone() });
            let _ = channel.send(StreamEvent::Done);
            Err(msg)
        }
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
            claude_cli_status,
            claude_open_login_terminal,
            anthropic_oauth_status, // 옛 호환
            stream_agent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
