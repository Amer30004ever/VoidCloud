"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  category?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  addNotification: (notification: Omit<Notification, "id" | "userId" | "createdAt" | "read">) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<Notification[]>("/notifications");
      setNotifications(res.data);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "userId" | "createdAt" | "read">) => {
    const optimistic: Notification = {
      ...notification,
      id: Date.now().toString(),
      userId: user?.id ?? "",
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [optimistic, ...prev]);
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: false } : n));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.put("/notifications/read-all");
    } catch {
      refresh();
    }
  }, [refresh]);

  const removeNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      refresh();
    }
  }, [refresh]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        refresh,
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
