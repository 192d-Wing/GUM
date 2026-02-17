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

fn default_auth_type() -> DeploymentAuthType {
    DeploymentAuthType::None
}

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
        let tags: HashMap<String, String> = serde_json::from_str(&self.tags).unwrap_or_default();
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
        let auth_type = req
            .auth_type
            .unwrap_or(DeploymentAuthType::None)
            .to_string();

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

        sqlx::query("UPDATE deployments SET health_status = ?, last_seen = ? WHERE id = ?")
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;
    use std::collections::HashMap;

    async fn test_pool() -> SqlitePool {
        let db = Db::connect("sqlite::memory:").await.unwrap();
        db.migrate().await.unwrap();
        db.pool
    }

    fn make_create_request(name: &str) -> CreateDeploymentRequest {
        CreateDeploymentRequest {
            name: name.to_string(),
            service_type: ServiceType::CrowDns,
            endpoint_url: "https://example.com".to_string(),
            tags: HashMap::new(),
            auth_type: None,
            auth_credential: None,
        }
    }

    #[tokio::test]
    async fn create_and_list() {
        let pool = test_pool().await;
        let req = make_create_request("my-deployment");
        Deployment::create(&pool, req).await.unwrap();

        let list = Deployment::list(&pool).await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "my-deployment");
    }

    #[tokio::test]
    async fn get_missing_id() {
        let pool = test_pool().await;
        let result = Deployment::get(&pool, "nonexistent-id").await;
        assert!(matches!(result, Err(crate::error::AppError::NotFound(_))));
    }

    #[tokio::test]
    async fn update_changes_name() {
        let pool = test_pool().await;
        let created = Deployment::create(&pool, make_create_request("original-name"))
            .await
            .unwrap();

        let updated = Deployment::update(
            &pool,
            &created.id,
            UpdateDeploymentRequest {
                name: Some("new-name".to_string()),
                endpoint_url: None,
                tags: None,
                auth_type: None,
                auth_credential: None,
            },
        )
        .await
        .unwrap();

        assert_eq!(updated.name, "new-name");
    }

    #[tokio::test]
    async fn update_preserves_unspecified_fields() {
        let pool = test_pool().await;

        let mut tags = HashMap::new();
        tags.insert("env".to_string(), "prod".to_string());
        tags.insert("region".to_string(), "us-east".to_string());

        let req = CreateDeploymentRequest {
            name: "tagged-deployment".to_string(),
            service_type: ServiceType::Ntp,
            endpoint_url: "https://ntp.example.com".to_string(),
            tags,
            auth_type: None,
            auth_credential: None,
        };
        let created = Deployment::create(&pool, req).await.unwrap();

        // Update only the name, leaving tags unspecified (None)
        let updated = Deployment::update(
            &pool,
            &created.id,
            UpdateDeploymentRequest {
                name: Some("renamed".to_string()),
                endpoint_url: None,
                tags: None,
                auth_type: None,
                auth_credential: None,
            },
        )
        .await
        .unwrap();

        assert_eq!(updated.name, "renamed");
        assert_eq!(updated.tags.get("env").unwrap(), "prod");
        assert_eq!(updated.tags.get("region").unwrap(), "us-east");
        assert_eq!(updated.endpoint_url, "https://ntp.example.com");
    }

    #[tokio::test]
    async fn delete_removes_deployment() {
        let pool = test_pool().await;
        let created = Deployment::create(&pool, make_create_request("to-delete"))
            .await
            .unwrap();

        Deployment::delete(&pool, &created.id).await.unwrap();

        let list = Deployment::list(&pool).await.unwrap();
        assert!(list.is_empty());
    }

    #[tokio::test]
    async fn delete_missing_id() {
        let pool = test_pool().await;
        let result = Deployment::delete(&pool, "nonexistent-id").await;
        assert!(matches!(result, Err(crate::error::AppError::NotFound(_))));
    }

    #[tokio::test]
    async fn fleet_health_counts_by_status() {
        let pool = test_pool().await;

        let d1 = Deployment::create(&pool, make_create_request("deploy-alpha"))
            .await
            .unwrap();
        let d2 = Deployment::create(&pool, make_create_request("deploy-beta"))
            .await
            .unwrap();
        let d3 = Deployment::create(&pool, make_create_request("deploy-gamma"))
            .await
            .unwrap();

        Deployment::update_health(&pool, &d1.id, &HealthStatus::Healthy)
            .await
            .unwrap();
        Deployment::update_health(&pool, &d2.id, &HealthStatus::Unhealthy)
            .await
            .unwrap();
        Deployment::update_health(&pool, &d3.id, &HealthStatus::Degraded)
            .await
            .unwrap();

        let health = Deployment::fleet_health(&pool).await.unwrap();

        assert_eq!(health.total, 3);
        assert_eq!(health.healthy, 1);
        assert_eq!(health.unhealthy, 1);
        assert_eq!(health.degraded, 1);
        assert_eq!(health.unknown, 0);
    }

    #[tokio::test]
    async fn into_deployment_malformed_json_tags() {
        let pool = test_pool().await;

        // Insert a raw row with malformed JSON in the tags column
        sqlx::query(
            "INSERT INTO deployments (id, name, service_type, endpoint_url, health_status, created_at, tags, auth_type, auth_credential) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("bad-tags-id")
        .bind("bad-tags-deploy")
        .bind("crow_dns")
        .bind("https://example.com")
        .bind("unknown")
        .bind("2025-01-01T00:00:00Z")
        .bind("NOT VALID JSON {{{")
        .bind("none")
        .bind(Option::<String>::None)
        .execute(&pool)
        .await
        .unwrap();

        let deployment = Deployment::get(&pool, "bad-tags-id").await.unwrap();
        assert!(deployment.tags.is_empty());
    }
}
