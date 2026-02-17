use std::sync::Arc;
use axum::extract::{Path, State};
use axum::routing::get;
use axum::{Json, Router};

use crate::error::AppError;
use crate::models::{CreateDeploymentRequest, Deployment, UpdateDeploymentRequest};
use crate::AppState;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/v1/deployments", get(list_deployments).post(create_deployment))
        .route(
            "/api/v1/deployments/{id}",
            get(get_deployment).put(update_deployment).delete(delete_deployment),
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
    Json(req): Json<CreateDeploymentRequest>,
) -> Result<Json<Deployment>, AppError> {
    if req.name.is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    if req.endpoint_url.is_empty() {
        return Err(AppError::BadRequest("endpoint_url is required".into()));
    }
    let deployment = Deployment::create(&state.db.pool, req).await?;
    Ok(Json(deployment))
}

async fn update_deployment(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<UpdateDeploymentRequest>,
) -> Result<Json<Deployment>, AppError> {
    let deployment = Deployment::update(&state.db.pool, &id, req).await?;
    Ok(Json(deployment))
}

async fn delete_deployment(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    Deployment::delete(&state.db.pool, &id).await?;
    Ok(Json(serde_json::json!({ "deleted": true })))
}
