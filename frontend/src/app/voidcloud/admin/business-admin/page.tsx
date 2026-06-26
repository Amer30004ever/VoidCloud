"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface BusinessStats {
  totalUsers: number;
  activeConversations: number;
  totalVPS: number;
  monthlyRevenue: number;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
}

interface Conversation {
  id: string;
  contactId: string;
  status: string;
  assignedTo?: string;
  lastMessage: string;
  updatedAt: string;
}

interface VPSInstance {
  id: string;
  name: string;
  status: string;
  cpu: number;
  memory: number;
  storage: number;
}

export default function BusinessAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "conversations" | "vps" | "settings" | "analytics">("overview");
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [vpsInstances, setVpsInstances] = useState<VPSInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("AGENT");

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, teamRes, convRes, vpsRes] = await Promise.all([
        fetch("/api/v1/business/stats"),
        fetch("/api/v1/business/team"),
        fetch("/api/v1/business/conversations"),
        fetch("/api/v1/business/vps"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (teamRes.ok) setTeamMembers(await teamRes.json());
      if (convRes.ok) setConversations(await convRes.json());
      if (vpsRes.ok) setVpsInstances(await vpsRes.json());
    } catch (error) {
      console.error("Failed to fetch business admin data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
      window.location.href = "/voidcloud/dashboard";
      return;
    }
    fetchData();
  }, [user, fetchData]);

  const addTeamMember = async () => {
    if (!newMemberEmail) return;
    try {
      const res = await fetch("/api/v1/business/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newMemberEmail, role: newMemberRole }),
      });

      if (res.ok) {
        setNewMemberEmail("");
        setShowAddMember(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add team member:", error);
    }
  };

  const removeTeamMember = async (memberId: string) => {
    if (!confirm("Remove this team member?")) return;
    try {
      const res = await fetch(`/api/v1/business/team/${memberId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to remove team member:", error);
    }
  };

  if (loading) return <div className="p-6 text-white/50">Loading Business Admin Dashboard...</div>;

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Business Admin Dashboard</h1>
        <p className="text-white/50 mt-2">Manage your business team and operations</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-white/10 overflow-x-auto">
        {["overview", "team", "conversations", "vps", "settings", "analytics"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "overview" | "team" | "conversations" | "vps" | "settings" | "analytics")}
            className={`px-4 py-2 capitalize whitespace-nowrap ${
              activeTab === tab
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
              <h3 className="text-white/50 text-sm mb-2">Team Members</h3>
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white/50 text-sm mb-2">Active Conversations</h3>
              <p className="text-3xl font-bold text-white">{stats.activeConversations}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white/50 text-sm mb-2">VPS Instances</h3>
              <p className="text-3xl font-bold text-white">{stats.totalVPS}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white/50 text-sm mb-2">Monthly Revenue</h3>
              <p className="text-3xl font-bold text-emerald-400">${stats.monthlyRevenue}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowAddMember(true)}
                className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-center text-cyan-300 hover:bg-cyan-400/20"
              >
                Add Team Member
              </button>
              <a href="/voidcloud/admin/whatsapp-crm" className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/10 p-4 text-center text-fuchsia-300 hover:bg-fuchsia-400/20">
                WhatsApp CRM
              </a>
              <a href="/voidcloud/dashboard/vps" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-center text-emerald-300 hover:bg-emerald-400/20">
                Manage VPS
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Team Members</h2>
              <button
                onClick={() => setShowAddMember(true)}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm text-white hover:bg-cyan-600"
              >
                Add Member
              </button>
            </div>

            {showAddMember && (
              <div className="mb-6 p-4 rounded-lg border border-white/10 bg-white/5">
                <h3 className="text-white font-medium mb-4">Add New Team Member</h3>
                <div className="flex gap-4">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
                  >
                    <option value="AGENT">Agent</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    onClick={addTeamMember}
                    className="rounded-lg bg-emerald-500 px-6 py-2 text-white hover:bg-emerald-600"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddMember(false)}
                    className="rounded-lg border border-white/10 px-6 py-2 text-white hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{member.name}</p>
                    <p className="text-white/50 text-sm">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                      {member.role}
                    </span>
                    <span className="text-white/30 text-sm">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => removeTeamMember(member.id)}
                      className="text-red-400 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "conversations" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Your Business Conversations</h2>
          <div className="space-y-4">
            {conversations.map((conv) => (
              <div key={conv.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{conv.contactId}</span>
                  <span className={`rounded-full px-3 py-1 text-xs ${
                    conv.status === "OPEN" ? "bg-emerald-500/10 text-emerald-300" : "bg-blue-500/10 text-blue-300"
                  }`}>
                    {conv.status}
                  </span>
                </div>
                <p className="text-white/50 text-sm truncate">{conv.lastMessage}</p>
                <p className="text-white/30 text-xs mt-2">
                  {conv.assignedTo ? `Assigned to: ${conv.assignedTo}` : "Unassigned"} · {new Date(conv.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <a href="/voidcloud/admin/whatsapp-crm" className="inline-block mt-4 rounded-lg bg-cyan-500 px-6 py-2 text-white hover:bg-cyan-600">
            Open Full CRM
          </a>
        </div>
      )}

      {activeTab === "vps" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Your VPS Instances</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 text-left text-white/50 text-sm">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Resources</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vpsInstances.map((vps) => (
                  <tr key={vps.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{vps.name}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs ${
                        vps.status === "RUNNING" ? "bg-emerald-500/10 text-emerald-300" : "bg-yellow-500/10 text-yellow-300"
                      }`}>
                        {vps.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/70">{vps.cpu} CPU · {vps.memory}MB · {Math.ceil(vps.storage/1024)}GB</td>
                    <td className="p-4">
                      <a href={`/voidcloud/dashboard/vps/${vps.id}`} className="text-cyan-300 hover:underline text-sm">Manage</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Business Settings</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-medium mb-2">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-sm block mb-1">Business Name</label>
                  <input type="text" defaultValue="My Business" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="text-white/50 text-sm block mb-1">Support Email</label>
                  <input type="email" defaultValue="support@business.com" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">WhatsApp Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-sm block mb-1">Business Phone Number</label>
                  <input type="text" defaultValue="+201061365444" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="text-white/50 text-sm block mb-1">Auto-reply Enabled</label>
                  <select className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </div>
            <button className="rounded-lg bg-cyan-500 px-6 py-2 text-white hover:bg-cyan-600">
              Save Settings
            </button>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Business Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white font-medium mb-4">Conversation Volume</h3>
              <div className="h-48 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/50">
                Chart placeholder
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium mb-4">Response Time</h3>
              <div className="h-48 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/50">
                Chart placeholder
              </div>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-white font-medium mb-4">Key Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-white/50 text-sm">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">5.2 min</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-white/50 text-sm">Resolution Rate</p>
                <p className="text-2xl font-bold text-emerald-400">94%</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-white/50 text-sm">Customer Satisfaction</p>
                <p className="text-2xl font-bold text-cyan-400">4.8/5</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
