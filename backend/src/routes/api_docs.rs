// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

use axum::response::Html;
use axum::routing::get;
use axum::{Json, Router};
use serde_json::{Value, json};
use std::sync::Arc;

use crate::AppState;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/docs", get(swagger_ui))
        .route("/api/docs/openapi.json", get(openapi_spec))
}

async fn swagger_ui() -> Html<&'static str> {
    Html(include_str!("api_docs_ui.html"))
}

async fn openapi_spec() -> Json<Value> {
    Json(build_spec())
}

fn build_spec() -> Value {
    json!({
        "openapi": "3.1.0",
        "info": {
            "title": "GUM API",
            "description": "Global Unified Management — fleet management for Crow DNS and NTP deployments.",
            "version": "0.1.0",
            "license": { "name": "MIT" }
        },
        "servers": [
            { "url": "/", "description": "This server" }
        ],
        "tags": [
            { "name": "Auth", "description": "Authentication and session management" },
            { "name": "Deployments", "description": "CRUD for managed deployments" },
            { "name": "Fleet Health", "description": "Fleet-wide health overview" },
            { "name": "Fleet Analytics", "description": "Aggregated analytics across deployments" },
            { "name": "Proxy", "description": "Transparent proxy to downstream deployments" },
            { "name": "Health Checks", "description": "Liveness and readiness probes" }
        ],
        "paths": {
            // ── Auth ────────────────────────────────────────────────
            "/api/v1/auth/me": {
                "get": {
                    "tags": ["Auth"],
                    "summary": "Get current user",
                    "description": "Returns the authenticated user's identity and roles. In stub-auth mode (OIDC disabled), returns an admin user.",
                    "responses": {
                        "200": {
                            "description": "Authenticated user",
                            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/AuthUser" } } }
                        },
                        "401": { "description": "Not authenticated" }
                    }
                }
            },
            "/api/v1/auth/logout": {
                "post": {
                    "tags": ["Auth"],
                    "summary": "Log out",
                    "description": "Clears the session cookie.",
                    "responses": {
                        "200": {
                            "description": "Logged out",
                            "content": { "application/json": { "schema": { "type": "object", "properties": { "success": { "type": "boolean" } } } } }
                        }
                    }
                }
            },
            "/api/v1/auth/oidc/login": {
                "get": {
                    "tags": ["Auth"],
                    "summary": "OIDC login redirect",
                    "description": "Redirects the browser to the configured OIDC provider for authentication.",
                    "responses": {
                        "302": { "description": "Redirect to OIDC provider" },
                        "500": { "description": "OIDC not configured" }
                    }
                }
            },
            "/api/v1/auth/oidc/callback": {
                "get": {
                    "tags": ["Auth"],
                    "summary": "OIDC callback",
                    "description": "Handles the authorization code callback from the OIDC provider. Sets a session cookie and redirects to the app.",
                    "parameters": [
                        { "name": "code", "in": "query", "required": true, "schema": { "type": "string" } },
                        { "name": "state", "in": "query", "required": true, "schema": { "type": "string" } }
                    ],
                    "responses": {
                        "302": { "description": "Redirect to app with session cookie set" },
                        "400": { "description": "Invalid state or code exchange failure" }
                    }
                }
            },

            // ── Deployments ─────────────────────────────────────────
            "/api/v1/deployments": {
                "get": {
                    "tags": ["Deployments"],
                    "summary": "List deployments",
                    "description": "Returns all registered deployments sorted by name.",
                    "responses": {
                        "200": {
                            "description": "List of deployments",
                            "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Deployment" } } } }
                        }
                    }
                },
                "post": {
                    "tags": ["Deployments"],
                    "summary": "Create deployment",
                    "description": "Registers a new deployment. Health status starts as `unknown`.",
                    "requestBody": {
                        "required": true,
                        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateDeploymentRequest" } } }
                    },
                    "responses": {
                        "200": {
                            "description": "Created deployment",
                            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Deployment" } } }
                        },
                        "400": { "description": "Validation error (missing name or endpoint)" }
                    }
                }
            },
            "/api/v1/deployments/{id}": {
                "get": {
                    "tags": ["Deployments"],
                    "summary": "Get deployment",
                    "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
                    "responses": {
                        "200": {
                            "description": "Deployment details",
                            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Deployment" } } }
                        },
                        "404": { "description": "Deployment not found" }
                    }
                },
                "put": {
                    "tags": ["Deployments"],
                    "summary": "Update deployment",
                    "description": "Partially updates a deployment. Omitted fields are preserved.",
                    "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
                    "requestBody": {
                        "required": true,
                        "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateDeploymentRequest" } } }
                    },
                    "responses": {
                        "200": {
                            "description": "Updated deployment",
                            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Deployment" } } }
                        },
                        "404": { "description": "Deployment not found" }
                    }
                },
                "delete": {
                    "tags": ["Deployments"],
                    "summary": "Delete deployment",
                    "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }],
                    "responses": {
                        "200": {
                            "description": "Deleted",
                            "content": { "application/json": { "schema": { "type": "object", "properties": { "success": { "type": "boolean" } } } } }
                        },
                        "404": { "description": "Deployment not found" }
                    }
                }
            },

            // ── Fleet Health ────────────────────────────────────────
            "/api/v1/fleet/health": {
                "get": {
                    "tags": ["Fleet Health"],
                    "summary": "Fleet health overview",
                    "description": "Aggregated health counts and per-deployment summaries.",
                    "responses": {
                        "200": {
                            "description": "Fleet health",
                            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/FleetHealth" } } }
                        }
                    }
                }
            },

            // ── Fleet Analytics ─────────────────────────────────────
            "/api/v1/fleet/analytics/top-queries": {
                "get": {
                    "tags": ["Fleet Analytics"],
                    "summary": "Top DNS queries across fleet",
                    "description": "Fans out to all healthy/degraded DNS deployments, merges results, and returns the top N entries.",
                    "parameters": [{ "name": "n", "in": "query", "schema": { "type": "integer", "default": 20 }, "description": "Number of entries to return" }],
                    "responses": {
                        "200": {
                            "description": "Aggregated top queries",
                            "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/FleetTopEntry" } } } }
                        }
                    }
                }
            },
            "/api/v1/fleet/analytics/top-clients": {
                "get": {
                    "tags": ["Fleet Analytics"],
                    "summary": "Top clients across fleet",
                    "description": "Fans out to all healthy/degraded deployments, merges results, and returns the top N entries.",
                    "parameters": [{ "name": "n", "in": "query", "schema": { "type": "integer", "default": 20 }, "description": "Number of entries to return" }],
                    "responses": {
                        "200": {
                            "description": "Aggregated top clients",
                            "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/FleetTopEntry" } } } }
                        }
                    }
                }
            },

            // ── Proxy ───────────────────────────────────────────────
            "/api/v1/deployments/{id}/proxy/{path}": {
                "get": {
                    "tags": ["Proxy"],
                    "summary": "Proxy request to deployment",
                    "description": "Transparently proxies any HTTP request to the downstream deployment. Supports all methods (GET, POST, PUT, DELETE, PATCH). Injects deployment auth credentials automatically.",
                    "parameters": [
                        { "name": "id", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Deployment ID" },
                        { "name": "path", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Downstream path" }
                    ],
                    "responses": {
                        "200": { "description": "Proxied response from downstream" },
                        "404": { "description": "Deployment not found" },
                        "502": { "description": "Downstream unreachable" }
                    }
                }
            },

            // ── Fleet WebSocket ─────────────────────────────────────
            "/api/v1/fleet/ws": {
                "get": {
                    "tags": ["Fleet Health"],
                    "summary": "Fleet WebSocket stream",
                    "description": "Upgrades to WebSocket. Aggregates real-time streams from all deployments, enveloping each message with deployment metadata.",
                    "responses": {
                        "101": { "description": "WebSocket upgrade" }
                    }
                }
            },

            // ── Health Probes ───────────────────────────────────────
            "/health/live": {
                "get": {
                    "tags": ["Health Checks"],
                    "summary": "Liveness probe",
                    "responses": {
                        "200": {
                            "description": "Alive",
                            "content": { "application/json": { "schema": { "type": "object", "properties": { "alive": { "type": "boolean" } } } } }
                        }
                    }
                }
            },
            "/health/ready": {
                "get": {
                    "tags": ["Health Checks"],
                    "summary": "Readiness probe",
                    "responses": {
                        "200": {
                            "description": "Ready",
                            "content": { "application/json": { "schema": { "type": "object", "properties": { "ready": { "type": "boolean" }, "oidc_enabled": { "type": "boolean" } } } } }
                        }
                    }
                }
            }
        },
        "components": {
            "schemas": {
                "AuthUser": {
                    "type": "object",
                    "properties": {
                        "authenticated": { "type": "boolean" },
                        "sub": { "type": "string", "description": "Subject identifier" },
                        "name": { "type": "string" },
                        "email": { "type": "string" },
                        "roles": { "type": "array", "items": { "type": "string" } }
                    }
                },
                "ServiceType": {
                    "type": "string",
                    "enum": ["crow_dns", "ntp"]
                },
                "HealthStatus": {
                    "type": "string",
                    "enum": ["healthy", "degraded", "unhealthy", "unknown"]
                },
                "DeploymentAuthType": {
                    "type": "string",
                    "enum": ["none", "bearer_token", "basic_auth"]
                },
                "Deployment": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string", "format": "uuid" },
                        "name": { "type": "string" },
                        "service_type": { "$ref": "#/components/schemas/ServiceType" },
                        "endpoint_url": { "type": "string", "format": "uri" },
                        "health_status": { "$ref": "#/components/schemas/HealthStatus" },
                        "last_seen": { "type": "string", "format": "date-time", "nullable": true },
                        "created_at": { "type": "string", "format": "date-time" },
                        "tags": { "type": "object", "additionalProperties": { "type": "string" } },
                        "auth_type": { "$ref": "#/components/schemas/DeploymentAuthType" }
                    },
                    "required": ["id", "name", "service_type", "endpoint_url", "health_status", "created_at", "tags", "auth_type"]
                },
                "CreateDeploymentRequest": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string" },
                        "service_type": { "$ref": "#/components/schemas/ServiceType" },
                        "endpoint_url": { "type": "string", "format": "uri" },
                        "tags": { "type": "object", "additionalProperties": { "type": "string" }, "default": {} },
                        "auth_type": { "$ref": "#/components/schemas/DeploymentAuthType" },
                        "auth_credential": { "type": "string", "nullable": true }
                    },
                    "required": ["name", "service_type", "endpoint_url"]
                },
                "UpdateDeploymentRequest": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string" },
                        "endpoint_url": { "type": "string", "format": "uri" },
                        "tags": { "type": "object", "additionalProperties": { "type": "string" } },
                        "auth_type": { "$ref": "#/components/schemas/DeploymentAuthType" },
                        "auth_credential": { "type": "string", "nullable": true }
                    }
                },
                "FleetHealth": {
                    "type": "object",
                    "properties": {
                        "total": { "type": "integer" },
                        "healthy": { "type": "integer" },
                        "degraded": { "type": "integer" },
                        "unhealthy": { "type": "integer" },
                        "unknown": { "type": "integer" },
                        "deployments": { "type": "array", "items": { "$ref": "#/components/schemas/DeploymentHealthSummary" } }
                    },
                    "required": ["total", "healthy", "degraded", "unhealthy", "unknown", "deployments"]
                },
                "DeploymentHealthSummary": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string" },
                        "name": { "type": "string" },
                        "service_type": { "$ref": "#/components/schemas/ServiceType" },
                        "health_status": { "$ref": "#/components/schemas/HealthStatus" },
                        "last_seen": { "type": "string", "format": "date-time", "nullable": true }
                    },
                    "required": ["id", "name", "service_type", "health_status"]
                },
                "FleetTopEntry": {
                    "type": "object",
                    "properties": {
                        "key": { "type": "string" },
                        "count": { "type": "integer" },
                        "deployments": { "type": "array", "items": { "type": "string" } }
                    },
                    "required": ["key", "count", "deployments"]
                },
                "ErrorResponse": {
                    "type": "object",
                    "properties": {
                        "error": { "type": "string" }
                    },
                    "required": ["error"]
                }
            }
        }
    })
}
