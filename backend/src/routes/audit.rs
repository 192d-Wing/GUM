// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

use axum::extract::{Extension, Query, State};
use axum::routing::get;
use axum::{Json, Router};
use std::sync::Arc;

use crate::AppState;
use crate::auth::session::Session;
use crate::error::AppError;
use crate::models::{AuditLog, AuditLogPage, AuditLogQuery};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/api/v1/audit-logs", get(list_audit_logs))
}

async fn list_audit_logs(
    State(state): State<Arc<AppState>>,
    Extension(session): Extension<Session>,
    Query(query): Query<AuditLogQuery>,
) -> Result<Json<AuditLogPage>, AppError> {
    session.require_admin()?;
    let page = AuditLog::list(&state.db.pool, &query).await?;
    Ok(Json(page))
}
