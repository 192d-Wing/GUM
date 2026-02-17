use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use std::sync::Arc;
use tokio::sync::RwLock;
use tower::ServiceExt;

use gum_backend::{AppState, config, db};

/// Build a test app with in-memory SQLite and stub auth (OIDC disabled).
async fn test_app() -> (Router, Arc<AppState>) {
    let db = db::Db::connect("sqlite::memory:").await.unwrap();
    db.migrate().await.unwrap();

    let config = config::AppConfig {
        host: "127.0.0.1".into(),
        port: 4000,
        database_url: "sqlite::memory:".into(),
        oidc: config::OidcConfig::default(),
        session_secret: "test-secret-key-32-bytes-long!!!".into(),
        static_dir: String::new(),
        health_poll_interval: 0,
        allowed_origins: Vec::new(),
        max_body_size: 2 * 1024 * 1024,
    };

    let state = Arc::new(AppState {
        db,
        http_client: reqwest::Client::new(),
        config,
        session_key: b"test-secret-key-32-bytes-long!!!".to_vec(),
        oidc_metadata: None,
        oidc_pending: RwLock::new(std::collections::HashMap::new()),
    });

    let app = gum_backend::routes::api_routes(state.clone()).with_state(state.clone());
    (app, state)
}

/// Send a request and return (status, body as serde_json::Value).
async fn send(app: Router, req: Request<Body>) -> (StatusCode, Value) {
    let resp = app.oneshot(req).await.unwrap();
    let status = resp.status();
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap_or(json!(null));
    (status, json)
}

/// Helper to create a deployment via POST and return the response JSON.
async fn create_test_deployment(app: &Router, name: &str) -> Value {
    let body = json!({
        "name": name,
        "service_type": "crow_dns",
        "endpoint_url": "http://localhost:9999"
    });
    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/deployments")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&body).unwrap()))
        .unwrap();
    let (status, json) = send(app.clone(), req).await;
    assert_eq!(status, StatusCode::OK);
    json
}

// ─── Deployment CRUD ─────────────────────────────────────────────────

#[tokio::test]
async fn list_empty() {
    let (app, _) = test_app().await;
    let req = Request::builder()
        .uri("/api/v1/deployments")
        .body(Body::empty())
        .unwrap();
    let (status, json) = send(app, req).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(json, json!([]));
}

#[tokio::test]
async fn create_success() {
    let (app, _) = test_app().await;
    let json = create_test_deployment(&app, "test-deploy").await;
    assert!(json["id"].is_string());
    assert_eq!(json["name"], "test-deploy");
    assert_eq!(json["health_status"], "unknown");
    assert_eq!(json["service_type"], "crow_dns");
}

#[tokio::test]
async fn create_missing_name() {
    let (app, _) = test_app().await;
    let body = json!({
        "name": "",
        "service_type": "crow_dns",
        "endpoint_url": "http://localhost:9999"
    });
    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/deployments")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&body).unwrap()))
        .unwrap();
    let (status, _) = send(app, req).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn create_missing_endpoint() {
    let (app, _) = test_app().await;
    let body = json!({
        "name": "test",
        "service_type": "crow_dns",
        "endpoint_url": ""
    });
    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/deployments")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&body).unwrap()))
        .unwrap();
    let (status, _) = send(app, req).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn get_not_found() {
    let (app, _) = test_app().await;
    let req = Request::builder()
        .uri("/api/v1/deployments/nonexistent-id")
        .body(Body::empty())
        .unwrap();
    let (status, json) = send(app, req).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(json["error"].is_string());
}

#[tokio::test]
async fn update_success() {
    let (app, _) = test_app().await;
    let created = create_test_deployment(&app, "original").await;
    let id = created["id"].as_str().unwrap();

    let update_body = json!({ "name": "updated-name" });
    let req = Request::builder()
        .method("PUT")
        .uri(format!("/api/v1/deployments/{id}"))
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&update_body).unwrap()))
        .unwrap();
    let (status, json) = send(app, req).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["name"], "updated-name");
}

#[tokio::test]
async fn delete_success() {
    let (app, _) = test_app().await;
    let created = create_test_deployment(&app, "to-delete").await;
    let id = created["id"].as_str().unwrap();

    // Delete
    let req = Request::builder()
        .method("DELETE")
        .uri(format!("/api/v1/deployments/{id}"))
        .body(Body::empty())
        .unwrap();
    let (status, _) = send(app.clone(), req).await;
    assert_eq!(status, StatusCode::OK);

    // Verify GET returns 404
    let req = Request::builder()
        .uri(format!("/api/v1/deployments/{id}"))
        .body(Body::empty())
        .unwrap();
    let (status, _) = send(app, req).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn delete_not_found() {
    let (app, _) = test_app().await;
    let req = Request::builder()
        .method("DELETE")
        .uri("/api/v1/deployments/nonexistent")
        .body(Body::empty())
        .unwrap();
    let (status, _) = send(app, req).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ─── Health probes ───────────────────────────────────────────────────

#[tokio::test]
async fn health_live() {
    let (app, _) = test_app().await;
    let req = Request::builder()
        .uri("/health/live")
        .body(Body::empty())
        .unwrap();
    let (status, json) = send(app, req).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["alive"], true);
}

#[tokio::test]
async fn health_ready() {
    let (app, _) = test_app().await;
    let req = Request::builder()
        .uri("/health/ready")
        .body(Body::empty())
        .unwrap();
    let (status, json) = send(app, req).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["ready"], true);
}

// ─── Auth (stub mode) ───────────────────────────────────────────────

#[tokio::test]
async fn auth_me_stub_mode() {
    let (app, _) = test_app().await;
    let req = Request::builder()
        .uri("/api/v1/auth/me")
        .body(Body::empty())
        .unwrap();
    let (status, json) = send(app, req).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["authenticated"], true);
    assert_eq!(json["roles"], json!(["admin"]));
}

#[tokio::test]
async fn auth_logout_clears_cookie() {
    let (app, _) = test_app().await;
    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/auth/logout")
        .body(Body::empty())
        .unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    let set_cookie = resp.headers().get("set-cookie").unwrap().to_str().unwrap();
    assert!(set_cookie.contains("Max-Age=0"));
}

// ─── Fleet health ────────────────────────────────────────────────────

#[tokio::test]
async fn fleet_health_counts() {
    let (app, state) = test_app().await;

    // Create 2 deployments
    let d1 = create_test_deployment(&app, "deploy-a").await;
    let d2 = create_test_deployment(&app, "deploy-b").await;
    let id1 = d1["id"].as_str().unwrap();
    let id2 = d2["id"].as_str().unwrap();

    // Update health statuses
    use gum_backend::models::HealthStatus;
    gum_backend::models::Deployment::update_health(&state.db.pool, id1, &HealthStatus::Healthy)
        .await
        .unwrap();
    gum_backend::models::Deployment::update_health(&state.db.pool, id2, &HealthStatus::Unhealthy)
        .await
        .unwrap();

    let req = Request::builder()
        .uri("/api/v1/fleet/health")
        .body(Body::empty())
        .unwrap();
    let (status, json) = send(app, req).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(json["total"], 2);
    assert_eq!(json["healthy"], 1);
    assert_eq!(json["unhealthy"], 1);
    assert_eq!(json["degraded"], 0);
    assert_eq!(json["unknown"], 0);
}
