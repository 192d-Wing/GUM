// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
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

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
    use serde_json::json;

    fn test_metadata() -> OidcProviderMetadata {
        OidcProviderMetadata {
            authorization_endpoint: "https://idp.example.com/authorize".into(),
            token_endpoint: "https://idp.example.com/token".into(),
            userinfo_endpoint: None,
            issuer: "https://idp.example.com".into(),
        }
    }

    fn test_oidc_config() -> OidcConfig {
        OidcConfig {
            enabled: true,
            issuer_url: "https://idp.example.com".into(),
            client_id: "my-client".into(),
            client_secret: "secret".into(),
            redirect_uri: "http://localhost:4000/api/v1/auth/oidc/callback".into(),
            scopes: "openid profile email".into(),
            roles_claim: "roles".into(),
        }
    }

    fn make_jwt(claims: &serde_json::Value) -> String {
        let header = URL_SAFE_NO_PAD.encode(b"{\"alg\":\"RS256\",\"typ\":\"JWT\"}");
        let payload = URL_SAFE_NO_PAD.encode(claims.to_string().as_bytes());
        format!("{header}.{payload}.fake-signature")
    }

    #[test]
    fn build_auth_url_contains_all_params() {
        let url = build_auth_url(
            &test_metadata(),
            &test_oidc_config(),
            "state123",
            "nonce456",
        );
        assert!(url.starts_with("https://idp.example.com/authorize?"));
        assert!(url.contains("client_id=my-client"));
        assert!(url.contains("response_type=code"));
        assert!(url.contains("state=state123"));
        assert!(url.contains("nonce=nonce456"));
        assert!(url.contains("redirect_uri="));
    }

    #[test]
    fn build_auth_url_encodes_spaces() {
        let url = build_auth_url(&test_metadata(), &test_oidc_config(), "s", "n");
        assert!(url.contains("scope=openid+profile+email"));
    }

    #[test]
    fn extract_user_info_standard_claims() {
        let claims = json!({
            "sub": "user-42",
            "name": "Alice",
            "email": "alice@example.com",
            "roles": ["admin", "viewer"]
        });
        let jwt = make_jwt(&claims);
        let info = extract_user_info(&jwt, "roles").unwrap();
        assert_eq!(info.sub, "user-42");
        assert_eq!(info.name, "Alice");
        assert_eq!(info.email, "alice@example.com");
        assert_eq!(info.roles, vec!["admin", "viewer"]);
    }

    #[test]
    fn extract_user_info_preferred_username_fallback() {
        let claims = json!({
            "sub": "user-99",
            "preferred_username": "bob",
            "email": "bob@example.com"
        });
        let jwt = make_jwt(&claims);
        let info = extract_user_info(&jwt, "roles").unwrap();
        assert_eq!(info.name, "bob");
    }

    #[test]
    fn extract_user_info_malformed_jwt() {
        let result = extract_user_info("not-a-jwt", "roles");
        assert!(result.is_err());
    }

    #[test]
    fn extract_roles_from_array() {
        let claims = json!({ "roles": ["admin", "viewer"] });
        assert_eq!(extract_roles(&claims, "roles"), vec!["admin", "viewer"]);
    }

    #[test]
    fn extract_roles_nested_dot_path() {
        let claims = json!({ "realm_access": { "roles": ["admin"] } });
        assert_eq!(extract_roles(&claims, "realm_access.roles"), vec!["admin"]);
    }

    #[test]
    fn extract_roles_comma_separated_string() {
        let claims = json!({ "roles": "admin,viewer" });
        assert_eq!(extract_roles(&claims, "roles"), vec!["admin", "viewer"]);
    }
}
