use super::session::Session;

/// Roles recognized by GUM.
pub const ROLE_ADMIN: &str = "admin";
pub const ROLE_VIEWER: &str = "viewer";

impl Session {
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }

    pub fn is_admin(&self) -> bool {
        self.has_role(ROLE_ADMIN)
    }
}

#[cfg(test)]
mod tests {
    use crate::auth::session::Session;
    use chrono::{Duration, Utc};

    fn make_session(roles: Vec<String>) -> Session {
        Session {
            sub: "user-1".into(),
            name: "Test".into(),
            email: "test@example.com".into(),
            roles,
            expires_at: Utc::now() + Duration::hours(1),
        }
    }

    #[test]
    fn has_role_present() {
        let s = make_session(vec!["admin".into(), "viewer".into()]);
        assert!(s.has_role("admin"));
    }

    #[test]
    fn has_role_absent() {
        let s = make_session(vec!["viewer".into()]);
        assert!(!s.has_role("admin"));
    }

    #[test]
    fn has_role_empty_roles() {
        let s = make_session(vec![]);
        assert!(!s.has_role("admin"));
    }

    #[test]
    fn is_admin_correctness() {
        let admin = make_session(vec!["admin".into()]);
        assert!(admin.is_admin());
        let non_admin = make_session(vec!["viewer".into()]);
        assert!(!non_admin.is_admin());
    }
}
