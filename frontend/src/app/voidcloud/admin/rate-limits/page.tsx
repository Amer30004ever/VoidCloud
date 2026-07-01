"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/lib/api";

interface TopIp { ip: string; requests: number; blocked: boolean; country?: string; tenant?: string }
interface TenantRpm { tenantId: string; name: string; rpm: number; limit: number; status: "ok" | "warning" | "throttled" }
interface BlockedEntry { id: string; ip: string; reason: string; blockedAt: string; expiresAt?: string; permanent: boolean }

const MOCK_IPS: TopIp[] = [
  { ip: "41.206.188.12", requests: 12480, blocked: false, country: "EG", tenant: "AcmeCorp" },
  { ip: "185.220.101.45", requests: 8920, blocked: true, country: "RU" },
  { ip: "103.21.244.0", requests: 6740, blocked: false, country: "US", tenant: "TechStart" },
  { ip: "198.71.233.54", requests: 5100, blocked: true, country: "CN" },
  { ip: "10.51.100.31", requests: 3800, blocked: false, country: "Local", tenant: "Internal" },
  { ip: "92.118.160.22", requests: 3200, blocked: false, country: "DE" },
  { ip: "77.88.55.66", requests: 2100, blocked: false, country: "RU" },
];
const MOCK_TENANTS: TenantRpm[] = [
  { tenantId: "t1", name: "AcmeCorp", rpm: 420, limit: 500, status: "warning" },
  { tenantId: "t2", name: "TechStart Ltd", rpm: 85, limit: 200, status: "ok" },
  { tenantId: "t3", name: "Digital Agency", rpm: 520, limit: 200, status: "throttled" },
  { tenantId: "t4", name: "ShopPlus", rpm: 42, limit: 100, status: "ok" },
  { tenantId: "t5", name: "CloudBiz", rpm: 11, limit: 50, status: "ok" },
];
const MOCK_BLOCKED: BlockedEntry[] = [
  { id: "1", ip: "185.220.101.45", reason: "DDoS attempt — 50k req/min", blockedAt: "2026-07-01T08:12:00Z", permanent: true },
  { id: "2", ip: "198.71.233.54", reason: "Credential stuffing", blockedAt: "2026-06-30T14:30:00Z", expiresAt: "2026-07-07T14:30:00Z", permanent: false },
];

