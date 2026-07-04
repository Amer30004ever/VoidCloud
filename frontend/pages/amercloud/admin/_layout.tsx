"use client";
import CloudDashboardLayout from "../dashboard/_layout";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <CloudDashboardLayout>{children}</CloudDashboardLayout>;
}
