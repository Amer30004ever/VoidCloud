import axios from "axios";
import { API_BASE_URL } from "./constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (config.url?.startsWith("/")) {
    config.url = config.url.slice(1);
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("amer_portal_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Global 401 handler — redirect to login for protected routes only
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const requestUrl = typeof error.config?.url === "string" ? error.config.url : "";
      const isAuthRoute = requestUrl.includes("auth/login") || requestUrl.includes("auth/register") || requestUrl.includes("auth/forgot-password") || requestUrl.includes("auth/reset-password");
      const isAuthPage = window.location.pathname.includes("/voidcloud/login") || window.location.pathname.includes("/voidcloud/register") || window.location.pathname.includes("/voidcloud/forgot-password") || window.location.pathname.includes("/voidcloud/reset-password");

      if (!isAuthRoute && !isAuthPage) {
        localStorage.removeItem("amer_portal_token");
        window.location.href = "/voidcloud/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;