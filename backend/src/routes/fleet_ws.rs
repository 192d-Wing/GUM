// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

use axum::Router;
use axum::extract::State;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::response::Response;
use axum::routing::get;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::mpsc;

use crate::AppState;
use crate::models::Deployment;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/api/v1/fleet/ws", get(fleet_ws_handler))
}

async fn fleet_ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> Response {
    ws.on_upgrade(move |socket| handle_fleet_ws(socket, state))
}

/// Aggregate WebSocket messages from all healthy downstream deployments.
///
/// For each registered deployment, we attempt to connect via WS and relay
/// messages back to the client, wrapped in an envelope:
/// ```json
/// { "deployment_id": "abc-123", "deployment_name": "prod-dns", "type": "stats", "data": { ... } }
/// ```
async fn handle_fleet_ws(socket: WebSocket, state: Arc<AppState>) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Channel for downstream messages → client
    let (tx, mut rx) = mpsc::channel::<String>(256);

    // Spawn a task to relay aggregated messages to the client
    let relay_handle = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Get all deployments
    let deployments = match Deployment::list(&state.db.pool).await {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("Failed to list deployments for fleet WS: {e}");
            return;
        }
    };

    // Spawn a downstream WS connection for each deployment
    let mut downstream_handles = Vec::new();
    for deployment in deployments {
        let tx = tx.clone();
        let http_client = state.http_client.clone();
        let deploy_id = deployment.id.clone();
        let deploy_name = deployment.name.clone();
        let endpoint_url = deployment.endpoint_url.clone();

        let handle = tokio::spawn(async move {
            if let Err(e) =
                connect_downstream(&deploy_id, &deploy_name, &endpoint_url, &http_client, tx).await
            {
                tracing::debug!(
                    deployment = %deploy_name,
                    error = %e,
                    "Failed to connect downstream WS"
                );
            }
        });
        downstream_handles.push(handle);
    }

    // Drop extra sender so channel closes when all downstreams disconnect
    drop(tx);

    // Wait for client to disconnect (incoming messages)
    tokio::spawn(async move {
        while let Some(Ok(_)) = ws_receiver.next().await {
            // Client pings or messages — just consume them
        }
        // Client disconnected — abort all downstream connections
        for handle in downstream_handles {
            handle.abort();
        }
        relay_handle.abort();
    });
}

/// Connect to a single downstream deployment's WS and relay messages.
async fn connect_downstream(
    deploy_id: &str,
    deploy_name: &str,
    endpoint_url: &str,
    _http_client: &reqwest::Client,
    tx: mpsc::Sender<String>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Convert HTTP endpoint to WS URL
    let ws_url = endpoint_url
        .trim_end_matches('/')
        .replace("https://", "wss://")
        .replace("http://", "ws://");
    let ws_url = format!("{ws_url}/ws");

    let (ws_stream, _) = tokio_tungstenite::connect_async(&ws_url).await?;
    let (_write, mut read) = ws_stream.split();

    tracing::debug!(deployment = %deploy_name, url = %ws_url, "Downstream WS connected");

    while let Some(msg) = read.next().await {
        match msg {
            Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                // Parse the original message and wrap it in an envelope
                if let Ok(mut frame) = serde_json::from_str::<serde_json::Value>(&text) {
                    if let Some(obj) = frame.as_object_mut() {
                        obj.insert(
                            "deployment_id".to_string(),
                            serde_json::Value::String(deploy_id.to_string()),
                        );
                        obj.insert(
                            "deployment_name".to_string(),
                            serde_json::Value::String(deploy_name.to_string()),
                        );
                    }
                    let enveloped = serde_json::to_string(&frame).unwrap_or_default();
                    if tx.send(enveloped).await.is_err() {
                        break; // Client disconnected
                    }
                }
            }
            Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => break,
            Err(_) => break,
            _ => {}
        }
    }

    Ok(())
}
