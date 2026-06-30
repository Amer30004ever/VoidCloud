"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SystemStats {
  totalUsers: number;
  totalTenants: number;
  totalVPS: number;
  totalConversations: number;
  systemUptime: string;
  activeConnections: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  status: string;
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  userCount: number;
  createdAt: string;
}

interface VPSInstance {
  id: string;
  name: string;
  status: string;
  cpu: number;
  memory: number;
  storage: number;
  tenantId: string;
  tenantName: string;
}

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "tenants" | "vps" | "conversations" | "audit" | "settings">("overview");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [vpsInstances, setVpsInstances] = useState<VPSInstance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes, tenantsRes, vpsRes, auditRes] = await Promise.all([
        fetch("/api/v1/admin/system/stats"),
        fetch("/api/v1/admin/users"),
        fetch("/api/v1/admin/tenants"),
        fetch("/api/v1/admin/vps"),
        fetch("/api/v1/admin/audit-logs"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (tenantsRes.ok) setTenants(await tenantsRes.json());
      if (vpsRes.ok) setVpsInstances(await vpsRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") {
      window.location.href = "/voidcloud/dashboard";
      return;
    }
    fetchData();
  }, [user, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) return <div className="p-6 text-white/50">Loading Super Admin Dashboard...</div>;

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
        <p className="text-white/50 mt-2">Full system access and management</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-white/10 overflow-x-auto">
        {["overview", "users", "tenants", "vps", "conversations", "audit", "settings"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "overview" | "users" | "tenants" | "vps" | "conversations" | "audit" | "settings")}
            className={`px-4 py-2 capitalize whitespace-nowrap ${activeTab === tab
                ? "border-b-2 border-cyan-400 text-white"
                : "text-white/50 hover:text-white"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white/50 text-sm mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white/50 text-sm mb-2">Total Tenants</h3>
              <p className="text-3xl font-bold text-white">{stats.totalTenants}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white/50 text-sm mb-2">Active VPS</h3>
              <p className="text-3xl font-bold text-white">{stats.totalVPS}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white/50 text-sm mb-2">Conversations</h3>
              <p className="text-3xl font-bold text-white">{stats.totalConversations}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white/50 text-sm mb-2">System Uptime</h3>
              <p className="text-2xl font-bold text-emerald-400">{stats.systemUptime}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white/50 text-sm mb-2">Active Connections</h3>
              <p className="text-2xl font-bold text-cyan-400">{stats.activeConnections}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/voidcloud/admin/roles" className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-center text-cyan-300 hover:bg-cyan-400/20">
                Manage Roles
              </a>
              <a href="/voidcloud/admin/whatsapp-crm" className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/10 p-4 text-center text-fuchsia-300 hover:bg-fuchsia-400/20">
                WhatsApp CRM
              </a>
              <a href="/voidcloud/admin/dashboard" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-center text-emerald-300 hover:bg-emerald-400/20">
                Cluster Dashboard
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">User Management</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 text-left text-white/50 text-sm">
                <tr>
                  <th className="p-4">Email</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{u.email}</td>
                    <td className="p-4 text-white">{u.name}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs ${u.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
                        }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/50">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <button className="text-cyan-300 hover:underline text-sm">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "tenants" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Tenant Management</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 text-left text-white/50 text-sm">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Subdomain</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Users</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{t.name}</td>
                    <td className="p-4 font-mono text-cyan-300">{t.subdomain}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs ${t.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-300" : "bg-yellow-500/10 text-yellow-300"
                        }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-white">{t.userCount}</td>
                    <td className="p-4 text-white/50">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <button className="text-cyan-300 hover:underline text-sm">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "vps" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">All VPS Instances</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 text-left text-white/50 text-sm">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Resources</th>
                  <th className="p-4">Tenant</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vpsInstances.map((vps) => (
                  <tr key={vps.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{vps.name}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs ${vps.status === "RUNNING" ? "bg-emerald-500/10 text-emerald-300" : "bg-yellow-500/10 text-yellow-300"
                        }`}>
                        {vps.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/70">{vps.cpu} CPU · {vps.memory}MB · {Math.ceil(vps.storage / 1024)}GB</td>
                    <td className="p-4 text-cyan-300">{vps.tenantName}</td>
                    <td className="p-4">
                      <button className="text-cyan-300 hover:underline text-sm">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "conversations" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">All WhatsApp Conversations</h2>
          <p className="text-white/50 mb-4">View and manage all conversations across all tenants</p>
          <a href="/voidcloud/admin/whatsapp-crm" className="inline-block rounded-lg bg-cyan-500 px-6 py-2 text-white hover:bg-cyan-600">
            Open WhatsApp CRM
          </a>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Audit Logs</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{log.action}</span>
                  <span className="text-white/30 text-sm">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-white/50 text-sm">User: {log.userEmail}</p>
                <p className="text-white/50 text-sm">Resource: {log.resource}</p>
                <p className="text-white/30 text-xs mt-2">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">System Settings</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-medium mb-2">WhatsApp Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-sm block mb-1">Phone Number ID</label>
                  <input type="text" defaultValue="1251629638023277" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="text-white/50 text-sm block mb-1">Support Number</label>
                  <input type="text" defaultValue="+201061365444" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">SMTP Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-sm block mb-1">SMTP Host</label>
                  <input type="text" defaultValue="smtp.gmail.com" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="text-white/50 text-sm block mb-1">SMTP Port</label>
                  <input type="text" defaultValue="587" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white" />
                </div>
              </div>
            </div>
            <button className="rounded-lg bg-cyan-500 px-6 py-2 text-white hover:bg-cyan-600">
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
