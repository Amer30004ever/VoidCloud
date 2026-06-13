"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // WebSocket connection (disabled until backend implements WebSocket gateway)
  useEffect(() => {
    // Temporarily disabled - backend WebSocket gateway not implemented yet
    // const ws = new WebSocket("ws://localhost:3001/notifications");
    //
    // ws.onopen = () => {
    //   setIsConnected(true);
    //   console.log("WebSocket connected");
    // };
    //
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   addNotification({
    //     type: data.type || "info",
    //     title: data.title || "Notification",
    //     message: data.message || "",
    //   });
    // };
    //
    // ws.onerror = (error) => {
    //   console.error("WebSocket error:", error);
    //   setIsConnected(false);
    // };
    //
    // ws.onclose = () => {
    //   setIsConnected(false);
    //   console.log("WebSocket disconnected");
    //   // Attempt to reconnect after 5 seconds
    //   setTimeout(() => {
    //     console.log("Attempting to reconnect...");
    //   }, 5000);
    // };
    //
    // return () => {
    //   ws.close();
    // };
  }, []);

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        isConnected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
