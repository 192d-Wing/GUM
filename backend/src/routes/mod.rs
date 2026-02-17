pub mod auth;
mod deployments;
mod fleet_analytics;
mod fleet_ws;
mod health_overview;
mod proxy;

use std::sync::Arc;
use axum::middleware as axum_mw;
use axum::Router;
use crate::AppState;

pub fn api_routes(state: Arc<AppState>) -> Router<Arc<AppState>> {
    // Protected routes — require valid session when OIDC is enabled
    let protected = Router::new()
        .merge(deployments::routes())
        .merge(health_overview::routes())
        .merge(fleet_analytics::routes())
        .merge(fleet_ws::routes())
        .merge(proxy::routes())
        .route_layer(axum_mw::from_fn_with_state(
            state,
            crate::middleware::auth::require_auth,
        ));

    // Public routes — no auth required
    Router::new()
        .merge(protected)
        .merge(auth::routes())
        .merge(health_overview::health_routes())
}
