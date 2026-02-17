use std::sync::Arc;
use axum::extract::State;
use axum::routing::get;
use axum::{Json, Router};
use serde_json::json;

use crate::error::AppError;
use crate::models::{Deployment, FleetHealth};
use crate::AppState;

/// Fleet health routes (protected — require auth).
pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/api/v1/fleet/health", get(fleet_health))
}

/// Readiness/liveness probe routes (public — no auth required).
pub fn health_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health/ready", get(readiness))
        .route("/health/live", get(liveness))
}

async fn fleet_health(
    State(state): State<Arc<AppState>>,
) -> Result<Json<FleetHealth>, AppError> {
    let health = Deployment::fleet_health(&state.db.pool).await?;
    Ok(Json(health))
}

/// GET /health/ready — Returns 200 if the backend can reach its database.
async fn readiness(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let db_ok = sqlx::query("SELECT 1")
        .execute(&state.db.pool)
        .await
        .is_ok();

    Json(json!({
        "ready": db_ok,
        "oidc_enabled": state.oidc_enabled(),
    }))
}

/// GET /health/live — Always returns 200 (process is alive).
async fn liveness() -> Json<serde_json::Value> {
    Json(json!({ "alive": true }))
}
