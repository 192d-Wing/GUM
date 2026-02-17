use axum::extract::{Query, State};
use axum::routing::get;
use axum::{Json, Router};
use std::sync::Arc;

use crate::AppState;
use crate::error::AppError;
use crate::models::{AuditLog, AuditLogQuery};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/api/v1/audit-logs", get(list_audit_logs))
}

async fn list_audit_logs(
    State(state): State<Arc<AppState>>,
    Query(query): Query<AuditLogQuery>,
) -> Result<Json<Vec<AuditLog>>, AppError> {
    let logs = AuditLog::list(&state.db.pool, &query).await?;
    Ok(Json(logs))
}
