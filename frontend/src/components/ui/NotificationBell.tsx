"use client";

import { Bell, Check, X, Loader2 } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useState } from "react";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, isConnected } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute -right-1 -bottom-1 flex h-3 w-3 items-center justify-center rounded-full bg-yellow-500" title="Disconnected" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Mark all read
                  </button>
                )}
                <div className="flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-yellow-500"}`} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex gap-3 border-b border-border p-4 last:border-b-0 ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="rounded-lg bg-primary/10 p-1 text-primary hover:bg-primary/20"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="rounded-lg bg-red-500/10 p-1 text-red-500 hover:bg-red-500/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
