"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { ChangePasswordModal } from "@/features/auth/ChangePasswordModal";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ToastProvider } from "@/components/ui/Toast";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/ui/ImpersonationBanner";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ChangePasswordModal />
      <CommandPalette />
      <KeyboardShortcuts />
      <ImpersonationProvider>
        <ToastProvider>
          <ImpersonationBanner />
          <div className="flex h-screen w-full overflow-hidden bg-background">
            <Sidebar />
            <div className="relative z-0 flex flex-1 flex-col overflow-hidden">
              <Topbar />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </ImpersonationProvider>
    </ProtectedRoute>
  );
}
