// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServiceType {
    CrowDns,
    Ntp,
}

impl fmt::Display for ServiceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CrowDns => write!(f, "crow_dns"),
            Self::Ntp => write!(f, "ntp"),
        }
    }
}

impl ServiceType {
    pub fn from_str_value(s: &str) -> Option<Self> {
        match s {
            "crow_dns" => Some(Self::CrowDns),
            "ntp" => Some(Self::Ntp),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

impl fmt::Display for HealthStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Healthy => write!(f, "healthy"),
            Self::Degraded => write!(f, "degraded"),
            Self::Unhealthy => write!(f, "unhealthy"),
            Self::Unknown => write!(f, "unknown"),
        }
    }
}

impl HealthStatus {
    pub fn from_str_value(s: &str) -> Self {
        match s {
            "healthy" => Self::Healthy,
            "degraded" => Self::Degraded,
            "unhealthy" => Self::Unhealthy,
            _ => Self::Unknown,
        }
    }
}

/// How GUM authenticates to downstream service instances when proxying.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeploymentAuthType {
    None,
    BearerToken,
    BasicAuth,
}

impl fmt::Display for DeploymentAuthType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::None => write!(f, "none"),
            Self::BearerToken => write!(f, "bearer_token"),
            Self::BasicAuth => write!(f, "basic_auth"),
        }
    }
}

impl DeploymentAuthType {
    pub fn from_str_value(s: &str) -> Self {
        match s {
            "bearer_token" => Self::BearerToken,
            "basic_auth" => Self::BasicAuth,
            _ => Self::None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ServiceType tests
    #[test]
    fn service_type_from_str_crow_dns() {
        assert_eq!(
            ServiceType::from_str_value("crow_dns"),
            Some(ServiceType::CrowDns)
        );
    }

    #[test]
    fn service_type_from_str_ntp() {
        assert_eq!(ServiceType::from_str_value("ntp"), Some(ServiceType::Ntp));
    }

    #[test]
    fn service_type_from_str_unknown() {
        assert_eq!(ServiceType::from_str_value("postgres"), None);
    }

    #[test]
    fn service_type_display_round_trips() {
        assert_eq!(ServiceType::CrowDns.to_string(), "crow_dns");
        assert_eq!(ServiceType::Ntp.to_string(), "ntp");
    }

    #[test]
    fn service_type_serde_round_trip() {
        let json = serde_json::to_value(ServiceType::CrowDns).unwrap();
        assert_eq!(json, serde_json::json!("crow_dns"));
        let back: ServiceType = serde_json::from_value(serde_json::json!("ntp")).unwrap();
        assert_eq!(back, ServiceType::Ntp);
    }

    // HealthStatus tests
    #[test]
    fn health_status_from_str_known() {
        assert_eq!(
            HealthStatus::from_str_value("healthy"),
            HealthStatus::Healthy
        );
        assert_eq!(
            HealthStatus::from_str_value("degraded"),
            HealthStatus::Degraded
        );
        assert_eq!(
            HealthStatus::from_str_value("unhealthy"),
            HealthStatus::Unhealthy
        );
    }

    #[test]
    fn health_status_from_str_unknown_default() {
        assert_eq!(
            HealthStatus::from_str_value("garbage"),
            HealthStatus::Unknown
        );
        assert_eq!(HealthStatus::from_str_value(""), HealthStatus::Unknown);
    }

    #[test]
    fn health_status_display() {
        assert_eq!(HealthStatus::Healthy.to_string(), "healthy");
        assert_eq!(HealthStatus::Degraded.to_string(), "degraded");
        assert_eq!(HealthStatus::Unhealthy.to_string(), "unhealthy");
        assert_eq!(HealthStatus::Unknown.to_string(), "unknown");
    }

    #[test]
    fn health_status_serde_round_trip() {
        let json = serde_json::to_value(HealthStatus::Healthy).unwrap();
        assert_eq!(json, serde_json::json!("healthy"));
        let back: HealthStatus = serde_json::from_value(serde_json::json!("unknown")).unwrap();
        assert_eq!(back, HealthStatus::Unknown);
    }

    // DeploymentAuthType tests
    #[test]
    fn auth_type_from_str_known() {
        assert_eq!(
            DeploymentAuthType::from_str_value("bearer_token"),
            DeploymentAuthType::BearerToken
        );
        assert_eq!(
            DeploymentAuthType::from_str_value("basic_auth"),
            DeploymentAuthType::BasicAuth
        );
    }

    #[test]
    fn auth_type_from_str_unknown_default() {
        assert_eq!(
            DeploymentAuthType::from_str_value("unknown"),
            DeploymentAuthType::None
        );
        assert_eq!(
            DeploymentAuthType::from_str_value(""),
            DeploymentAuthType::None
        );
    }

    #[test]
    fn auth_type_display() {
        assert_eq!(DeploymentAuthType::None.to_string(), "none");
        assert_eq!(DeploymentAuthType::BearerToken.to_string(), "bearer_token");
        assert_eq!(DeploymentAuthType::BasicAuth.to_string(), "basic_auth");
    }
}
