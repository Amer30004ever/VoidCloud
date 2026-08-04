"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, File as FileIcon, Folder } from "lucide-react";

type TreeNode = {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
};

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map(), isFile: false };
  for (const path of paths.slice().sort()) {
    const parts = path.split("/");
    let node = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const childPath = parts.slice(0, index + 1).join("/");
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, path: childPath, children: new Map(), isFile });
      }
      node = node.children.get(part)!;
    });
  }
  return root;
}

function TreeBranch({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const children = Array.from(node.children.values()).sort((a, b) =>
    a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1,
  );

  return (
    <ul className="space-y-0.5">
      {children.map((child) =>
        child.isFile ? (
          <li key={child.path}>
            <button
              type="button"
              onClick={() => onSelect(child.path)}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] font-mono hover:bg-white/5 ${
                selected === child.path ? "bg-primary/10 text-foreground" : "text-muted-foreground"
              }`}
            >
              <FileIcon className="h-3 w-3 shrink-0" />
              {child.name}
            </button>
          </li>
        ) : (
          <li key={child.path}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] font-medium hover:bg-white/5"
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Folder className="h-3 w-3 shrink-0 text-muted-foreground" />
              {child.name}
            </button>
            {open ? (
              <TreeBranch node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
            ) : null}
          </li>
        ),
      )}
    </ul>
  );
}

export function GeneratedFileTree({ files }: { files: Record<string, string> }) {
  const paths = useMemo(() => Object.keys(files), [files]);
  const tree = useMemo(() => buildTree(paths), [paths]);
  const [selected, setSelected] = useState<string | null>(paths[0] ?? null);

  if (paths.length === 0) {
    return <p className="text-xs text-muted-foreground">No files generated.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
      <div className="max-h-80 overflow-auto rounded-lg border border-border bg-slate-950/40 p-1">
        <TreeBranch node={tree} depth={0} selected={selected} onSelect={setSelected} />
      </div>
      <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-slate-950/60 p-3 text-[11px] leading-relaxed">
        <code>{selected ? files[selected] : "Select a file to preview."}</code>
      </pre>
    </div>
  );
}
