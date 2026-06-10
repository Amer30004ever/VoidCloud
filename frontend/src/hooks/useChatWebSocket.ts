"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/constants";
import type { ChatMessage } from "@/lib/collaboration";

function getChatSocketUrl() {
  const apiUrl = new URL(API_BASE_URL);
  return `${apiUrl.protocol === "https:" ? "wss" : "ws"}://${apiUrl.host}`;
}

export function useChatWebSocket(channelId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!channelId) return;

    const socket = io(`${getChatSocketUrl()}/chat`, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinChannel", { channelId });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [channelId]);

  const sendMessage = useCallback(
    (content: string, userId?: string) => {
      if (!channelId || !socketRef.current) return;
      socketRef.current.emit("sendMessage", { channelId, content, userId });
    },
    [channelId],
  );

  const setInitialMessages = useCallback((initial: ChatMessage[]) => {
    setMessages(initial);
  }, []);

  return { messages, connected, sendMessage, setInitialMessages };
}
