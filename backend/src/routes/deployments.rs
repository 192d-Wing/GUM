// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

use axum::extract::{Extension, Path, State};
use axum::routing::get;
use axum::{Json, Router};
use std::sync::Arc;

use crate::AppState;
use crate::auth::session::Session;
use crate::error::AppError;
use crate::models::{AuditLog, CreateDeploymentRequest, Deployment, UpdateDeploymentRequest};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/api/v1/deployments",
            get(list_deployments).post(create_deployment),
        )
        .route(
            "/api/v1/deployments/{id}",
            get(get_deployment)
                .put(update_deployment)
                .delete(delete_deployment),
        )
}

async fn list_deployments(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Deployment>>, AppError> {
    let deployments = Deployment::list(&state.db.pool).await?;
    Ok(Json(deployments))
}

async fn get_deployment(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Deployment>, AppError> {
    let deployment = Deployment::get(&state.db.pool, &id).await?;
    Ok(Json(deployment))
}

async fn create_deployment(
    State(state): State<Arc<AppState>>,
    Extension(session): Extension<Session>,
    Json(req): Json<CreateDeploymentRequest>,
) -> Result<Json<Deployment>, AppError> {
    session.require_admin()?;
    validate_deployment_input(&req.name, &req.endpoint_url, &req.tags)?;
    let deployment = Deployment::create(&state.db.pool, req).await?;

    AuditLog::record(
        &state.db.pool,
        &session.sub,
        &session.name,
        "create",
        "deployment",
        &deployment.id,
        &deployment.name,
        &serde_json::json!({"service_type": deployment.service_type.to_string()}),
    )
    .await
    .ok();

    Ok(Json(deployment))
}

/// Shared validation for deployment create/update.
fn validate_deployment_input(
    name: &str,
    endpoint_url: &str,
    tags: &std::collections::HashMap<String, String>,
) -> Result<(), AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    if name.len() > 255 {
        return Err(AppError::BadRequest(
            "name must be 255 characters or fewer".into(),
        ));
    }
    let url = endpoint_url.trim();
    if url.is_empty() {
        return Err(AppError::BadRequest("endpoint_url is required".into()));
    }
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(AppError::BadRequest(
            "endpoint_url must start with http:// or https://".into(),
        ));
    }
    if tags.len() > 50 {
        return Err(AppError::BadRequest("too many tags (max 50)".into()));
    }
    for (k, v) in tags {
        if k.len() > 128 || v.len() > 256 {
            return Err(AppError::BadRequest(
                "tag keys must be ≤128 chars and values ≤256 chars".into(),
            ));
        }
    }
    Ok(())
}

async fn update_deployment(
    State(state): State<Arc<AppState>>,
    Extension(session): Extension<Session>,
    Path(id): Path<String>,
    Json(req): Json<UpdateDeploymentRequest>,
) -> Result<Json<Deployment>, AppError> {
    session.require_admin()?;
    // Validate provided fields
    if let Some(ref name) = req.name {
        if name.trim().is_empty() {
            return Err(AppError::BadRequest("name cannot be empty".into()));
        }
        if name.len() > 255 {
            return Err(AppError::BadRequest(
                "name must be 255 characters or fewer".into(),
            ));
        }
    }
    if let Some(ref url) = req.endpoint_url
        && !url.starts_with("http://")
        && !url.starts_with("https://")
    {
        return Err(AppError::BadRequest(
            "endpoint_url must start with http:// or https://".into(),
        ));
    }
    if let Some(ref tags) = req.tags {
        if tags.len() > 50 {
            return Err(AppError::BadRequest("too many tags (max 50)".into()));
        }
        for (k, v) in tags {
            if k.len() > 128 || v.len() > 256 {
                return Err(AppError::BadRequest(
                    "tag keys must be ≤128 chars and values ≤256 chars".into(),
                ));
            }
        }
    }

    let old = Deployment::get(&state.db.pool, &id).await?;
    let deployment = Deployment::update(&state.db.pool, &id, req).await?;

    let mut changes = serde_json::Map::new();
    if old.name != deployment.name {
        changes.insert(
            "name".into(),
            serde_json::json!({"old": old.name, "new": deployment.name}),
        );
    }
    if old.endpoint_url != deployment.endpoint_url {
        changes.insert(
            "endpoint_url".into(),
            serde_json::json!({"old": old.endpoint_url, "new": deployment.endpoint_url}),
        );
    }
    if old.tags != deployment.tags {
        changes.insert(
            "tags".into(),
            serde_json::json!({"old": old.tags, "new": deployment.tags}),
        );
    }

    AuditLog::record(
        &state.db.pool,
        &session.sub,
        &session.name,
        "update",
        "deployment",
        &id,
        &deployment.name,
        &serde_json::Value::Object(changes),
    )
    .await
    .ok();

    Ok(Json(deployment))
}

async fn delete_deployment(
    State(state): State<Arc<AppState>>,
    Extension(session): Extension<Session>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    session.require_admin()?;
    // Get the deployment name before deleting for the audit log
    let deployment = Deployment::get(&state.db.pool, &id).await?;
    let name = deployment.name.clone();

    Deployment::delete(&state.db.pool, &id).await?;

    AuditLog::record(
        &state.db.pool,
        &session.sub,
        &session.name,
        "delete",
        "deployment",
        &id,
        &name,
        &serde_json::json!({
            "service_type": deployment.service_type.to_string(),
            "endpoint_url": deployment.endpoint_url,
            "tags": deployment.tags,
        }),
    )
    .await
    .ok();

    Ok(Json(serde_json::json!({ "deleted": true })))
}
