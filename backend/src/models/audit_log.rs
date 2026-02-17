use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String,
    pub timestamp: String,
    pub actor_sub: String,
    pub actor_name: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub resource_name: String,
    pub details: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub actor: Option<String>,
    pub action: Option<String>,
    pub resource_id: Option<String>,
}

impl AuditLog {
    #[allow(clippy::too_many_arguments)]
    pub async fn record(
        pool: &SqlitePool,
        actor_sub: &str,
        actor_name: &str,
        action: &str,
        resource_type: &str,
        resource_id: &str,
        resource_name: &str,
        details: &serde_json::Value,
    ) -> Result<(), AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().to_rfc3339();
        let details_str = serde_json::to_string(details).unwrap_or_default();

        sqlx::query(
            r#"INSERT INTO audit_logs (id, timestamp, actor_sub, actor_name, action, resource_type, resource_id, resource_name, details)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(&id)
        .bind(&timestamp)
        .bind(actor_sub)
        .bind(actor_name)
        .bind(action)
        .bind(resource_type)
        .bind(resource_id)
        .bind(resource_name)
        .bind(&details_str)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn list(
        pool: &SqlitePool,
        query: &AuditLogQuery,
    ) -> Result<Vec<AuditLog>, AppError> {
        let limit = query.limit.unwrap_or(50).min(200);
        let offset = query.offset.unwrap_or(0);

        // Build dynamic query
        let mut sql = String::from(
            "SELECT id, timestamp, actor_sub, actor_name, action, resource_type, resource_id, resource_name, details FROM audit_logs WHERE 1=1",
        );
        let mut binds: Vec<String> = Vec::new();

        if let Some(ref actor) = query.actor {
            sql.push_str(" AND actor_sub = ?");
            binds.push(actor.clone());
        }
        if let Some(ref action) = query.action {
            sql.push_str(" AND action = ?");
            binds.push(action.clone());
        }
        if let Some(ref resource_id) = query.resource_id {
            sql.push_str(" AND resource_id = ?");
            binds.push(resource_id.clone());
        }

        sql.push_str(" ORDER BY timestamp DESC LIMIT ? OFFSET ?");

        let mut q = sqlx::query_as::<_, AuditLogRow>(&sql);
        for b in &binds {
            q = q.bind(b);
        }
        q = q.bind(limit).bind(offset);

        let rows = q.fetch_all(pool).await?;
        Ok(rows.into_iter().map(|r| r.into()).collect())
    }
}

#[derive(sqlx::FromRow)]
struct AuditLogRow {
    id: String,
    timestamp: String,
    actor_sub: String,
    actor_name: String,
    action: String,
    resource_type: String,
    resource_id: String,
    resource_name: String,
    details: String,
}

impl From<AuditLogRow> for AuditLog {
    fn from(row: AuditLogRow) -> Self {
        let details =
            serde_json::from_str(&row.details).unwrap_or(serde_json::Value::Object(Default::default()));
        Self {
            id: row.id,
            timestamp: row.timestamp,
            actor_sub: row.actor_sub,
            actor_name: row.actor_name,
            action: row.action,
            resource_type: row.resource_type,
            resource_id: row.resource_id,
            resource_name: row.resource_name,
            details,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;

    async fn test_pool() -> SqlitePool {
        let db = Db::connect("sqlite::memory:").await.unwrap();
        db.migrate().await.unwrap();
        db.pool
    }

    #[tokio::test]
    async fn record_and_list() {
        let pool = test_pool().await;
        AuditLog::record(
            &pool,
            "user-1",
            "Alice",
            "create",
            "deployment",
            "dep-123",
            "prod-dns",
            &serde_json::json!({"service_type": "crow_dns"}),
        )
        .await
        .unwrap();

        let logs = AuditLog::list(&pool, &AuditLogQuery {
            limit: None,
            offset: None,
            actor: None,
            action: None,
            resource_id: None,
        })
        .await
        .unwrap();

        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].actor_sub, "user-1");
        assert_eq!(logs[0].action, "create");
        assert_eq!(logs[0].resource_id, "dep-123");
        assert_eq!(logs[0].resource_name, "prod-dns");
    }

    #[tokio::test]
    async fn list_filters_by_action() {
        let pool = test_pool().await;
        AuditLog::record(&pool, "u", "U", "create", "deployment", "1", "a", &serde_json::json!({}))
            .await
            .unwrap();
        AuditLog::record(&pool, "u", "U", "delete", "deployment", "1", "a", &serde_json::json!({}))
            .await
            .unwrap();

        let logs = AuditLog::list(&pool, &AuditLogQuery {
            limit: None,
            offset: None,
            actor: None,
            action: Some("delete".into()),
            resource_id: None,
        })
        .await
        .unwrap();

        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].action, "delete");
    }
}
