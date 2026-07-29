"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AgentDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    api.get("/auth/me").then((r) => {
      setRole(r.data?.role ?? null);
      if (r.data?.role !== "AGENT") { router.replace("/voidcloud/dashboard"); return; }
      api.get("/crm/leads").then((res) => setLeads(res.data ?? [])).catch(() => setLeads([]));
      api.get("/whatsapp/contacts").then((res) => setContacts(res.data ?? [])).catch(() => setContacts([]));
    }).catch(() => router.replace("/voidcloud/dashboard"));
  }, [router]);

  if (role !== "AGENT") return null;

  const myLeads = leads.filter((l: any) => l.assignedTo);
  const openConversations = conversations.filter((c: any) => c.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Agent Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="text-3xl font-bold">{contacts.length}</div>
          <div className="text-sm text-white/60">Conversations</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="text-3xl font-bold">{myLeads.length}</div>
          <div className="text-sm text-white/60">Assigned Leads</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="text-3xl font-bold">{openConversations}</div>
          <div className="text-sm text-white/60">Open</div>
        </div>
      </div>
    </div>
  );
}
