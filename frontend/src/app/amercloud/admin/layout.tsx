"use client";
import CloudDashboardLayout from "../dashboard/layout";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <CloudDashboardLayout>{children}</CloudDashboardLayout>;
}
