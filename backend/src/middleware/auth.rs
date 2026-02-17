use axum::extract::State;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum_extra::extract::CookieJar;
use std::sync::Arc;

use crate::AppState;
use crate::auth::session::Session;
use crate::routes::auth::extract_session;

/// Middleware that validates the session cookie for protected routes.
/// When OIDC is disabled, all requests pass through (stub auth mode)
/// with a stub admin session injected into request extensions.
/// When OIDC is enabled, requests without a valid session get 401.
pub async fn require_auth(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
    request: Request<axum::body::Body>,
    next: Next,
) -> Response {
    // If OIDC is disabled, inject a stub admin session
    if !state.oidc_enabled() {
        let stub = Session::new(
            "admin".into(),
            "Admin User".into(),
            "admin@gum.local".into(),
            vec!["admin".into()],
        );
        let mut request = request;
        request.extensions_mut().insert(stub);
        return next.run(request).await;
    }

    match extract_session(&jar, &state.session_key) {
        Some(session) => {
            let mut request = request;
            request.extensions_mut().insert(session);
            next.run(request).await
        }
        None => {
            let body = serde_json::json!({
                "error": "authentication required",
                "authenticated": false,
            });
            (axum::http::StatusCode::UNAUTHORIZED, axum::Json(body)).into_response()
        }
    }
}
