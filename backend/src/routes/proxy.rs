use axum::Router;
use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, Method};
use axum::response::Response;
use std::sync::Arc;

use crate::AppState;
use crate::error::AppError;
use crate::models::{Deployment, DeploymentAuthType};

pub fn routes() -> Router<Arc<AppState>> {
    // Catch-all proxy: any method, any sub-path under /api/v1/deployments/:id/proxy/
    Router::new().route(
        "/api/v1/deployments/{id}/proxy/{*rest}",
        axum::routing::any(proxy_handler),
    )
}

async fn proxy_handler(
    State(state): State<Arc<AppState>>,
    Path((id, rest)): Path<(String, String)>,
    method: Method,
    headers: HeaderMap,
    body: Body,
) -> Result<Response, AppError> {
    let deployment = Deployment::get(&state.db.pool, &id).await?;

    // Build the downstream URL
    let downstream_url = format!(
        "{}/{}",
        deployment.endpoint_url.trim_end_matches('/'),
        rest.trim_start_matches('/')
    );

    tracing::debug!(
        deployment = %deployment.name,
        downstream = %downstream_url,
        method = %method,
        "proxying request"
    );

    // Build the downstream request
    let mut req_builder = state.http_client.request(method, &downstream_url);

    // Forward relevant headers (skip hop-by-hop headers)
    for (name, value) in headers.iter() {
        let name_str = name.as_str().to_lowercase();
        if matches!(
            name_str.as_str(),
            "host" | "connection" | "transfer-encoding" | "upgrade" | "cookie"
        ) {
            continue;
        }
        req_builder = req_builder.header(name, value);
    }

    // Inject downstream service credential (strip user's session cookie, add service auth)
    match &deployment.auth_type {
        DeploymentAuthType::BearerToken => {
            if let Some(ref token) = deployment.auth_credential {
                req_builder = req_builder.header("authorization", format!("Bearer {token}"));
            }
        }
        DeploymentAuthType::BasicAuth => {
            if let Some(ref cred) = deployment.auth_credential {
                req_builder = req_builder.header("authorization", format!("Basic {cred}"));
            }
        }
        DeploymentAuthType::None => {}
    }

    // Forward body
    let body_bytes = axum::body::to_bytes(body, 10 * 1024 * 1024)
        .await
        .map_err(|e| AppError::Internal(format!("failed to read request body: {e}")))?;

    if !body_bytes.is_empty() {
        req_builder = req_builder.body(body_bytes);
    }

    // Execute the downstream request
    let downstream_resp = req_builder.send().await?;

    // Update health status based on response
    let health_status = if downstream_resp.status().is_success() {
        crate::models::HealthStatus::Healthy
    } else if downstream_resp.status().is_server_error() {
        crate::models::HealthStatus::Unhealthy
    } else {
        crate::models::HealthStatus::Degraded
    };
    // Fire-and-forget health update
    let pool = state.db.pool.clone();
    let deploy_id = id.clone();
    tokio::spawn(async move {
        let _ = Deployment::update_health(&pool, &deploy_id, &health_status).await;
    });

    // Build the response back to the frontend
    let status = downstream_resp.status();
    let resp_headers = downstream_resp.headers().clone();
    let resp_body = downstream_resp.bytes().await?;

    let mut response = axum::http::Response::builder().status(status);

    for (name, value) in resp_headers.iter() {
        let name_str = name.as_str().to_lowercase();
        if matches!(
            name_str.as_str(),
            "transfer-encoding" | "connection" | "content-length"
        ) {
            continue;
        }
        response = response.header(name, value);
    }

    let response = response
        .body(Body::from(resp_body))
        .map_err(|e| AppError::Internal(format!("failed to build response: {e}")))?;

    Ok(response)
}
