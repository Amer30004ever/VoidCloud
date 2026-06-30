
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getSocketAuthOptions, getSocketBaseUrl } from "@/lib/socket-auth";

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

export function useMetricsWebSocket(enabled = true) {
  const [metrics, setMetrics] = useState<LiveMetricsPayload | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const socket: Socket = io(`${getSocketBaseUrl()}/metrics`, {
      ...getSocketAuthOptions(),
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
