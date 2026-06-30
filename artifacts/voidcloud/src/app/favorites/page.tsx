
import { useEffect, useState } from "react";
import Link from "@/compat/next-link";
import { Star } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ALL_ROUTES } from "@/lib/routes";

const KEY = "amer.favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function toggleFavorite(href: string) {
  const f = getFavorites();
  const next = f.includes(href) ? f.filter((x) => x !== href) : [...f, href];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("favorites:changed"));
}

export default function FavoritesPage() {
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    const refresh = () => setFavs(getFavorites());
    refresh();
    window.addEventListener("favorites:changed", refresh);
    return () => window.removeEventListener("favorites:changed", refresh);
  }, []);

  const items = ALL_ROUTES.filter((r) => favs.includes(r.href));

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Star className="h-6 w-6 text-yellow-500" /> Favorites</h1>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No favorites yet. Star any route from the list below.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {items.map((r) => (
              <div key={r.href} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <Link href={r.href} className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.section} · {r.href}</span>
                </Link>
                <button onClick={() => toggleFavorite(r.href)} className="text-yellow-500"><Star className="h-4 w-4 fill-current" /></button>
              </div>
            ))}
          </div>
        )}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">All routes</h2>
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {ALL_ROUTES.map((r) => {
              const on = favs.includes(r.href);
              return (
                <div key={r.href} className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/40">
                  <Link href={r.href} className="text-sm">{r.label} <span className="text-xs text-muted-foreground">· {r.section}</span></Link>
                  <button onClick={() => toggleFavorite(r.href)} className={on ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}>
                    <Star className={`h-4 w-4 ${on ? "fill-current" : ""}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
