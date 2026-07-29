"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    const duration = toast.duration ?? 4000;
    setToasts((prev) => [...prev, { ...toast, id }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-xl max-w-sm transition-all ${tone(t.type)}`}>
          <div className="flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            {t.message && <p className="mt-0.5 text-xs opacity-80">{t.message}</p>}
          </div>
          <button onClick={() => onDismiss(t.id)} className="rounded-lg p-0.5 opacity-60 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}

function tone(type: ToastType) {
  switch (type) {
    case "success": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
    case "error": return "border-red-500/30 bg-red-500/10 text-red-100";
    case "warning": return "border-yellow-500/30 bg-yellow-500/10 text-yellow-100";
    default: return "border-cyan-500/30 bg-cyan-500/10 text-cyan-100";
  }
}
