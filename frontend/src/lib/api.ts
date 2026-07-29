import axios from "axios";
import { API_BASE_URL, SUB2API_BASE_URL } from "@/lib/constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const sub2api = axios.create({
  baseURL: SUB2API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

function attachAuth(instance: typeof api) {
  instance.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("voidcloud_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("voidcloud_token");
        if (window.location.pathname !== "/voidcloud/login") {
          window.location.href = "/voidcloud/login";
        }
      }
      return Promise.reject(error);
    }
  );
}

attachAuth(api);
attachAuth(sub2api);

export default api;
export { sub2api };