import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearCredentials, getCredentials, setCredentials } from "@/lib/auth";

interface AuthContextType {
  authEnabled: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  login(username: string, password: string): Promise<boolean>;
  logout(): void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authEnabled, setAuthEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/enabled")
      .then((r) => r.json())
      .then(({ enabled }: { enabled: boolean }) => {
        setAuthEnabled(enabled);
        setIsAuthenticated(!enabled || getCredentials() !== null);
      })
      .catch(() => {
        setAuthEnabled(false);
        setIsAuthenticated(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const header = `Basic ${btoa(`${username}:${password}`)}`;
    try {
      const res = await fetch("/api/connection/info", {
        headers: { Authorization: header, "Content-Type": "application/json" },
      });
      if (res.ok) {
        setCredentials(username, password);
        setIsAuthenticated(true);
        return true;
      }
    } catch {}
    return false;
  }, []);

  const logout = useCallback(() => {
    clearCredentials();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authEnabled, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
