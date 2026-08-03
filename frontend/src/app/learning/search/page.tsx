"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { Search, BookOpen, ListChecks, Award } from "lucide-react";
import { LEARNING_DOCS, LEARNING_CERTS } from "@/features/learning/content";
import { useLearningChecklists } from "@/features/learning/useLearningChecklists";

type Filter = "all" | "docs" | "checklists" | "certs";

interface Hit {
  kind: "docs" | "checklists" | "certs";
  id: string;
  title: string;
  summary: string;
  tags: string[];
  href: string;
}

export default function LearningSearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { all } = useLearningChecklists();

  const index: Hit[] = useMemo(
    () => [
      ...LEARNING_DOCS.map((d) => ({ kind: "docs" as const, id: d.id, title: d.title, summary: d.summary, tags: d.tags, href: d.href })),
      ...all.map((c) => ({
        kind: "checklists" as const,
        id: c.id,
        title: c.title,
        summary: c.summary,
        tags: c.tags,
        href: `/learning/checklists/${c.id}`,
      })),
      ...LEARNING_CERTS.map((c) => ({ kind: "certs" as const, id: c.id, title: c.title, summary: c.summary, tags: c.tags, href: c.href })),
    ],
    [all]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return index.filter((hit) => {
      if (filter !== "all" && hit.kind !== filter) return false;
      if (!q) return true;
      return (
        hit.title.toLowerCase().includes(q) ||
        hit.summary.toLowerCase().includes(q) ||
        hit.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [index, query, filter]);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: index.length },
    { id: "docs", label: "Docs", count: index.filter((i) => i.kind === "docs").length },
    { id: "checklists", label: "Checklists", count: index.filter((i) => i.kind === "checklists").length },
    { id: "certs", label: "Cert prep", count: index.filter((i) => i.kind === "certs").length },
  ];

  const icons = { docs: BookOpen, checklists: ListChecks, certs: Award };

  return (
    <AppLayout>
      <PageHeader
        title="Search the Learning Hub"
        description="One search across DevOps docs, interactive checklists and certification prep"
      />

      <div className="relative mb-4 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs, checklists, certifications…"
          className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              filter === f.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No results for “{query}”. Try a broader term like “kubernetes” or “ci/cd”.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((hit) => {
            const Icon = icons[hit.kind];
            return (
              <Link
                key={`${hit.kind}-${hit.id}`}
                href={hit.href}
                className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{hit.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{hit.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {hit.tags.map((t) => (
                        <span key={t} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-500">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
