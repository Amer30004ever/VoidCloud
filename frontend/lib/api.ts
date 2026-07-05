import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { API_BASE_URL } from "./constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.url?.startsWith("/")) {
    config.url = config.url.slice(1);
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("voidcloud_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Global 401 handler — redirect to login for protected routes only
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const requestUrl = typeof error.config?.url === "string" ? error.config.url : "";
      const isAuthRoute = requestUrl.includes("auth/login") || requestUrl.includes("auth/register") || requestUrl.includes("auth/forgot-password") || requestUrl.includes("auth/reset-password");
      const isAuthPage = window.location.pathname.includes("/login") || window.location.pathname.includes("/register") || window.location.pathname.includes("/forgot-password") || window.location.pathname.includes("/reset-password");

      if (!isAuthRoute && !isAuthPage) {
        localStorage.removeItem("voidcloud_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;