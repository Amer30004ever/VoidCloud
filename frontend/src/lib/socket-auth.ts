import { API_BASE_URL } from "./constants";

/** Resolve ws(s):// URL from the REST API base. */
export function getSocketBaseUrl(): string {
  const apiUrl = new URL(API_BASE_URL);
  return `${apiUrl.protocol === "https:" ? "wss" : "ws"}://${apiUrl.host}`;
}

/** Read the stored JWT (browser-only). */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("amer_portal_token");
}

/**
 * Standard socket.io auth options. Token is sent in BOTH the handshake
 * `auth` payload (preferred by JwtWsGuard) and `extraHeaders.Authorization`
 * for gateways that read raw headers.
 */
export function getSocketAuthOptions() {
  const token = getAuthToken();
  return {
    transports: ["websocket", "polling"] as string[],
    auth: token ? { token } : undefined,
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}
