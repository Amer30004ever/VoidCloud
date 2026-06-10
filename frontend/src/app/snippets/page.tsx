"use client";
import { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

function SnippetCard({ item, remove }: { item: { id: string; title: string; language?: string; description?: string; content: string }; remove: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{item.title}</div>
          {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
        </div>
        <div className="flex items-center gap-1">
          {item.language && <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{item.language}</span>}
          <button onClick={copy} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button onClick={remove} className="rounded p-1 text-muted-foreground hover:text-destructive" title="Delete">✕</button>
        </div>
      </div>
      <pre className="mt-3 max-h-48 overflow-auto rounded bg-muted p-3 text-xs font-mono text-foreground">
        <code>{item.content}</code>
      </pre>
    </div>
  );
}

export default function SnippetsPage() {
  return (
    <ResourcePage
      storageKey="amer.snippets"
      title="Snippets"
      subtitle="Reusable commands & code with one-click copy."
      icon={<Code2 className="h-6 w-6 text-primary" />}
      searchKeys={["title", "content", "language", "description"]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "language", label: "Language", type: "select", options: ["bash", "yaml", "json", "typescript", "python", "go", "hcl", "sql", "dockerfile"] },
        { name: "description", label: "Description" },
        { name: "content", label: "Snippet", type: "textarea", required: true },
      ]}
      renderCard={(item, { remove }) => (
        <SnippetCard item={item as unknown as { id: string; title: string; language?: string; description?: string; content: string }} remove={remove} />
      )}
    />
  );
}
