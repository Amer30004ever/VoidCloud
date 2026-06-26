"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface RbacRole {
  id: string;
  name: string;
  description?: string;
  permissions: Array<{
    permission: {
      id: string;
      name: string;
      resource: string;
      action: string;
    };
  }>;
}

interface RbacPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  userTenants: Array<{
    user: {
      id: string;
      email: string;
      name: string;
    };
    role: RbacRole;
  }>;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function RolesManagementPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "permissions" | "tenants" | "assignments">("roles");
  
  // Form states
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedTenant, setSelectedTenant] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const [rolesRes, permsRes, tenantsRes] = await Promise.all([
        fetch("/api/v1/rbac/roles"),
        fetch("/api/v1/rbac/permissions"),
        fetch("/api/v1/rbac/tenants"),
      ]);

      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (permsRes.ok) setPermissions(await permsRes.json());
      if (tenantsRes.ok) setTenants(await tenantsRes.json());
    } catch (error) {
      console.error("Failed to fetch RBAC data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createRole = async () => {
    try {
      const res = await fetch("/api/v1/rbac/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName, description: newRoleDesc }),
      });
      if (res.ok) {
        setNewRoleName("");
        setNewRoleDesc("");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create role:", error);
    }
  };

  const assignPermissionToRole = async (roleId: string, permissionId: string) => {
    try {
      const res = await fetch(`/api/v1/rbac/roles/${roleId}/permissions/${permissionId}`, {
        method: "POST",
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Failed to assign permission:", error);
    }
  };

  const removePermissionFromRole = async (roleId: string, permissionId: string) => {
    try {
      const res = await fetch(`/api/v1/rbac/roles/${roleId}/permissions/${permissionId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Failed to remove permission:", error);
    }
  };

  const assignUserToTenant = async () => {
    if (!selectedUser || !selectedTenant || !selectedRole) return;
    try {
      const res = await fetch(`/api/v1/rbac/tenants/${selectedTenant}/users/${selectedUser}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selectedRole }),
      });
      if (res.ok) {
        setSelectedUser("");
        setSelectedRole("");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to assign user to tenant:", error);
    }
  };

  if (loading) return <div className="p-6 text-white/50">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Roles & Permissions Management</h1>
      
      <div className="flex gap-2 mb-6 border-b border-white/10">
        {["roles", "permissions", "tenants", "assignments"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "roles" | "permissions" | "tenants" | "assignments")}
            className={`px-4 py-2 capitalize ${
              activeTab === tab
                ? "border-b-2 border-cyan-400 text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "roles" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Role</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Role name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
              />
              <input
                type="text"
                placeholder="Description"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
              />
              <button
                onClick={createRole}
                className="rounded-lg bg-cyan-500 px-6 py-2 font-semibold text-white hover:bg-cyan-600"
              >
                Create Role
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Existing Roles</h2>
            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{role.name}</h3>
                    {role.description && <p className="text-white/50 text-sm">{role.description}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((rp) => (
                      <span
                        key={rp.permission.id}
                        className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300"
                      >
                        {rp.permission.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "permissions" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">All Permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {permissions.map((perm) => (
              <div key={perm.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="font-semibold text-white">{perm.name}</h3>
                <p className="text-white/50 text-sm">
                  {perm.resource}:{perm.action}
                </p>
                {perm.description && <p className="text-white/30 text-xs mt-2">{perm.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "tenants" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Tenants & Members</h2>
          <div className="space-y-4">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{tenant.name}</h3>
                  <span className="text-white/50 text-sm">{tenant.subdomain}</span>
                </div>
                <div className="space-y-2">
                  {tenant.userTenants.map((ut) => (
                    <div key={ut.user.id} className="flex items-center justify-between text-sm">
                      <span className="text-white/70">{ut.user.email}</span>
                      <span className="rounded-full bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-300">
                        {ut.role.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Assign User to Tenant</h2>
          <div className="space-y-4">
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            >
              <option value="">Select Tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.subdomain})
                </option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            >
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="User ID or Email"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
            />
            <button
              onClick={assignUserToTenant}
              className="w-full rounded-lg bg-cyan-500 px-6 py-2 font-semibold text-white hover:bg-cyan-600"
            >
              Assign User
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
