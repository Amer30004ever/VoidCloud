import { useMemo } from "react";
import { Target } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLocalStore } from "@/hooks/useLocalStore";

interface Job { id: string; company: string; role: string; status: string; link?: string; notes?: string; createdAt: string; updatedAt: string }
const COLS = ["Applied", "Interview", "Offer", "Rejected"];

export default function JobTrackerPage() {
  const { items, ready, create, update, remove } = useLocalStore<Job>("amer.jobs", []);
  const grouped = useMemo(() => {
    const g: Record<string, Job[]> = { Applied: [], Interview: [], Offer: [], Rejected: [] };
    items.forEach((j) => (g[j.status] ?? g.Applied).push(j));
    return g;
  }, [items]);

  const add = () => {
    const company = prompt("Company?");
    if (!company) return;
    const role = prompt("Role?") ?? "";
    create({ company, role, status: "Applied" } as Partial<Job>);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Target className="h-6 w-6 text-primary" /> Job Tracker</h1>
          <button onClick={add} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">+ Add job</button>
        </div>
        {!ready ? <div className="text-sm text-muted-foreground">Loading…</div> : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {COLS.map((col) => (
              <div key={col} className="rounded-lg border border-border bg-card/50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{col}</h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{grouped[col]?.length ?? 0}</span>
                </div>
                <div className="space-y-2">
                  {grouped[col]?.map((j) => (
                    <div key={j.id} className="rounded border border-border bg-card p-3 text-sm">
                      <div className="font-semibold">{j.company}</div>
                      <div className="text-xs text-muted-foreground">{j.role}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <select value={j.status} onChange={(e) => update(j.id, { status: e.target.value })} className="rounded bg-background px-1 py-0.5 text-xs">
                          {COLS.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <button onClick={() => remove(j.id)} className="text-muted-foreground hover:text-destructive">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
