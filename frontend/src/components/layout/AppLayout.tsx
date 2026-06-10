"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ChangePasswordModal />
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar />
        <div className="relative z-0 flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
