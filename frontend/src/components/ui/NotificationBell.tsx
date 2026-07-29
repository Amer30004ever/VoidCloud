"use client";

import { Bell, Check, X, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type NotificationDto } from "@/features/notifications/notifications";
import { useAuth } from "@/features/auth/AuthContext";
import { useState } from "react";

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
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
                    className={`flex gap-3 border-b border-border p-4 last:border-b-0 ${!notification.read ? "bg-primary/5" : ""}`}
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
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                        {notification.link && (
                          <a href={notification.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">
                            View
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => markRead.mutate(notification.id)}
                          className="rounded-lg bg-primary/10 p-1 text-primary hover:bg-primary/20"
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => remove.mutate(notification.id)}
                        className="rounded-lg bg-red-500/10 p-1 text-red-500 hover:bg-red-500/20"
                        title="Remove"
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
