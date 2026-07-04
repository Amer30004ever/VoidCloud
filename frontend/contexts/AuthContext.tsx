"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const stored = localStorage.getItem("amer_portal_token");
      if (stored) {
        setToken(stored);
        try {
          const response = await api.get<User>("/auth/me");
          setUser(response.data);
        } catch {
          // Token is invalid or expired
          localStorage.removeItem("amer_portal_token");
          setToken(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>(
      "/auth/login",
      { email, password }
    );
    const { access_token, user: me } = res.data;
    localStorage.setItem("amer_portal_token", access_token);
    setToken(access_token);
    setUser(me);
  };

  const logout = () => {
    localStorage.removeItem("amer_portal_token");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
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
