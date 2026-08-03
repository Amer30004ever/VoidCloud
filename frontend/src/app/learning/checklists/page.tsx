"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { ListChecks, Plus, Trash2, Globe, Lock, Copy, Search, BarChart3, History, Undo2, Pencil, Award } from "lucide-react";
import { useLearningChecklists, CustomChecklist } from "@/features/learning/useLearningChecklists";
import type { ChecklistTemplate } from "@/features/learning/content";

function blank(): CustomChecklist {
  return {
    id: `custom-${crypto.randomUUID()}`,
    title: "",
    summary: "",
    category: "Custom",
    tags: [],
    steps: [{ id: "s1", title: "" }],
    custom: true,
    published: false,
    updatedAt: new Date().toISOString(),
    version: 1,
    history: [],
  };
}

export default function ChecklistsPage() {
  const { ready, all, stats, saveCustom, deleteCustom, rollbackCustom } = useLearningChecklists();
  const [draft, setDraft] = useState<CustomChecklist | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const startFromTemplate = (tpl: ChecklistTemplate) => {
    setDraft({
      ...blank(),
      title: `${tpl.title} (copy)`,
      summary: tpl.summary,
      category: tpl.category,
      tags: [...tpl.tags],
      steps: tpl.steps.map((s, i) => ({ id: `s${i + 1}`, title: s.title, hint: s.hint })),
    });
  };

  const updateStep = (idx: number, title: string) => {
    if (!draft) return;
    const steps = draft.steps.map((s, i) => (i === idx ? { ...s, title } : s));
    setDraft({ ...draft, steps });
  };

  const publish = (published: boolean) => {
    if (!draft) return;
    const cleaned: CustomChecklist = {
      ...draft,
      title: draft.title.trim() || "Untitled checklist",
      steps: draft.steps.filter((s) => s.title.trim()).map((s, i) => ({ ...s, id: `s${i + 1}` })),
      published,
      updatedAt: new Date().toISOString(),
    };
    saveCustom(cleaned);
    setDraft(null);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Task checklists"
        description="Step-by-step checklists for common DevOps tasks, with progress saved per user"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setDraft(blank())}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New checklist
        </button>
        <Link href="/learning/search" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" /> Search hub
        </Link>
        <Link href="/learning/quiz" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          <Award className="h-4 w-4" /> Practice exams
        </Link>
        <Link href="/learning/progress" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          <BarChart3 className="h-4 w-4" /> My progress
        </Link>
      </div>

      {draft && (
        <section className="mb-8 rounded-xl border border-primary/40 bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Customize checklist</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Checklist title"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              placeholder="Category"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <input
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Short summary"
            className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            value={draft.tags.join(", ")}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            placeholder="Tags, comma separated"
            className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="mt-4 space-y-2">
            {draft.steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-2">
                <span className="w-6 text-xs text-muted-foreground">{idx + 1}.</span>
                <input
                  value={step.title}
                  onChange={(e) => updateStep(idx, e.target.value)}
                  placeholder="Step description"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== idx) })}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:text-red-400"
                  aria-label="Remove step"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setDraft({ ...draft, steps: [...draft.steps, { id: `s${draft.steps.length + 1}`, title: "" }] })}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add step
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => publish(true)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
              <Globe className="h-4 w-4" /> Publish to hub
            </button>
            <button onClick={() => publish(false)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              <Lock className="h-4 w-4" /> Save as draft
            </button>
            <button onClick={() => setDraft(null)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </section>
      )}

      {!ready ? (
        <div className="text-sm text-muted-foreground">Loading checklists…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {all.map((c) => {
            const stat = stats.perChecklist.find((p) => p.checklist.id === c.id);
            const isCustom = "custom" in c;
            return (
              <div key={c.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.category}</span>
                  </div>
                  {isCustom && (
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">
                        v{(c as CustomChecklist).version}
                      </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${(c as CustomChecklist).published ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {(c as CustomChecklist).published ? "Published" : "Draft"}
                    </span>
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-medium text-foreground">{c.title}</h3>
                <p className="mt-1 flex-1 text-xs text-muted-foreground">{c.summary}</p>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{stat?.completed ?? 0}/{c.steps.length} steps</span>
                    <span>{stat?.percent ?? 0}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stat?.percent ?? 0}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/learning/checklists/${c.id}`} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20">
                    Open
                  </Link>
                  <button onClick={() => startFromTemplate(c)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <Copy className="h-3.5 w-3.5" /> Customize
                  </button>
                  {isCustom && (
                    <button
                      onClick={() => setDraft({ ...(c as CustomChecklist) })}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                  {isCustom && (
                    <button
                      onClick={() => setHistoryFor(historyFor === c.id ? null : c.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      aria-expanded={historyFor === c.id}
                    >
                      <History className="h-3.5 w-3.5" /> History ({(c as CustomChecklist).history.length})
                    </button>
                  )}
                  {isCustom && (
                    <button onClick={() => deleteCustom(c.id)} className="ml-auto rounded-lg border border-border p-1.5 text-muted-foreground hover:text-red-400" aria-label="Delete checklist">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {isCustom && historyFor === c.id && (
                  <div className="mt-4 rounded-lg border border-border/70 bg-background/40 p-3">
                    <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Edit history</p>
                    {(c as CustomChecklist).history.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        No prior versions yet — this is the original v{(c as CustomChecklist).version}.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {[...(c as CustomChecklist).history].reverse().map((h) => (
                          <li key={h.version} className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] text-foreground">
                                v{h.version} — {h.note}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {new Date(h.savedAt).toLocaleString()} · {h.steps.length} steps
                              </p>
                            </div>
                            <button
                              onClick={() => rollbackCustom(c.id, h.version)}
                              className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-primary"
                            >
                              <Undo2 className="h-3 w-3" /> Roll back
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
