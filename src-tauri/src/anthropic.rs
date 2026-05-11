// Anthropic API 직접 stream (= 작가 본인 OAuth 토큰으로)
//
// 글로벌 룰 16 (BYOK 정통):
// - `~/.claude/.credentials.json` read = 작가 본인 OAuth access token
// - `Authorization: Bearer ${token}` + `anthropic-beta: oauth-2025-04-20`
// - 작가 Pro/Max 구독으로 호출 = 추가 비용 0
//
// 옛 패턴 (Vercel `app/api/agent/stream/route.ts:streamViaOAuth`)을 Rust로 이식.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const ANTHROPIC_MESSAGES_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";
const ANTHROPIC_OAUTH_BETA: &str = "oauth-2025-04-20";

#[derive(Debug, thiserror::Error)]
pub enum AnthropicError {
    #[error("Claude credentials not found at ~/.claude/.credentials.json")]
    CredentialsNotFound,
    #[error("OAuth token expired or missing — please run `claude /login`")]
    TokenInvalid,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("api error ({0}): {1}")]
    Api(u16, String),
}

#[derive(Debug, Deserialize)]
struct CredentialsFile {
    #[serde(rename = "claudeAiOauth")]
    oauth: Option<OAuthSection>,
}

#[derive(Debug, Deserialize)]
struct OAuthSection {
    #[serde(rename = "accessToken")]
    access_token: Option<String>,
    #[serde(rename = "expiresAt")]
    expires_at: Option<i64>,
}

fn credentials_path() -> Option<PathBuf> {
    let mut p = dirs::home_dir()?;
    p.push(".claude");
    p.push(".credentials.json");
    Some(p)
}

/// `~/.claude/.credentials.json`에서 OAuth access token 추출.
/// 만료 토큰 = None.
pub fn get_oauth_token() -> Result<String, AnthropicError> {
    let path = credentials_path().ok_or(AnthropicError::CredentialsNotFound)?;
    if !path.exists() {
        return Err(AnthropicError::CredentialsNotFound);
    }
    let data = std::fs::read_to_string(&path)?;
    let cred: CredentialsFile = serde_json::from_str(&data)?;
    let oauth = cred.oauth.ok_or(AnthropicError::TokenInvalid)?;
    let token = oauth.access_token.ok_or(AnthropicError::TokenInvalid)?;

    // 만료 검증 (millisecond timestamp)
    if let Some(expires_at) = oauth.expires_at {
        let now_ms = chrono::Utc::now().timestamp_millis();
        if expires_at < now_ms {
            return Err(AnthropicError::TokenInvalid);
        }
    }

    Ok(token)
}

#[derive(Debug, Serialize)]
pub struct StreamRequest {
    pub model: String,
    pub max_tokens: u32,
    pub system: String,
    pub messages: Vec<Message>,
    pub stream: bool,
}

#[derive(Debug, Serialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

/// Anthropic Messages API 호출 — 응답 = SSE stream.
/// 호출 측이 = response body를 stream으로 받아 = chunk별 처리.
pub async fn stream_messages(
    token: &str,
    model: &str,
    system_prompt: &str,
    user_message: &str,
) -> Result<reqwest::Response, AnthropicError> {
    let body = StreamRequest {
        model: model.to_string(),
        max_tokens: 8000,
        system: system_prompt.to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: user_message.to_string(),
        }],
        stream: true,
    };

    let client = reqwest::Client::new();
    let res = client
        .post(ANTHROPIC_MESSAGES_URL)
        .header("Authorization", format!("Bearer {}", token))
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("anthropic-beta", ANTHROPIC_OAUTH_BETA)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await?;

    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        return Err(AnthropicError::Api(status.as_u16(), text));
    }

    Ok(res)
}
