import { useState } from "react";
import { Radar } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLocalStore } from "@/hooks/useLocalStore";

interface Skill { id: string; name: string; level: number; createdAt: string; updatedAt: string }
const SEED: Skill[] = [
  { id: "1", name: "Kubernetes", level: 4, createdAt: "", updatedAt: "" },
  { id: "2", name: "Terraform", level: 4, createdAt: "", updatedAt: "" },
  { id: "3", name: "AWS", level: 3, createdAt: "", updatedAt: "" },
  { id: "4", name: "Linux", level: 5, createdAt: "", updatedAt: "" },
  { id: "5", name: "CI/CD", level: 4, createdAt: "", updatedAt: "" },
  { id: "6", name: "Observability", level: 3, createdAt: "", updatedAt: "" },
];

export default function SkillsMatrixPage() {
  const { items, ready, create, update, remove } = useLocalStore<Skill>("amer.skills", SEED);
  const [name, setName] = useState("");

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Radar className="h-6 w-6 text-primary" /> Skills Matrix</h1>
        <p className="text-sm text-muted-foreground">Self-assess 0–5 per skill.</p>
        {ready && (
          <div className="space-y-3">
            {items.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="w-40 truncate text-sm font-medium">{s.name}</div>
                <input type="range" min={0} max={5} value={s.level} onChange={(e) => update(s.id, { level: Number(e.target.value) })} className="flex-1" />
                <div className="w-8 text-sm font-semibold text-primary">{s.level}</div>
                <button onClick={() => remove(s.id)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); if (!name) return; create({ name, level: 1 } as Partial<Skill>); setName(""); }} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add skill…" className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Add</button>
        </form>
      </div>
    </AppLayout>
  );
}
