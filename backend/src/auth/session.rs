use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};

    fn test_key() -> Vec<u8> {
        b"test-key-for-session-testing-32b".to_vec()
    }

    fn sample_session() -> Session {
        Session::new(
            "user-123".into(),
            "Alice".into(),
            "alice@example.com".into(),
            vec!["admin".into(), "viewer".into()],
        )
    }

    #[test]
    fn encode_decode_round_trip() {
        let key = test_key();
        let session = sample_session();
        let cookie = session.encode(&key).unwrap();
        let decoded = Session::decode(&cookie, &key).unwrap();
        assert_eq!(decoded.sub, "user-123");
        assert_eq!(decoded.name, "Alice");
        assert_eq!(decoded.email, "alice@example.com");
        assert_eq!(decoded.roles, vec!["admin", "viewer"]);
    }

    #[test]
    fn decode_wrong_key_returns_invalid_signature() {
        let session = sample_session();
        let cookie = session.encode(&test_key()).unwrap();
        let wrong_key = b"wrong-key-for-session-testing-32".to_vec();
        let result = Session::decode(&cookie, &wrong_key);
        assert!(matches!(result, Err(SessionError::InvalidSignature)));
    }

    #[test]
    fn decode_tampered_payload_returns_error() {
        let session = sample_session();
        let cookie = session.encode(&test_key()).unwrap();
        let parts: Vec<&str> = cookie.splitn(2, '.').collect();
        // Tamper with the payload by replacing first char
        let tampered = format!("X{}.{}", &parts[0][1..], parts[1]);
        let result = Session::decode(&tampered, &test_key());
        assert!(result.is_err());
    }

    #[test]
    fn decode_no_dot_separator_returns_malformed() {
        let result = Session::decode("nodothere", &test_key());
        assert!(matches!(result, Err(SessionError::MalformedCookie)));
    }

    #[test]
    fn decode_bad_base64_returns_malformed() {
        let result = Session::decode("!!!.!!!", &test_key());
        assert!(matches!(result, Err(SessionError::MalformedCookie)));
    }

    #[test]
    fn decode_expired_session_returns_expired() {
        let key = test_key();
        let mut session = sample_session();
        session.expires_at = Utc::now() - Duration::hours(1);
        let cookie = session.encode(&key).unwrap();
        let result = Session::decode(&cookie, &key);
        assert!(matches!(result, Err(SessionError::Expired)));
    }

    #[test]
    fn is_expired_false_for_new_session() {
        let session = sample_session();
        assert!(!session.is_expired());
    }

    #[test]
    fn session_error_display() {
        assert!(!SessionError::MalformedCookie.to_string().is_empty());
        assert!(!SessionError::InvalidSignature.to_string().is_empty());
        assert!(!SessionError::InvalidKey.to_string().is_empty());
        assert!(!SessionError::Expired.to_string().is_empty());
    }
}
