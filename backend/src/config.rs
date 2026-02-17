use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    #[serde(default = "default_host")]
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default = "default_database_url")]
    pub database_url: String,
    #[serde(default)]
    pub oidc: OidcConfig,
    /// HMAC secret for signing session cookies. Generate with e.g. `openssl rand -hex 32`.
    /// If blank, a random secret is generated at startup (sessions won't survive restarts).
    #[serde(default)]
    pub session_secret: String,
    /// Path to built frontend assets. When set, the backend serves the SPA.
    #[serde(default)]
    pub static_dir: String,
    /// Health polling interval in seconds. 0 = disabled.
    #[serde(default = "default_health_poll_interval")]
    pub health_poll_interval: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OidcConfig {
    /// Set to true to enable OIDC authentication. When false, stub auth is used.
    #[serde(default)]
    pub enabled: bool,
    /// OIDC issuer URL, e.g. "https://keycloak.example.com/realms/gum"
    #[serde(default)]
    pub issuer_url: String,
    /// OAuth2 client ID
    #[serde(default)]
    pub client_id: String,
    /// OAuth2 client secret
    #[serde(default)]
    pub client_secret: String,
    /// Redirect URI — must match the provider's allowed callback.
    /// Defaults to "http://localhost:4000/api/v1/auth/oidc/callback"
    #[serde(default = "default_redirect_uri")]
    pub redirect_uri: String,
    /// Scopes to request (space-separated). Defaults to "openid profile email".
    #[serde(default = "default_scopes")]
    pub scopes: String,
    /// OIDC claim that contains user roles. Defaults to "roles".
    #[serde(default = "default_roles_claim")]
    pub roles_claim: String,
}

impl Default for OidcConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            issuer_url: String::new(),
            client_id: String::new(),
            client_secret: String::new(),
            redirect_uri: default_redirect_uri(),
            scopes: default_scopes(),
            roles_claim: default_roles_claim(),
        }
    }
}

fn default_host() -> String { "127.0.0.1".into() }
fn default_port() -> u16 { 4000 }
fn default_database_url() -> String { "sqlite:gum.db?mode=rwc".into() }
fn default_health_poll_interval() -> u64 { 30 }
fn default_redirect_uri() -> String { "http://localhost:4000/api/v1/auth/oidc/callback".into() }
fn default_scopes() -> String { "openid profile email".into() }
fn default_roles_claim() -> String { "roles".into() }

impl AppConfig {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        // Try config file first, fall back to defaults
        let config_path = std::env::var("GUM_CONFIG")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("gum.toml"));

        if config_path.exists() {
            let contents = std::fs::read_to_string(&config_path)?;
            let config: AppConfig = toml::from_str(&contents)?;
            Ok(config)
        } else {
            tracing::info!("No config file found, using defaults");
            Ok(AppConfig {
                host: default_host(),
                port: default_port(),
                database_url: default_database_url(),
                oidc: OidcConfig::default(),
                session_secret: String::new(),
                static_dir: String::new(),
                health_poll_interval: default_health_poll_interval(),
            })
        }
    }

    /// Returns the session signing key. If no secret is configured, generates one at startup.
    pub fn session_key(&self) -> Vec<u8> {
        if self.session_secret.is_empty() {
            use rand::Rng;
            let mut rng = rand::thread_rng();
            let mut key = vec![0u8; 32];
            rng.fill(&mut key[..]);
            key
        } else {
            self.session_secret.as_bytes().to_vec()
        }
    }
}
