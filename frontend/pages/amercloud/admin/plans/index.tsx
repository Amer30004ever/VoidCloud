"use client";
import { useEffect, useState } from "react";
import { cloudApi, CloudPlan } from "@/lib/cloud";
import { useLocale } from "@/contexts/LocaleContext";

export default function AdminPlansPage() {
  const { t } = useLocale();
  const [plans, setPlans] = useState<CloudPlan[]>([]);
  const [edit, setEdit] = useState<Partial<CloudPlan> | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  async function load() { setPlans(await cloudApi.admin.plans()); }
  useEffect(() => { (async () => { await load(); })(); }, []);

  async function save() {
    if (!edit) return;
    if (edit.id) await cloudApi.admin.updatePlan(edit.id, edit);
    else await cloudApi.admin.createPlan({ ...edit, features: edit.features ?? [] });
    setEdit(null); load();
  }
  async function del(id: string) {
    if (confirm(t("admin.plans_delete_confirm", "Delete plan?"))) {
      await cloudApi.admin.deletePlan(id);
      load();
    }
  }

  async function persistOrder(next: CloudPlan[]) {
    setPlans(next);
    setSavingOrder(true);
    try {
      await cloudApi.admin.reorderPlans(next.map((p) => p.id));
    } finally {
      setSavingOrder(false);
    }
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = plans.findIndex((p) => p.id === dragId);
    const to = plans.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...plans];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    persistOrder(next);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("admin.plans", "Plans")}</h1>
          <p className="mt-1 text-sm text-white/50">{t("admin.plans_drag_hint", "Drag cards to reorder — same order appears in New VPS wizard.")}{savingOrder ? ` · ${t("common.loading", "Loading…")}` : ""}</p>
        </div>
        <button onClick={() => setEdit({ name: "", priceUSD: 0, priceEGP: 0, features: [] })} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 font-semibold text-slate-950">+ {t("admin.plans_new", "New plan")}</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p, idx) => (
          <div
            key={p.id}
            draggable
            onDragStart={() => setDragId(p.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(p.id)}
            className={`cursor-grab rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl active:cursor-grabbing ${dragId === p.id ? "opacity-50 ring-2 ring-cyan-400/40" : ""}`}
          >
            <div className="mb-2 flex items-center justify-between text-xs text-white/40">
              <span>⋮⋮ {t("admin.plans_drag", "Drag")}</span>
              <span>#{idx + 1}</span>
            </div>
            <div className="flex items-start justify-between">
              <div><div className="text-xl font-bold">{p.name}</div><div className="text-xs text-white/50">{p.slug} {p.isActive ? `· ${t("common.active", "Active")}` : `· ${t("common.inactive", "Inactive")}`}</div></div>
              <div className="text-right"><div className="text-2xl font-bold">${p.priceUSD}</div><div className="text-xs text-white/50">{p.priceEGP} EGP</div></div>
            </div>
            <div className="mt-3 text-xs text-white/60">{p.cpuLimit} CPU · {p.memoryLimit}MB · {p.storageLimit}MB · {p.vpsLimit ?? p.deploymentLimit} VPS · {p.customDomainLimit} domains</div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEdit(p)} className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm">{t("common.edit", "Edit")}</button>
              <button onClick={async () => { await cloudApi.admin.updatePlan(p.id, { isActive: !p.isActive }); load(); }} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">{p.isActive ? t("admin.plans_disable", "Disable") : t("admin.plans_enable", "Enable")}</button>
              <button onClick={() => del(p.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{t("common.delete", "Delete")}</button>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-bold">{edit.id ? t("admin.plans_edit", "Edit plan") : t("admin.plans_new", "New plan")}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <F label={t("common.name", "Name")}><input className={inp} value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></F>
              <F label="Slug"><input className={inp} value={edit.slug ?? ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></F>
              <F label="Price USD"><input type="number" className={inp} value={edit.priceUSD ?? 0} onChange={(e) => setEdit({ ...edit, priceUSD: +e.target.value })} /></F>
              <F label="Price EGP"><input type="number" className={inp} value={edit.priceEGP ?? 0} onChange={(e) => setEdit({ ...edit, priceEGP: +e.target.value })} /></F>
              <F label="CPU"><input type="number" step="0.25" className={inp} value={edit.cpuLimit ?? 0.25} onChange={(e) => setEdit({ ...edit, cpuLimit: +e.target.value })} /></F>
              <F label="Memory MB"><input type="number" className={inp} value={edit.memoryLimit ?? 512} onChange={(e) => setEdit({ ...edit, memoryLimit: +e.target.value })} /></F>
              <F label="Storage MB"><input type="number" className={inp} value={edit.storageLimit ?? 1024} onChange={(e) => setEdit({ ...edit, storageLimit: +e.target.value })} /></F>
              <F label="Deployments"><input type="number" className={inp} value={edit.deploymentLimit ?? 1} onChange={(e) => setEdit({ ...edit, deploymentLimit: +e.target.value })} /></F>
              <F label="VPS limit"><input type="number" className={inp} value={edit.vpsLimit ?? 1} onChange={(e) => setEdit({ ...edit, vpsLimit: +e.target.value })} /></F>
              <F label="Custom domains"><input type="number" className={inp} value={edit.customDomainLimit ?? 0} onChange={(e) => setEdit({ ...edit, customDomainLimit: +e.target.value })} /></F>
              <F label="Sort order"><input type="number" className={inp} value={edit.sortOrder ?? 0} onChange={(e) => setEdit({ ...edit, sortOrder: +e.target.value })} /></F>
              <F label="API requests/mo"><input type="number" className={inp} value={edit.apiRequestLimit ?? 10000} onChange={(e) => setEdit({ ...edit, apiRequestLimit: +e.target.value })} /></F>
              <F label="Trial days"><input type="number" className={inp} value={edit.trialDays ?? 0} onChange={(e) => setEdit({ ...edit, trialDays: +e.target.value })} /></F>
              <F label={t("common.active", "Active")}><input type="checkbox" checked={edit.isActive ?? true} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /></F>
              <F label="Popular"><input type="checkbox" checked={edit.isPopular ?? false} onChange={(e) => setEdit({ ...edit, isPopular: e.target.checked })} /></F>
            </div>
            <F label="Features (one per line)">
              <textarea className={inp} rows={4} value={(edit.features ?? []).join("\n")} onChange={(e) => setEdit({ ...edit, features: e.target.value.split("\n").filter(Boolean) })} />
            </F>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="rounded-lg border border-white/10 px-4 py-2">{t("common.cancel", "Cancel")}</button>
              <button onClick={save} className="rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-2 font-semibold text-slate-950">{t("common.save", "Save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const inp = "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2";
function F({ label, children }: any) { return <label className="block"><span className="mb-1 block text-xs uppercase text-white/60">{label}</span>{children}</label>; }
