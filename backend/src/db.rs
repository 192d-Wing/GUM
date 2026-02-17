use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};

#[derive(Clone)]
pub struct Db {
    pub pool: SqlitePool,
}

impl Db {
    pub async fn connect(url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(url)
            .await?;
        Ok(Self { pool })
    }

    pub async fn migrate(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS deployments (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL UNIQUE,
                service_type TEXT NOT NULL CHECK(service_type IN ('crow_dns', 'ntp')),
                endpoint_url TEXT NOT NULL,
                health_status TEXT NOT NULL DEFAULT 'unknown'
                    CHECK(health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
                last_seen   TEXT,
                created_at  TEXT NOT NULL,
                tags        TEXT NOT NULL DEFAULT '{}',
                auth_type   TEXT NOT NULL DEFAULT 'none'
                    CHECK(auth_type IN ('none', 'bearer_token', 'basic_auth')),
                auth_credential TEXT
            );
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Migration: add auth columns if they don't exist (for existing databases)
        let _ = sqlx::query(
            "ALTER TABLE deployments ADD COLUMN auth_type TEXT NOT NULL DEFAULT 'none'",
        )
        .execute(&self.pool)
        .await;

        let _ = sqlx::query("ALTER TABLE deployments ADD COLUMN auth_credential TEXT")
            .execute(&self.pool)
            .await;

        // Audit log table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS audit_logs (
                id            TEXT PRIMARY KEY,
                timestamp     TEXT NOT NULL,
                actor_sub     TEXT NOT NULL,
                actor_name    TEXT NOT NULL,
                action        TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete')),
                resource_type TEXT NOT NULL DEFAULT 'deployment',
                resource_id   TEXT NOT NULL,
                resource_name TEXT NOT NULL DEFAULT '',
                details       TEXT NOT NULL DEFAULT '{}'
            );
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)",
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
