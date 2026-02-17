use crate::models::{Deployment, HealthStatus};

/// Check reachability of a deployment by hitting its health/readiness endpoint.
pub async fn check_deployment_health(
    http_client: &reqwest::Client,
    deployment: &Deployment,
) -> HealthStatus {
    let url = format!(
        "{}/health/ready",
        deployment.endpoint_url.trim_end_matches('/')
    );

    match http_client.get(&url).send().await {
        Ok(resp) if resp.status().is_success() => HealthStatus::Healthy,
        Ok(resp) if resp.status().is_server_error() => HealthStatus::Unhealthy,
        Ok(_) => HealthStatus::Degraded,
        Err(_) => HealthStatus::Unhealthy,
    }
}