export default function RateLimitsPage() {
  const [topIps, setTopIps] = useState<TopIp[]>(MOCK_IPS);
  const [tenantRpms, setTenantRpms] = useState<TenantRpm[]>(MOCK_TENANTS);
  const [blocked, setBlocked] = useState<BlockedEntry[]>(MOCK_BLOCKED);
  const [loading, setLoading] = useState(true);
  const [addIp, setAddIp] = useState("");
  const [addReason, setAddReason] = useState("");
  const [addPermanent, setAddPermanent] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ipsRes, tenantsRes, blockedRes] = await Promise.allSettled([
        api.get("/monitoring/rate-limits/top-ips"),
        api.get("/monitoring/rate-limits/tenant-rpm"),
        api.get("/monitoring/rate-limits/blocked"),
      ]);
      if (ipsRes.status === "fulfilled" && ipsRes.value.data?.length) setTopIps(ipsRes.value.data);
      if (tenantsRes.status === "fulfilled" && tenantsRes.value.data?.length) setTenantRpms(tenantsRes.value.data);
      if (blockedRes.status === "fulfilled" && blockedRes.value.data?.length) setBlocked(blockedRes.value.data);
    } catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function blockIp(ip: string, reason: string, permanent: boolean) {
    setBlocking(true);
    try {
      await api.post("/monitoring/rate-limits/block", { ip, reason, permanent });
      setBlocked((b) => [...b, { id: Date.now().toString(), ip, reason, blockedAt: new Date().toISOString(), permanent }]);
      setTopIps((ips) => ips.map((i) => i.ip === ip ? { ...i, blocked: true } : i));
    } catch { /**/ } finally { setBlocking(false); }
  }

  async function unblockIp(id: string, ip: string) {
    try {
      await api.delete(`/monitoring/rate-limits/block/${id}`);
      setBlocked((b) => b.filter((e) => e.id !== id));
      setTopIps((ips) => ips.map((i) => i.ip === ip ? { ...i, blocked: false } : i));
    } catch { /**/ }
  }

  async function setTenantLimit(tenantId: string, limit: number) {
    try {
      await api.patch(`/monitoring/rate-limits/tenants/${tenantId}`, { limit });
      setTenantRpms((t) => t.map((x) => x.tenantId === tenantId ? { ...x, limit } : x));
    } catch { /**/ }
  }

  const filtered = topIps.filter((ip) => !search || ip.ip.includes(search) || (ip.tenant ?? "").toLowerCase().includes(search.toLowerCase()));
  const throttled = tenantRpms.filter((t) => t.status === "throttled").length;
  const totalReqs = topIps.reduce((s, i) => s + i.requests, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Rate Limits & Abuse</h1>
          <p className="mt-1 text-sm text-white/40">Top IPs · tenant RPM · block list management</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:text-white disabled:opacity-40">
          {loading ? "…" : "↻ Refresh"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Blocked IPs", value: blocked.length, color: "text-red-400", icon: "🚫" },
          { label: "Throttled Tenants", value: throttled, color: "text-amber-400", icon: "⚠️" },
          { label: "Total Requests", value: totalReqs.toLocaleString(), color: "text-cyan-400", icon: "📡" },
          { label: "Suspicious IPs", value: topIps.filter((i) => i.requests > 5000 && !i.tenant).length, color: "text-orange-400", icon: "🕵️" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-2xl">{k.icon}</div>
            <div className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-white/40">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Block IP form */}
      <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-5">
        <p className="mb-3 text-sm font-semibold text-red-300">🚫 Block an IP Address</p>
        <div className="flex flex-wrap gap-3">
          <input value={addIp} onChange={(e) => setAddIp(e.target.value)} placeholder="IP address (e.g. 1.2.3.4 or 1.2.3.0/24)"
            className="flex-1 min-w-[200px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-400/40" />
          <input value={addReason} onChange={(e) => setAddReason(e.target.value)} placeholder="Reason"
            className="flex-1 min-w-[160px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-400/40" />
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer">
            <input type="checkbox" checked={addPermanent} onChange={(e) => setAddPermanent(e.target.checked)} className="rounded" />
            Permanent
          </label>
          <button onClick={() => { if (addIp) { blockIp(addIp, addReason || "Manual block", addPermanent); setAddIp(""); setAddReason(""); } }}
            disabled={!addIp || blocking}
            className="rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-40">
            {blocking ? "Blocking…" : "Block"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top IPs chart */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Top IPs by Requests</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter…"
              className="w-32 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/20 outline-none" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={filtered.slice(0, 7)} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="ip" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} width={110} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }} />
              <Bar dataKey="requests" radius={[0, 4, 4, 0]}
                fill="#ef4444"
                label={false}
                name="Requests"
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1">
            {filtered.slice(0, 7).map((ip) => (
              <div key={ip.ip} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-white/5">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-mono ${ip.blocked ? "text-red-400 line-through" : "text-white/70"}`}>{ip.ip}</span>
                  {ip.country && <span className="text-white/25">{ip.country}</span>}
                  {ip.tenant && <span className="text-cyan-300/60">{ip.tenant}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{ip.requests.toLocaleString()}</span>
                  {ip.blocked
                    ? <span className="text-[10px] text-red-400 border border-red-500/20 rounded px-1">BLOCKED</span>
                    : <button onClick={() => blockIp(ip.ip, "Manual block from dashboard", false)} className="text-[10px] text-red-300 border border-red-500/20 rounded px-1 hover:bg-red-500/10">Block</button>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tenant RPM */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 font-semibold text-white">Tenant RPM vs Limits</h2>
          <div className="space-y-3">
            {tenantRpms.map((t) => {
              const pct = Math.min(100, Math.round((t.rpm / t.limit) * 100));
              const barColor = t.status === "throttled" ? "from-red-500 to-orange-500" : t.status === "warning" ? "from-amber-500 to-yellow-500" : "from-emerald-500 to-teal-500";
              return (
                <div key={t.tenantId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70">{t.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${t.status === "throttled" ? "text-red-400" : t.status === "warning" ? "text-amber-400" : "text-emerald-400"}`}>
                        {t.rpm}/{t.limit} rpm
                      </span>
                      <input type="number" defaultValue={t.limit} min={10} max={10000}
                        onBlur={(e) => setTenantLimit(t.tenantId, Number(e.target.value))}
                        className="w-16 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-white text-center outline-none focus:border-amber-400/40" />
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Block list */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="border-b border-white/5 bg-white/5 px-5 py-3">
          <h2 className="font-semibold text-white">IP Block List ({blocked.length})</h2>
        </div>
        {blocked.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">No blocked IPs</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr className="text-[11px] uppercase tracking-wider text-white/30">
                <th className="px-5 py-3 text-left">IP</th>
                <th className="py-3 text-left">Reason</th>
                <th className="py-3 hidden md:table-cell">Blocked At</th>
                <th className="py-3">Type</th>
                <th className="py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {blocked.map((b) => (
                <tr key={b.id} className="border-t border-white/5">
                  <td className="px-5 py-3 font-mono text-sm text-red-300">{b.ip}</td>
                  <td className="py-3 text-xs text-white/50 max-w-[200px]">{b.reason}</td>
                  <td className="hidden py-3 text-xs text-white/30 md:table-cell">{new Date(b.blockedAt).toLocaleDateString()}</td>
                  <td className="py-3 text-center">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${b.permanent ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
                      {b.permanent ? "Permanent" : "Temporary"}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <button onClick={() => unblockIp(b.id, b.ip)} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20">
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
