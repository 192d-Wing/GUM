use axum::extract::{Query, State};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

use crate::AppState;
use crate::error::AppError;
use crate::models::{Deployment, DeploymentAuthType, HealthStatus};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/api/v1/fleet/analytics/top-queries",
            get(fleet_top_queries),
        )
        .route(
            "/api/v1/fleet/analytics/top-clients",
            get(fleet_top_clients),
        )
}

#[derive(Debug, Deserialize)]
struct TopParams {
    #[serde(default = "default_n")]
    n: usize,
}

fn default_n() -> usize {
    20
}

/// A single entry in the aggregated top-N list.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FleetTopEntry {
    pub key: String,
    pub count: u64,
    /// Which deployment(s) contributed this entry.
    pub deployments: Vec<String>,
}

/// Upstream response format from Crow DNS analytics endpoints.
#[derive(Debug, Deserialize)]
struct UpstreamTopEntry {
    key: String,
    count: u64,
}

/// GET /api/v1/fleet/analytics/top-queries — Aggregated top queries across all DNS deployments.
async fn fleet_top_queries(
    State(state): State<Arc<AppState>>,
    Query(params): Query<TopParams>,
) -> Result<Json<Vec<FleetTopEntry>>, AppError> {
    let entries = fan_out_analytics(&state, "/api/v1/analytics/top-queries", params.n).await?;
    Ok(Json(entries))
}

/// GET /api/v1/fleet/analytics/top-clients — Aggregated top clients across all deployments.
async fn fleet_top_clients(
    State(state): State<Arc<AppState>>,
    Query(params): Query<TopParams>,
) -> Result<Json<Vec<FleetTopEntry>>, AppError> {
    let entries = fan_out_analytics(&state, "/api/v1/analytics/top-clients", params.n).await?;
    Ok(Json(entries))
}

/// Fan out an analytics query to all healthy deployments and merge results.
async fn fan_out_analytics(
    state: &AppState,
    endpoint: &str,
    n: usize,
) -> Result<Vec<FleetTopEntry>, AppError> {
    let deployments = Deployment::list(&state.db.pool).await?;

    // Only query healthy deployments
    let healthy: Vec<_> = deployments
        .into_iter()
        .filter(|d| {
            d.health_status == HealthStatus::Healthy || d.health_status == HealthStatus::Degraded
        })
        .collect();

    // Fan out requests concurrently
    let mut handles = Vec::new();
    for deploy in &healthy {
        let client = state.http_client.clone();
        let url = format!(
            "{}/{}?n={}",
            deploy.endpoint_url.trim_end_matches('/'),
            endpoint.trim_start_matches('/'),
            n
        );
        let deploy_name = deploy.name.clone();
        let auth_type = deploy.auth_type.clone();
        let auth_credential = deploy.auth_credential.clone();

        handles.push(tokio::spawn(async move {
            let mut req = client.get(&url);
            // Inject downstream auth
            match &auth_type {
                DeploymentAuthType::BearerToken => {
                    if let Some(ref token) = auth_credential {
                        req = req.header("authorization", format!("Bearer {token}"));
                    }
                }
                DeploymentAuthType::BasicAuth => {
                    if let Some(ref cred) = auth_credential {
                        req = req.header("authorization", format!("Basic {cred}"));
                    }
                }
                DeploymentAuthType::None => {}
            }
            match req.send().await {
                Ok(resp) if resp.status().is_success() => {
                    match resp.json::<Vec<UpstreamTopEntry>>().await {
                        Ok(entries) => Some((deploy_name, entries)),
                        Err(e) => {
                            tracing::warn!(deployment = %deploy_name, error = %e, "Failed to parse analytics response");
                            None
                        }
                    }
                }
                Ok(resp) => {
                    tracing::warn!(deployment = %deploy_name, status = %resp.status(), "Analytics request failed");
                    None
                }
                Err(e) => {
                    tracing::warn!(deployment = %deploy_name, error = %e, "Analytics request error");
                    None
                }
            }
        }));
    }

    // Collect and merge results
    let mut merged: HashMap<String, (u64, Vec<String>)> = HashMap::new();
    for handle in handles {
        if let Ok(Some((deploy_name, entries))) = handle.await {
            for entry in entries {
                let e = merged
                    .entry(entry.key.clone())
                    .or_insert_with(|| (0, Vec::new()));
                e.0 += entry.count;
                e.1.push(deploy_name.clone());
            }
        }
    }

    // Sort by count descending and take top N
    let mut result: Vec<FleetTopEntry> = merged
        .into_iter()
        .map(|(key, (count, deployments))| FleetTopEntry {
            key,
            count,
            deployments,
        })
        .collect();
    result.sort_by(|a, b| b.count.cmp(&a.count));
    result.truncate(n);

    Ok(result)
}
