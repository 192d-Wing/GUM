// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Deployment, DeploymentAuthType, HealthStatus, ServiceType};
    use wiremock::matchers::path;
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn test_deployment(endpoint_url: &str) -> Deployment {
        Deployment {
            id: "test-1".into(),
            name: "test".into(),
            service_type: ServiceType::CrowDns,
            endpoint_url: endpoint_url.into(),
            health_status: HealthStatus::Unknown,
            last_seen: None,
            created_at: "2024-01-01T00:00:00Z".into(),
            tags: std::collections::HashMap::new(),
            auth_type: DeploymentAuthType::None,
            auth_credential: None,
        }
    }

    #[tokio::test]
    async fn health_check_200_returns_healthy() {
        let mock_server = MockServer::start().await;
        Mock::given(path("/health/ready"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&mock_server)
            .await;

        let deployment = test_deployment(&mock_server.uri());
        let client = reqwest::Client::new();
        let result = check_deployment_health(&client, &deployment).await;
        assert_eq!(result, HealthStatus::Healthy);
    }

    #[tokio::test]
    async fn health_check_500_returns_unhealthy() {
        let mock_server = MockServer::start().await;
        Mock::given(path("/health/ready"))
            .respond_with(ResponseTemplate::new(500))
            .mount(&mock_server)
            .await;

        let deployment = test_deployment(&mock_server.uri());
        let client = reqwest::Client::new();
        let result = check_deployment_health(&client, &deployment).await;
        assert_eq!(result, HealthStatus::Unhealthy);
    }

    #[tokio::test]
    async fn health_check_404_returns_degraded() {
        let mock_server = MockServer::start().await;
        Mock::given(path("/health/ready"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&mock_server)
            .await;

        let deployment = test_deployment(&mock_server.uri());
        let client = reqwest::Client::new();
        let result = check_deployment_health(&client, &deployment).await;
        assert_eq!(result, HealthStatus::Degraded);
    }

    #[tokio::test]
    async fn health_check_503_returns_unhealthy() {
        let mock_server = MockServer::start().await;
        Mock::given(path("/health/ready"))
            .respond_with(ResponseTemplate::new(503))
            .mount(&mock_server)
            .await;

        let deployment = test_deployment(&mock_server.uri());
        let client = reqwest::Client::new();
        let result = check_deployment_health(&client, &deployment).await;
        assert_eq!(result, HealthStatus::Unhealthy);
    }

    #[tokio::test]
    async fn health_check_connection_refused_returns_unhealthy() {
        let deployment = test_deployment("http://127.0.0.1:1");
        let client = reqwest::Client::new();
        let result = check_deployment_health(&client, &deployment).await;
        assert_eq!(result, HealthStatus::Unhealthy);
    }
}
