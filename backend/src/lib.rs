pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod middleware;
pub mod models;
pub mod proxy;
pub mod routes;

use tokio::sync::RwLock;

pub struct AppState {
    pub db: db::Db,
    pub http_client: reqwest::Client,
    pub config: config::AppConfig,
    pub session_key: Vec<u8>,
    pub oidc_metadata: Option<auth::oidc::OidcProviderMetadata>,
    pub oidc_pending: RwLock<std::collections::HashMap<String, String>>,
}

impl AppState {
    pub fn oidc_enabled(&self) -> bool {
        self.oidc_metadata.is_some()
    }
}
