import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import apiClient from "../api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // The actual token is in an httpOnly cookie (inaccessible from JS).
  // We track auth state as a boolean — actual validation happens server-side.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => window.location.pathname !== "/login",
  );

  const login = useCallback(async (token: string) => {
    await apiClient.post("/api/v1/auth/login", { token });
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/v1/auth/logout");
    } finally {
      setIsAuthenticated(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
