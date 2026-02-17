use axum::Router;
use axum::extract::DefaultBodyLimit;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::catch_panic::CatchPanicLayer;
use tower_http::cors::{Any, CorsLayer};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use gum_backend::{AppState, auth, config, db, middleware, models, proxy, routes};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "gum_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = config::AppConfig::load().expect("failed to load configuration");
    let db = db::Db::connect(&config.database_url)
        .await
        .expect("failed to connect to database");
    db.migrate().await.expect("failed to run migrations");

    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("failed to build HTTP client");

    let session_key = config.session_key();

    // Discover OIDC provider if configured
    let oidc_metadata = if config.oidc.enabled {
        tracing::info!(
            "OIDC enabled, discovering provider at {}",
            config.oidc.issuer_url
        );
        match auth::oidc::discover(&http_client, &config.oidc.issuer_url).await {
            Ok(metadata) => {
                tracing::info!("OIDC provider discovered: {}", metadata.issuer);
                Some(metadata)
            }
            Err(e) => {
                tracing::error!("Failed to discover OIDC provider: {e}");
                tracing::warn!("Falling back to stub auth");
                None
            }
        }
    } else {
        tracing::info!("OIDC disabled, using stub auth");
        None
    };

    let state = Arc::new(AppState {
        db,
        http_client,
        config: config.clone(),
        session_key,
        oidc_metadata,
        oidc_pending: RwLock::new(std::collections::HashMap::new()),
    });

    // Start background health poller
    if config.health_poll_interval > 0 {
        let poll_state = state.clone();
        let interval_secs = config.health_poll_interval;
        tokio::spawn(async move {
            health_poll_loop(poll_state, interval_secs).await;
        });
        tracing::info!("Health poller started (interval: {}s)", interval_secs);
    }

    // CORS: restrict origins when configured, allow all in dev mode
    let cors = if config.allowed_origins.is_empty() {
        tracing::warn!("No allowed_origins configured — CORS allows all origins (dev mode)");
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    } else {
        let origins: Vec<_> = config
            .allowed_origins
            .iter()
            .filter_map(|o| o.parse().ok())
            .collect();
        tracing::info!("CORS allowed origins: {:?}", config.allowed_origins);
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([
                axum::http::Method::GET,
                axum::http::Method::POST,
                axum::http::Method::PUT,
                axum::http::Method::DELETE,
                axum::http::Method::OPTIONS,
            ])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::AUTHORIZATION,
                axum::http::header::ACCEPT,
            ])
            .allow_credentials(true)
    };

    // Rate limiter
    let rate_limit_state =
        middleware::rate_limit::RateLimitState::new(config.rate_limit, config.rate_limit_window);
    if config.rate_limit > 0 {
        rate_limit_state.start_cleanup_task();
        tracing::info!(
            "Rate limiting enabled: {} requests per {}s window",
            config.rate_limit,
            config.rate_limit_window
        );
    }

    let mut app = Router::new()
        .merge(routes::api_routes(state.clone()))
        // Per-IP rate limiting
        .layer(axum::middleware::from_fn_with_state(
            rate_limit_state,
            middleware::rate_limit::rate_limit,
        ))
        // Global body size limit (proxy has its own 10 MiB limit)
        .layer(DefaultBodyLimit::max(config.max_body_size))
        // Security headers
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::X_CONTENT_TYPE_OPTIONS,
            axum::http::HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::X_FRAME_OPTIONS,
            axum::http::HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::HeaderName::from_static("x-xss-protection"),
            axum::http::HeaderValue::from_static("1; mode=block"),
        ))
        // Catch panics so a single bad request can't crash the server
        .layer(CatchPanicLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    // Serve static frontend assets in production
    if !config.static_dir.is_empty() {
        let static_path = std::path::PathBuf::from(&config.static_dir);
        if static_path.exists() {
            tracing::info!("Serving static files from {}", config.static_dir);
            app = app.fallback_service(
                tower_http::services::ServeDir::new(&config.static_dir).fallback(
                    tower_http::services::ServeFile::new(static_path.join("index.html")),
                ),
            );
        } else {
            tracing::warn!(
                "static_dir '{}' does not exist, skipping",
                config.static_dir
            );
        }
    }

    let bind_addr = format!("{}:{}", config.host, config.port);
    tracing::info!("GUM backend listening on {}", bind_addr);

    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .expect("failed to bind");

    // Graceful shutdown: listen for SIGTERM/SIGINT
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("server error");

    tracing::info!("GUM backend shut down gracefully");
}

/// Wait for a shutdown signal (Ctrl+C or SIGTERM).
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => tracing::info!("Received Ctrl+C, shutting down..."),
        _ = terminate => tracing::info!("Received SIGTERM, shutting down..."),
    }
}

/// Background loop that periodically polls each deployment's health endpoint.
async fn health_poll_loop(state: Arc<AppState>, interval_secs: u64) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(interval_secs));
    // Skip the first immediate tick
    interval.tick().await;

    loop {
        interval.tick().await;

        let deployments = match models::Deployment::list(&state.db.pool).await {
            Ok(d) => d,
            Err(e) => {
                tracing::warn!("Health poller failed to list deployments: {e}");
                continue;
            }
        };

        for deployment in &deployments {
            let status =
                proxy::client::check_deployment_health(&state.http_client, deployment).await;

            if status != deployment.health_status {
                tracing::info!(
                    deployment = %deployment.name,
                    old = %deployment.health_status,
                    new = %status,
                    "Health status changed"
                );
            }

            let _ =
                models::Deployment::update_health(&state.db.pool, &deployment.id, &status).await;
        }
    }
}
