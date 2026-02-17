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
