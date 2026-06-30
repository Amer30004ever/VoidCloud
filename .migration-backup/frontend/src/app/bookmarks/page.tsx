"use client";
import { Bookmark } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function BookmarksPage() {
  return (
    <ResourcePage
      storageKey="amer.bookmarks"
      title="Bookmarks"
      subtitle="Saved links: docs, dashboards, cheatsheets."
      icon={<Bookmark className="h-6 w-6 text-primary" />}
      searchKeys={["title", "url", "category", "tags"]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "url", label: "URL", type: "url", required: true, placeholder: "https://…" },
        { name: "category", label: "Category", type: "select", options: ["Docs", "Dashboard", "Cheatsheet", "Tool", "Blog", "Other"] },
        { name: "tags", label: "Tags", placeholder: "kubernetes, terraform" },
      ]}
      renderCard={(item, { remove }) => {
        const r = item as unknown as { id: string; title: string; url: string; category?: string; tags?: string; updatedAt: string };
        const host = (() => { try { return new URL(r.url).hostname; } catch { return ""; } })();
        return (
          <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition">
            <div className="flex items-start gap-3">
              {host && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" className="h-6 w-6 rounded" />
              )}
              <div className="min-w-0 flex-1">
                <a href={r.url} target="_blank" rel="noreferrer" className="block truncate font-semibold text-foreground hover:text-primary">
                  {r.title}
                </a>
                <div className="truncate text-xs text-muted-foreground">{host}</div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {r.category && <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">{r.category}</span>}
                  {r.tags && <span className="text-muted-foreground">{r.tags}</span>}
                </div>
              </div>
              <button onClick={remove} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
            </div>
          </div>
        );
      }}
    />
  );
}
