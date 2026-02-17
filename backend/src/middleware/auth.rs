use axum::extract::State;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum_extra::extract::CookieJar;
use std::sync::Arc;

use crate::AppState;
use crate::routes::auth::extract_session;

/// Middleware that validates the session cookie for protected routes.
/// When OIDC is disabled, all requests pass through (stub auth mode).
/// When OIDC is enabled, requests without a valid session get 401.
pub async fn require_auth(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
    request: Request<axum::body::Body>,
    next: Next,
) -> Response {
    // If OIDC is disabled, skip auth checks (stub mode)
    if !state.oidc_enabled() {
        return next.run(request).await;
    }

    match extract_session(&jar, &state.session_key) {
        Some(_session) => next.run(request).await,
        None => {
            let body = serde_json::json!({
                "error": "authentication required",
                "authenticated": false,
            });
            (axum::http::StatusCode::UNAUTHORIZED, axum::Json(body)).into_response()
        }
    }
}
