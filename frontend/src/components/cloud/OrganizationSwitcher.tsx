/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cloudOrgs, type Organization } from "@/lib/cloud";

export function OrganizationSwitcher() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    cloudOrgs.list().then((o) => { setOrgs(o); setActive(localStorage.getItem("activeOrgId") || (o[0]?.id ?? null)); }).catch(() => {});
  }, []);

  function pick(id: string | null) {
    setActive(id);
    if (id) localStorage.setItem("activeOrgId", id); else localStorage.removeItem("activeOrgId");
    setOpen(false);
  }

  async function createNew() {
    const name = prompt("Organization name");
    if (!name) return;
    setBusy(true);
    try { const o = await cloudOrgs.create(name); setOrgs([...orgs, o]); pick(o.id); }
    finally { setBusy(false); }
  }

  const current = orgs.find((o) => o.id === active);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10">
        <div className="text-[10px] uppercase text-white/40">Organization</div>
        <div className="font-semibold truncate">{current?.name ?? "Personal"}</div>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-1 shadow-xl">
          <button onClick={() => pick(null)} className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-white/10 ${!active ? "bg-white/5" : ""}`}>Personal</button>
          {orgs.map((o) => (
            <Link key={o.id} href={`/amercloud/dashboard/orgs/${o.id}`} onClick={() => pick(o.id)}
              className={`block rounded px-3 py-2 text-sm hover:bg-white/10 ${active === o.id ? "bg-white/5" : ""}`}>
              {o.name} <span className="text-xs text-white/40">· {o._count?.members ?? 0}m</span>
            </Link>
          ))}
          <button disabled={busy} onClick={createNew} className="mt-1 w-full rounded border-t border-white/10 px-3 py-2 text-left text-sm text-cyan-300 hover:bg-white/5">+ Create organization</button>
        </div>
      )}
    </div>
  );
}
