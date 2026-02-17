// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import apiClient from "../api/client";
import type { AuthUser } from "../api/types";

interface AuthContextValue {
  /** True once the initial /auth/me check has completed. */
  loading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  /** Initiates OIDC login by redirecting to the backend login endpoint. */
  login: () => void;
  /** Calls the backend logout endpoint and clears local state. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  // On mount, check if we already have an active session.
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<AuthUser>("/api/v1/auth/me")
      .then((resp) => {
        if (!cancelled && resp.data.authenticated) {
          setUser(resp.data);
        }
      })
      .catch(() => {
        // Not authenticated — will redirect to login
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    // Redirect to backend OIDC login endpoint — the server handles the
    // authorization code flow and redirects back with a session cookie.
    window.location.href = "/api/v1/auth/oidc/login";
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/v1/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const isAuthenticated = user?.authenticated ?? false;

  return (
    <AuthContext.Provider
      value={{ loading, isAuthenticated, user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
