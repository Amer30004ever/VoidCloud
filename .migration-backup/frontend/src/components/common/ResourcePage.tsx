"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLocalStore, type LocalRecord } from "@/hooks/useLocalStore";

export interface ResourceField {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "number" | "date" | "url";
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface ResourcePageProps<T extends LocalRecord> {
  storageKey: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  fields: ResourceField[];
  seed?: T[];
  searchKeys?: string[];
  renderCard?: (item: T, actions: { remove: () => void }) => ReactNode;
  emptyHint?: string;
}

export function ResourcePage<T extends LocalRecord>({
  storageKey,
  title,
  subtitle,
  icon,
  fields,
  seed = [],
  searchKeys = ["title", "name"],
  renderCard,
  emptyHint,
}: ResourcePageProps<T>) {
  const { items, ready, create, remove } = useLocalStore<T>(storageKey, seed);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!q) return items;
    const needle = q.toLowerCase();
    return items.filter((it) =>
      searchKeys.some((k) => String((it as Record<string, unknown>)[k] ?? "").toLowerCase().includes(needle))
    );
  }, [items, q, searchKeys]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    for (const f of fields) data[f.name] = form[f.name] ?? "";
    create(data as Partial<T>);
    setForm({});
    setOpen(false);
  };

  const defaultCard = (item: T) => (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {fields.slice(0, 3).map((f) => {
            const v = (item as Record<string, unknown>)[f.name];
            if (!v) return null;
            return (
              <div key={f.name} className={f.name === fields[0].name ? "font-semibold text-foreground truncate" : "text-sm text-muted-foreground mt-1 truncate"}>
                {String(v)}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => remove(item.id)}
          className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {new Date(item.updatedAt).toLocaleString()}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              {icon}
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {!ready ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {emptyHint ?? `No ${title.toLowerCase()} yet. Click "New" to add one.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) =>
              renderCard ? (
                <div key={item.id}>{renderCard(item, { remove: () => remove(item.id) })}</div>
              ) : (
                <div key={item.id}>{defaultCard(item)}</div>
              )
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New {title.replace(/s$/, "")}</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {fields.map((f) => (
              <div key={f.name}>
                <label className="mb-1 block text-xs font-medium text-foreground">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    required={f.required}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    placeholder={f.placeholder}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                ) : f.type === "select" ? (
                  <select
                    required={f.required}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select…</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    required={f.required}
                    type={f.type ?? "text"}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
