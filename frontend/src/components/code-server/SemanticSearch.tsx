"use client";

import { useEffect, useState } from "react";

export default function CodeServerSemanticSearch() {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
        if (!cancelled) setAvailable(res.ok);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="text-sm font-semibold text-white">Semantic Code Search</div>
      <p className="mt-2 text-sm text-white/60">
        This feature is provided by a VS Code extension pre-installed in your code-server image. 
        It uses the local Ollama embedding model to index your workspace and provide semantic code search.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${available === true ? 'bg-emerald-400' : available === false ? 'bg-red-400' : 'bg-yellow-400'}`} />
        <span className="text-xs text-white/70">
          {available === true ? 'Connected to local Ollama endpoint' : available === false ? 'Ollama endpoint unreachable' : 'Checking...'}
        </span>
      </div>
      <div className="mt-3 text-xs text-white/40">
        Use <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px]">Ctrl+Shift+P</kbd> → “Semantic Code Search” to search your codebase.
      </div>
    </div>
  );
}
