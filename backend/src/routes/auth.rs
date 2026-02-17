// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Redirect, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use axum_extra::extract::CookieJar;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

use crate::AppState;
use crate::auth::session::Session;

pub const SESSION_COOKIE: &str = "gum_session";

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/v1/auth/me", get(auth_me))
        .route("/api/v1/auth/logout", post(auth_logout))
        .route("/api/v1/auth/oidc/login", get(oidc_login))
        .route("/api/v1/auth/oidc/callback", get(oidc_callback))
}

/// GET /api/v1/auth/me — Returns the current user from session cookie.
async fn auth_me(State(state): State<Arc<AppState>>, jar: CookieJar) -> Response {
    match extract_session(&jar, &state.session_key) {
        Some(session) => Json(json!({
            "authenticated": true,
            "sub": session.sub,
            "name": session.name,
            "email": session.email,
            "roles": session.roles,
        }))
        .into_response(),
        None => {
            // If OIDC is disabled, return stub admin user
            if !state.oidc_enabled() {
                return Json(json!({
                    "authenticated": true,
                    "sub": "admin",
                    "name": "Admin User",
                    "email": "admin@gum.local",
                    "roles": ["admin"],
                }))
                .into_response();
            }
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "authenticated": false,
                    "error": "not authenticated",
                })),
            )
                .into_response()
        }
    }
}

/// POST /api/v1/auth/logout — Clears the session cookie.
async fn auth_logout() -> impl IntoResponse {
    let cookie = format!("{SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    ([("set-cookie", cookie)], Json(json!({ "success": true })))
}

/// GET /api/v1/auth/oidc/login — Redirects to the OIDC provider's authorization endpoint.
async fn oidc_login(State(state): State<Arc<AppState>>) -> Response {
    let metadata = match &state.oidc_metadata {
        Some(m) => m,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "error": "OIDC not configured" })),
            )
                .into_response();
        }
    };

    // Generate CSRF state and nonce
    let csrf_state = uuid::Uuid::new_v4().to_string();
    let nonce = uuid::Uuid::new_v4().to_string();

    let auth_url =
        crate::auth::oidc::build_auth_url(metadata, &state.config.oidc, &csrf_state, &nonce);

    // Store nonce keyed by CSRF token for the callback
    state.oidc_pending.write().await.insert(csrf_state, nonce);

    Redirect::temporary(&auth_url).into_response()
}

#[derive(Debug, Deserialize)]
struct OidcCallbackParams {
    code: String,
    state: String,
}

/// GET /api/v1/auth/oidc/callback — Exchanges the authorization code, creates a session cookie.
async fn oidc_callback(
    State(state): State<Arc<AppState>>,
    Query(params): Query<OidcCallbackParams>,
) -> Response {
    let metadata = match &state.oidc_metadata {
        Some(m) => m,
        None => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "error": "OIDC not configured" })),
            )
                .into_response();
        }
    };

    // Look up and remove the nonce for this CSRF token
    let _nonce = match state.oidc_pending.write().await.remove(&params.state) {
        Some(n) => n,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "invalid or expired OIDC state" })),
            )
                .into_response();
        }
    };

    // Exchange authorization code for tokens
    let token_resp = match crate::auth::oidc::exchange_code(
        &state.http_client,
        metadata,
        &state.config.oidc,
        &params.code,
    )
    .await
    {
        Ok(resp) => resp,
        Err(e) => {
            tracing::error!("OIDC code exchange failed: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "authentication failed" })),
            )
                .into_response();
        }
    };

    // Extract user info from ID token
    let id_token = match &token_resp.id_token {
        Some(t) => t,
        None => {
            tracing::error!("No id_token in token response");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "missing id_token" })),
            )
                .into_response();
        }
    };

    let user_info =
        match crate::auth::oidc::extract_user_info(id_token, &state.config.oidc.roles_claim) {
            Ok(info) => info,
            Err(e) => {
                tracing::error!("Failed to extract user info from id_token: {e}");
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "failed to parse id_token" })),
                )
                    .into_response();
            }
        };

    tracing::info!(
        sub = %user_info.sub,
        name = %user_info.name,
        roles = ?user_info.roles,
        "OIDC login successful"
    );

    // Create session
    let session = Session::new(
        user_info.sub,
        user_info.name,
        user_info.email,
        user_info.roles,
    );

    let cookie_value = match session.encode(&state.session_key) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("Failed to encode session: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "session creation failed" })),
            )
                .into_response();
        }
    };

    // Set httpOnly cookie and redirect to frontend
    let cookie =
        format!("{SESSION_COOKIE}={cookie_value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800");
    ([("set-cookie", cookie)], Redirect::temporary("/")).into_response()
}

/// Extract and validate session from cookie jar.
pub fn extract_session(jar: &CookieJar, key: &[u8]) -> Option<Session> {
    let cookie = jar.get(SESSION_COOKIE)?;
    Session::decode(cookie.value(), key).ok()
}
