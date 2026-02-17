use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::config::OidcConfig;

/// OIDC provider metadata fetched from `/.well-known/openid-configuration`.
#[derive(Debug, Clone, Deserialize)]
pub struct OidcProviderMetadata {
    pub authorization_endpoint: String,
    pub token_endpoint: String,
    #[serde(default)]
    pub userinfo_endpoint: Option<String>,
    pub issuer: String,
}

/// Discover OIDC provider metadata.
pub async fn discover(
    http_client: &reqwest::Client,
    issuer_url: &str,
) -> Result<OidcProviderMetadata, Box<dyn std::error::Error + Send + Sync>> {
    let well_known = format!(
        "{}/.well-known/openid-configuration",
        issuer_url.trim_end_matches('/')
    );
    let metadata: OidcProviderMetadata = http_client.get(&well_known).send().await?.json().await?;
    Ok(metadata)
}

/// Build the OIDC authorization URL for the login redirect.
pub fn build_auth_url(
    metadata: &OidcProviderMetadata,
    config: &OidcConfig,
    state: &str,
    nonce: &str,
) -> String {
    format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&nonce={}",
        metadata.authorization_endpoint,
        urlencoded(&config.client_id),
        urlencoded(&config.redirect_uri),
        urlencoded(&config.scopes),
        urlencoded(state),
        urlencoded(nonce),
    )
}

/// Exchange the authorization code for tokens.
pub async fn exchange_code(
    http_client: &reqwest::Client,
    metadata: &OidcProviderMetadata,
    config: &OidcConfig,
    code: &str,
) -> Result<TokenResponse, Box<dyn std::error::Error + Send + Sync>> {
    let resp = http_client
        .post(&metadata.token_endpoint)
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", &config.redirect_uri),
            ("client_id", &config.client_id),
            ("client_secret", &config.client_secret),
        ])
        .send()
        .await?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("token exchange failed: {body}").into());
    }

    let token_resp: TokenResponse = resp.json().await?;
    Ok(token_resp)
}

/// Extract user info from the ID token JWT payload.
pub fn extract_user_info(
    id_token: &str,
    roles_claim: &str,
) -> Result<OidcUserInfo, Box<dyn std::error::Error + Send + Sync>> {
    // JWT is header.payload.signature — we need the payload
    let parts: Vec<&str> = id_token.splitn(3, '.').collect();
    if parts.len() < 2 {
        return Err("malformed id_token".into());
    }

    let payload_bytes = URL_SAFE_NO_PAD
        .decode(parts[1])
        .or_else(|_| base64::engine::general_purpose::STANDARD.decode(parts[1]))?;
    let claims: Value = serde_json::from_slice(&payload_bytes)?;

    let sub = claims["sub"].as_str().unwrap_or("unknown").to_string();
    let name = claims["name"]
        .as_str()
        .or_else(|| claims["preferred_username"].as_str())
        .unwrap_or(&sub)
        .to_string();
    let email = claims["email"].as_str().unwrap_or("").to_string();
    let roles = extract_roles(&claims, roles_claim);

    Ok(OidcUserInfo {
        sub,
        name,
        email,
        roles,
    })
}

/// Extract roles from OIDC claims.
/// Supports top-level arrays, nested objects (e.g., "realm_access.roles"), and comma-separated strings.
fn extract_roles(claims: &Value, roles_claim: &str) -> Vec<String> {
    let mut value = claims;
    for part in roles_claim.split('.') {
        value = &value[part];
    }

    match value {
        Value::Array(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect(),
        Value::String(s) => s.split(',').map(|r| r.trim().to_string()).collect(),
        _ => vec![],
    }
}

fn urlencoded(s: &str) -> String {
    s.replace(' ', "+")
        .replace('&', "%26")
        .replace('=', "%3D")
        .replace('?', "%3F")
        .replace('#', "%23")
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub id_token: Option<String>,
    #[serde(default)]
    pub refresh_token: Option<String>,
    #[serde(default)]
    pub expires_in: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct OidcUserInfo {
    pub sub: String,
    pub name: String,
    pub email: String,
    pub roles: Vec<String>,
}
