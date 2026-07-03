import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// ─── Local types (replaces @workspace/api-client-react) ───────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "SUPER_ADMIN" | "ADMIN" | "AGENT" | "USER" | string;
  tenantId?: string;
  status?: string;
}

export interface AuthResponse {
  token?: string;
  access_token?: string;
  user?: User;
  requires2FA?: boolean;
  userId?: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("voidcloud_token");
    const storedUser = localStorage.getItem("voidcloud_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from local storage");
      }
    }
  }, []);

  const login = (data: AuthResponse) => {
    // Support both `token` (Express) and `access_token` (NestJS)
    const tok = data.token ?? data.access_token ?? null;
    if (tok) {
      localStorage.setItem("voidcloud_token", tok);
      setToken(tok);
    }
    if (data.user) {
      localStorage.setItem("voidcloud_user", JSON.stringify(data.user));
      setUser(data.user);
    }
  };

  const logout = () => {
    localStorage.removeItem("voidcloud_token");
    localStorage.removeItem("voidcloud_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
