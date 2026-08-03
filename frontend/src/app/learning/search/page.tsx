"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@workspace/ui-kit/page-header";
import { Search, BookOpen, ListChecks, Award, X } from "lucide-react";
import { LEARNING_DOCS, LEARNING_CERTS, levelOf, type ContentLevel } from "@/features/learning/content";
import { useLearningChecklists } from "@/features/learning/useLearningChecklists";

type Filter = "all" | "docs" | "checklists" | "certs";

interface Hit {
  kind: "docs" | "checklists" | "certs";
  id: string;
  title: string;
  summary: string;
  tags: string[];
  level: ContentLevel;
  href: string;
}

const LEVELS: ContentLevel[] = ["beginner", "intermediate", "advanced"];

/**
 * Field-weighted relevance: exact title match ranks above title prefix,
 * which ranks above tag hits, which rank above summary hits.
 */
function scoreHit(hit: Hit, terms: string[]): number {
  if (terms.length === 0) return 1;
  const title = hit.title.toLowerCase();
  const summary = hit.summary.toLowerCase();
  const tags = hit.tags.map((t) => t.toLowerCase());

  let score = 0;
  for (const term of terms) {
    let termScore = 0;
    if (title === term) termScore += 120;
    else if (title.startsWith(term)) termScore += 80;
    else if (title.includes(term)) termScore += 50;

    if (tags.some((t) => t === term)) termScore += 40;
    else if (tags.some((t) => t.includes(term))) termScore += 20;

    if (summary.includes(term)) termScore += 10;

    if (termScore === 0) return 0; // every term must match somewhere
    score += termScore;
  }
  // Shorter titles are usually the more precise answer.
  return score + Math.max(0, 20 - hit.title.length / 4);
}

export default function LearningSearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeLevels, setActiveLevels] = useState<ContentLevel[]>([]);
  const { all } = useLearningChecklists();

  const index: Hit[] = useMemo(
    () => [
      ...LEARNING_DOCS.map((d) => ({
        kind: "docs" as const,
        id: d.id,
        title: d.title,
        summary: d.summary,
        tags: d.tags,
        level: levelOf(d.id),
        href: d.href,
      })),
      ...all.map((c) => ({
        kind: "checklists" as const,
        id: c.id,
        title: c.title,
        summary: c.summary,
        tags: c.tags,
        level: levelOf(c.id),
        href: `/learning/checklists/${c.id}`,
      })),
      ...LEARNING_CERTS.map((c) => ({
        kind: "certs" as const,
        id: c.id,
        title: c.title,
        summary: c.summary,
        tags: c.tags,
        level: levelOf(c.id),
        href: c.href,
      })),
    ],
    [all]
  );

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const hit of index) for (const t of hit.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [index]);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return index
      .filter((hit) => filter === "all" || hit.kind === filter)
      .filter((hit) => activeLevels.length === 0 || activeLevels.includes(hit.level))
      .filter((hit) => activeTags.length === 0 || activeTags.every((t) => hit.tags.includes(t)))
      .map((hit) => ({ hit, score: scoreHit(hit, terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title));
  }, [index, query, filter, activeTags, activeLevels]);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: index.length },
    { id: "docs", label: "Docs", count: index.filter((i) => i.kind === "docs").length },
    { id: "checklists", label: "Checklists", count: index.filter((i) => i.kind === "checklists").length },
    { id: "certs", label: "Cert prep", count: index.filter((i) => i.kind === "certs").length },
  ];

  const icons = { docs: BookOpen, checklists: ListChecks, certs: Award };
  const levelStyles: Record<ContentLevel, string> = {
    beginner: "bg-emerald-500/10 text-emerald-400",
    intermediate: "bg-amber-500/10 text-amber-400",
    advanced: "bg-rose-500/10 text-rose-400",
  };

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const hasFacets = activeTags.length > 0 || activeLevels.length > 0;

  return (
    <AppLayout>
      <PageHeader
        title="Search the Learning Hub"
        description="One ranked search across DevOps docs, interactive checklists and certification prep"
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

      <div className="mb-3 flex flex-wrap gap-2">
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Level</span>
        {LEVELS.map((lvl) => (
          <button
            key={lvl}
            onClick={() => toggle(activeLevels, lvl, setActiveLevels)}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
              activeLevels.includes(lvl)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Tags</span>
        {allTags.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => toggle(activeTags, tag, setActiveTags)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              activeTags.includes(tag)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tag} ({count})
          </button>
        ))}
        {hasFacets && (
          <button
            onClick={() => {
              setActiveTags([]);
              setActiveLevels([]);
            }}
            className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {results.length} result{results.length === 1 ? "" : "s"}
        {query.trim() ? " ranked by relevance" : ""}
      </p>

      {results.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No results{query.trim() ? ` for “${query}”` : ""}. Try a broader term like “kubernetes” or “ci/cd”, or clear the filters.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map(({ hit }) => {
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
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">{hit.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${levelStyles[hit.level]}`}>
                        {hit.level}
                      </span>
                    </div>
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
