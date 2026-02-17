use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Duration, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// User session stored in a signed cookie.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub sub: String,
    pub name: String,
    pub email: String,
    pub roles: Vec<String>,
    pub expires_at: DateTime<Utc>,
}

impl Session {
    pub fn new(sub: String, name: String, email: String, roles: Vec<String>) -> Self {
        Self {
            sub,
            name,
            email,
            roles,
            expires_at: Utc::now() + Duration::hours(8),
        }
    }

    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }

    /// Serialize + HMAC sign → base64 cookie value.
    pub fn encode(&self, key: &[u8]) -> Result<String, Box<dyn std::error::Error>> {
        let payload = serde_json::to_vec(self)?;
        let mut mac = HmacSha256::new_from_slice(key)?;
        mac.update(&payload);
        let signature = mac.finalize().into_bytes();

        // Format: base64(payload).base64(signature)
        let payload_b64 = URL_SAFE_NO_PAD.encode(&payload);
        let sig_b64 = URL_SAFE_NO_PAD.encode(signature);
        Ok(format!("{payload_b64}.{sig_b64}"))
    }

    /// Decode + verify HMAC signature from cookie value.
    pub fn decode(cookie_value: &str, key: &[u8]) -> Result<Session, SessionError> {
        let parts: Vec<&str> = cookie_value.splitn(2, '.').collect();
        if parts.len() != 2 {
            return Err(SessionError::MalformedCookie);
        }

        let payload = URL_SAFE_NO_PAD
            .decode(parts[0])
            .map_err(|_| SessionError::MalformedCookie)?;
        let signature = URL_SAFE_NO_PAD
            .decode(parts[1])
            .map_err(|_| SessionError::MalformedCookie)?;

        // Verify HMAC
        let mut mac = HmacSha256::new_from_slice(key).map_err(|_| SessionError::InvalidKey)?;
        mac.update(&payload);
        mac.verify_slice(&signature)
            .map_err(|_| SessionError::InvalidSignature)?;

        let session: Session =
            serde_json::from_slice(&payload).map_err(|_| SessionError::MalformedCookie)?;

        if session.is_expired() {
            return Err(SessionError::Expired);
        }

        Ok(session)
    }
}

#[derive(Debug)]
pub enum SessionError {
    MalformedCookie,
    InvalidSignature,
    InvalidKey,
    Expired,
}

impl std::fmt::Display for SessionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MalformedCookie => write!(f, "malformed session cookie"),
            Self::InvalidSignature => write!(f, "invalid session signature"),
            Self::InvalidKey => write!(f, "invalid session key"),
            Self::Expired => write!(f, "session expired"),
        }
    }
}
