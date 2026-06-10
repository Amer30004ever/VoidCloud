"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/constants";

export interface LiveMetricsPayload {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  networkInMbps?: number;
  networkOutMbps?: number;
  runningPods?: number;
  runningNamespaces?: number;
}

function getMetricsSocketUrl() {
  const apiUrl = new URL(API_BASE_URL);
  return `${apiUrl.protocol === "https:" ? "wss" : "ws"}://${apiUrl.host}`;
}

export function useMetricsWebSocket(enabled = true) {
  const [metrics, setMetrics] = useState<LiveMetricsPayload | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const socket: Socket = io(`${getMetricsSocketUrl()}/metrics`, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("subscribe");
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("metrics", (payload: LiveMetricsPayload) => setMetrics(payload));

    return () => {
      socket.disconnect();
    };
  }, [enabled]);

  return { metrics, connected };
}
