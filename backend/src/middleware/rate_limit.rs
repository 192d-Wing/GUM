// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

use axum::extract::ConnectInfo;
use axum::http::{HeaderValue, Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Per-IP sliding-window rate limiter state.
#[derive(Clone)]
pub struct RateLimitState {
    clients: Arc<Mutex<HashMap<IpAddr, (u64, Instant)>>>,
    limit: u64,
    window: Duration,
}

impl RateLimitState {
    pub fn new(limit: u64, window_secs: u64) -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
            limit,
            window: Duration::from_secs(window_secs),
        }
    }

    /// Spawn a background task that cleans up expired entries every 5 minutes.
    pub fn start_cleanup_task(&self) {
        let clients = self.clients.clone();
        let window = self.window;
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300));
            loop {
                interval.tick().await;
                let now = Instant::now();
                if let Ok(mut map) = clients.lock() {
                    map.retain(|_, (_, started)| now.duration_since(*started) < window);
                }
            }
        });
    }
}

/// Extract the client IP from `X-Forwarded-For` header or fall back to the peer address.
fn extract_ip<B>(req: &Request<B>) -> IpAddr {
    if let Some(xff) = req.headers().get("x-forwarded-for")
        && let Ok(s) = xff.to_str()
        && let Some(first) = s.split(',').next()
        && let Ok(ip) = first.trim().parse::<IpAddr>()
    {
        return ip;
    }

    // Fall back to ConnectInfo
    req.extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map(|ci| ci.0.ip())
        .unwrap_or(IpAddr::V4(std::net::Ipv4Addr::UNSPECIFIED))
}

/// Axum middleware that enforces per-IP rate limits.
pub async fn rate_limit(
    axum::extract::State(rl): axum::extract::State<RateLimitState>,
    request: Request<axum::body::Body>,
    next: Next,
) -> Response {
    // If limit is 0, rate limiting is disabled
    if rl.limit == 0 {
        return next.run(request).await;
    }

    let ip = extract_ip(&request);
    let now = Instant::now();

    let (allowed, retry_after) = {
        let mut clients = rl.clients.lock().unwrap();
        let entry = clients.entry(ip).or_insert((0, now));

        // Reset window if expired
        if now.duration_since(entry.1) >= rl.window {
            *entry = (0, now);
        }

        entry.0 += 1;

        if entry.0 > rl.limit {
            let remaining = rl
                .window
                .as_secs()
                .saturating_sub(now.duration_since(entry.1).as_secs());
            (false, remaining.max(1))
        } else {
            (true, 0)
        }
    };

    if allowed {
        next.run(request).await
    } else {
        let body = serde_json::json!({
            "error": "rate limit exceeded",
            "retry_after": retry_after,
        });
        let mut resp = (StatusCode::TOO_MANY_REQUESTS, axum::Json(body)).into_response();
        resp.headers_mut().insert(
            "retry-after",
            HeaderValue::from_str(&retry_after.to_string()).unwrap(),
        );
        resp
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_ip_from_xff_header() {
        let req = Request::builder()
            .header("x-forwarded-for", "203.0.113.50, 70.41.3.18")
            .body(())
            .unwrap();
        assert_eq!(extract_ip(&req), "203.0.113.50".parse::<IpAddr>().unwrap());
    }

    #[test]
    fn extract_ip_fallback_when_no_xff() {
        let req = Request::builder().body(()).unwrap();
        // No ConnectInfo or XFF → unspecified
        assert_eq!(
            extract_ip(&req),
            IpAddr::V4(std::net::Ipv4Addr::UNSPECIFIED)
        );
    }
}
