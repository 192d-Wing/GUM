use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};

use super::{DeploymentAuthType, HealthStatus, ServiceType};
use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Deployment {
    pub id: String,
    pub name: String,
    pub service_type: ServiceType,
    pub endpoint_url: String,
    pub health_status: HealthStatus,
    pub last_seen: Option<String>,
    pub created_at: String,
    pub tags: HashMap<String, String>,
    /// How GUM authenticates to this deployment when proxying requests.
    #[serde(default = "default_auth_type")]
    pub auth_type: DeploymentAuthType,
    /// The credential (token, base64-encoded user:pass, etc.). Not returned in list responses.
    #[serde(skip_serializing)]
    pub auth_credential: Option<String>,
}

fn default_auth_type() -> DeploymentAuthType { DeploymentAuthType::None }

#[derive(Debug, Deserialize)]
pub struct CreateDeploymentRequest {
    pub name: String,
    pub service_type: ServiceType,
    pub endpoint_url: String,
    #[serde(default)]
    pub tags: HashMap<String, String>,
    #[serde(default)]
    pub auth_type: Option<DeploymentAuthType>,
    pub auth_credential: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeploymentRequest {
    pub name: Option<String>,
    pub endpoint_url: Option<String>,
    pub tags: Option<HashMap<String, String>>,
    pub auth_type: Option<DeploymentAuthType>,
    pub auth_credential: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FleetHealth {
    pub total: usize,
    pub healthy: usize,
    pub degraded: usize,
    pub unhealthy: usize,
    pub unknown: usize,
    pub deployments: Vec<DeploymentHealthSummary>,
}

#[derive(Debug, Serialize)]
pub struct DeploymentHealthSummary {
    pub id: String,
    pub name: String,
    pub service_type: ServiceType,
    pub health_status: HealthStatus,
    pub last_seen: Option<String>,
}

// Row type for reading from SQLite
#[derive(Debug, FromRow)]
struct DeploymentRow {
    id: String,
    name: String,
    service_type: String,
    endpoint_url: String,
    health_status: String,
    last_seen: Option<String>,
    created_at: String,
    tags: String,
    auth_type: String,
    auth_credential: Option<String>,
}

impl DeploymentRow {
    fn into_deployment(self) -> Deployment {
        let tags: HashMap<String, String> =
            serde_json::from_str(&self.tags).unwrap_or_default();
        Deployment {
            id: self.id,
            name: self.name,
            service_type: ServiceType::from_str_value(&self.service_type)
                .unwrap_or(ServiceType::CrowDns),
            endpoint_url: self.endpoint_url,
            health_status: HealthStatus::from_str_value(&self.health_status),
            last_seen: self.last_seen,
            created_at: self.created_at,
            tags,
            auth_type: DeploymentAuthType::from_str_value(&self.auth_type),
            auth_credential: self.auth_credential,
        }
    }
}

impl Deployment {
    pub async fn list(pool: &SqlitePool) -> Result<Vec<Deployment>, AppError> {
        let rows: Vec<DeploymentRow> = sqlx::query_as(
            "SELECT id, name, service_type, endpoint_url, health_status, last_seen, created_at, tags, auth_type, auth_credential FROM deployments ORDER BY name"
        )
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.into_deployment()).collect())
    }

    pub async fn get(pool: &SqlitePool, id: &str) -> Result<Deployment, AppError> {
        let row: DeploymentRow = sqlx::query_as(
            "SELECT id, name, service_type, endpoint_url, health_status, last_seen, created_at, tags, auth_type, auth_credential FROM deployments WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("deployment '{id}' not found")))?;

        Ok(row.into_deployment())
    }

    pub async fn create(
        pool: &SqlitePool,
        req: CreateDeploymentRequest,
    ) -> Result<Deployment, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let now: DateTime<Utc> = Utc::now();
        let created_at = now.to_rfc3339();
        let service_type = req.service_type.to_string();
        let health_status = HealthStatus::Unknown.to_string();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_else(|_| "{}".into());
        let auth_type = req.auth_type.unwrap_or(DeploymentAuthType::None).to_string();

        sqlx::query(
            "INSERT INTO deployments (id, name, service_type, endpoint_url, health_status, created_at, tags, auth_type, auth_credential) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&req.name)
        .bind(&service_type)
        .bind(&req.endpoint_url)
        .bind(&health_status)
        .bind(&created_at)
        .bind(&tags_json)
        .bind(&auth_type)
        .bind(&req.auth_credential)
        .execute(pool)
        .await?;

        Deployment::get(pool, &id).await
    }

    pub async fn update(
        pool: &SqlitePool,
        id: &str,
        req: UpdateDeploymentRequest,
    ) -> Result<Deployment, AppError> {
        let existing = Deployment::get(pool, id).await?;

        let name = req.name.unwrap_or(existing.name);
        let endpoint_url = req.endpoint_url.unwrap_or(existing.endpoint_url);
        let tags = req.tags.unwrap_or(existing.tags);
        let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "{}".into());
        let auth_type = req.auth_type.unwrap_or(existing.auth_type).to_string();
        let auth_credential = req.auth_credential.or(existing.auth_credential);

        sqlx::query(
            "UPDATE deployments SET name = ?, endpoint_url = ?, tags = ?, auth_type = ?, auth_credential = ? WHERE id = ?"
        )
        .bind(&name)
        .bind(&endpoint_url)
        .bind(&tags_json)
        .bind(&auth_type)
        .bind(&auth_credential)
        .bind(id)
        .execute(pool)
        .await?;

        Deployment::get(pool, id).await
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        let result = sqlx::query("DELETE FROM deployments WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!("deployment '{id}' not found")));
        }
        Ok(())
    }

    pub async fn update_health(
        pool: &SqlitePool,
        id: &str,
        status: &HealthStatus,
    ) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        let status_str = status.to_string();

        sqlx::query(
            "UPDATE deployments SET health_status = ?, last_seen = ? WHERE id = ?"
        )
        .bind(&status_str)
        .bind(&now)
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn fleet_health(pool: &SqlitePool) -> Result<FleetHealth, AppError> {
        let deployments = Deployment::list(pool).await?;

        let mut healthy = 0;
        let mut degraded = 0;
        let mut unhealthy = 0;
        let mut unknown = 0;

        let summaries: Vec<DeploymentHealthSummary> = deployments
            .iter()
            .map(|d| {
                match d.health_status {
                    HealthStatus::Healthy => healthy += 1,
                    HealthStatus::Degraded => degraded += 1,
                    HealthStatus::Unhealthy => unhealthy += 1,
                    HealthStatus::Unknown => unknown += 1,
                }
                DeploymentHealthSummary {
                    id: d.id.clone(),
                    name: d.name.clone(),
                    service_type: d.service_type.clone(),
                    health_status: d.health_status.clone(),
                    last_seen: d.last_seen.clone(),
                }
            })
            .collect();

        Ok(FleetHealth {
            total: summaries.len(),
            healthy,
            degraded,
            unhealthy,
            unknown,
            deployments: summaries,
        })
    }
}
