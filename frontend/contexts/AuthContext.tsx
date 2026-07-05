"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
}

interface AuthResponse {
  token?: string;
  access_token?: string;
  user?: Partial<User> | null;
  requires2FA?: boolean;
  userId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (dataOrEmail: string | Record<string, unknown> | unknown, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const stored = localStorage.getItem("voidcloud_token");
      const storedUser = localStorage.getItem("voidcloud_user");
      if (stored) {
        setToken(stored);
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Set role cookie for middleware
            if (typeof document !== "undefined") {
              document.cookie = `voidcloud_role=${parsedUser.role}; path=/; max-age=604800`; // 7 days
            }
          } catch {
            localStorage.removeItem("voidcloud_user");
          }
        }
        try {
          const response = await api.get<User>("/auth/me");
          setUser(response.data);
          localStorage.setItem("voidcloud_user", JSON.stringify(response.data));
          // Set role cookie for middleware
          if (typeof document !== "undefined") {
            document.cookie = `voidcloud_role=${response.data.role}; path=/; max-age=604800`; // 7 days
          }
        } catch {
          localStorage.removeItem("voidcloud_token");
          localStorage.removeItem("voidcloud_user");
          setToken(null);
          setUser(null);
          // Clear role cookie
          if (typeof document !== "undefined") {
            document.cookie = "voidcloud_role=; path=/; max-age=0";
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (dataOrEmail: string | AuthResponse | unknown, password?: string) => {
    if (typeof dataOrEmail === "string") {
      const res = await api.post<{ access_token: string; user: User }>("/auth/login", {
        email: dataOrEmail,
        password,
      });
      const { access_token, user: me } = res.data;
      localStorage.setItem("voidcloud_token", access_token);
      localStorage.setItem("voidcloud_user", JSON.stringify(me));
      setToken(access_token);
      setUser(me);
      // Set role cookie for middleware
      if (typeof document !== "undefined") {
        document.cookie = `voidcloud_role=${me.role}; path=/; max-age=604800`; // 7 days
      }
      return;
    }

    if (typeof dataOrEmail !== "object" || dataOrEmail === null) {
      return;
    }

    const data = dataOrEmail as AuthResponse;
    const nextToken = data.token ?? data.access_token ?? null;
    if (nextToken) {
      localStorage.setItem("voidcloud_token", nextToken);
      setToken(nextToken);
    }
    if (data.user) {
      const normalizedUser: User = {
        id: data.user.id ?? "",
        name: data.user.name ?? data.user.email ?? "User",
        email: data.user.email ?? "",
        role: data.user.role ?? "USER",
        mustChangePassword: data.user.mustChangePassword,
      };
      localStorage.setItem("voidcloud_user", JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      // Set role cookie for middleware
      if (typeof document !== "undefined") {
        document.cookie = `voidcloud_role=${normalizedUser.role}; path=/; max-age=604800`; // 7 days
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("voidcloud_token");
    localStorage.removeItem("voidcloud_user");
    setToken(null);
    setUser(null);
    // Clear role cookie
    if (typeof document !== "undefined") {
      document.cookie = "voidcloud_role=; path=/; max-age=0";
    }
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
