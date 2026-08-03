"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { EmptyState } from "@workspace/ui-kit/empty-state";
import { ListSkeleton } from "@workspace/ui-kit/skeleton";
import api from "@/lib/api";

type Lead = { id: string; title: string; status: string; value?: number; tasks?: any[] };

export default function AgentLeads() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/me").then((r) => {
      setRole(r.data?.role ?? null);
      if (r.data?.role !== "AGENT") { router.replace("/voidcloud/dashboard"); return; }
      loadLeads();
    }).catch(() => router.replace("/voidcloud/dashboard"));
  }, [router]);

  async function loadLeads() {
    setLoading(true);
    try {
      const { data } = await api.get("/crm/leads");
      const mine = (data ?? []).filter((l: any) => l.assignedTo);
      setLeads(mine);
    } catch { setLeads([]); } finally { setLoading(false); }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/crm/leads/${id}`, { status });
      loadLeads();
    } catch { /* ignore */ }
  }

  if (role !== "AGENT") return null;

  return (
    <div>
      <h1 className="mb-6 vc-h1">My Leads</h1>
      {loading ? (
        <ListSkeleton rows={4} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Target className="size-6" />}
          title="No leads assigned yet"
          description="Leads assigned to you by an admin will appear here, ready to work through the pipeline."
        />
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="vc-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{l.title}</div>
                  <div className="text-xs text-white/60">{l.status} {l.value ? `· $${l.value}` : ""}</div>
                </div>
                <select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs">
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
