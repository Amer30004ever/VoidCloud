"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@workspace/ui-kit/button";

export interface Column<T> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  hidden?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  bulkActions?: BulkAction<T>[];
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, config: FilterConfig) => void;
  onApplyFilter?: (config: FilterConfig) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onQuickEdit?: (row: T) => void;
}

export interface BulkAction<T> {
  label: string;
  variant?: "default" | "destructive" | "outline";
  onExecute: (rows: T[]) => void | Promise<void>;
}

export interface SavedFilter {
  id: string;
  name: string;
  config: FilterConfig;
}

export interface FilterConfig {
  query?: string;
  column?: string;
  value?: string;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  selectedIds,
  onSelectionChange,
  bulkActions = [],
  savedFilters = [],
  onSaveFilter,
  onApplyFilter,
  emptyTitle = "No records",
  emptyDescription = "There are no items to display.",
  onQuickEdit,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showFilterSave, setShowFilterSave] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(columns.map((c) => [c.key, !c.hidden]))
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(columns.map((c) => c.key));

  const visibleColumns = useMemo(() => {
    const map = new Map(columns.map((c) => [c.key, c]));
    return columnOrder.filter((k) => map.has(k) && columnVisibility[k]).map((k) => map.get(k)!);
  }, [columns, columnOrder, columnVisibility]);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a: any, b: any) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) onSelectionChange(new Set());
    else onSelectionChange(new Set(sorted.map(rowKey)));
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const exportCSV = () => {
    const selected = sorted.filter((r) => selectedIds.has(rowKey(r)));
    if (!selected.length) return;
    const headers = visibleColumns.map((c) => c.label);
    const rows = selected.map((r) => visibleColumns.map((c) => {
      const val = (r as any)[c.key];
      if (c.render) return typeof val === "string" ? val : String(val ?? "");
      return typeof val === "string" ? val : String(val ?? "");
    }));
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim() || !onSaveFilter) return;
    onSaveFilter(filterName.trim(), {});
    setFilterName("");
    setShowFilterSave(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 && (
          <>
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            {bulkActions.map((action, i) => (
              <Button key={i} variant={action.variant ?? "outline"} size="sm" onClick={() => action.onExecute(sorted.filter((r) => selectedIds.has(rowKey(r))))}>
                {action.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={exportCSV}>Export CSV</Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowFilterSave((s) => !s)}>
            Save filter
          </Button>
          {savedFilters.map((f) => (
            <Button key={f.id} variant="ghost" size="sm" onClick={() => onApplyFilter?.(f.config)}>
              {f.name}
            </Button>
          ))}
        </div>
        <ColumnMenu
          columns={columns}
          visibility={columnVisibility}
          onToggle={(key) => setColumnVisibility((v) => ({ ...v, [key]: !v[key] }))}
          onReorder={(newOrder) => setColumnOrder(newOrder)}
        />
      </div>

      {showFilterSave && (
        <div className="flex items-center gap-2">
          <input value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="Filter name" className="rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
          <Button size="sm" onClick={handleSaveFilter}>Save</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowFilterSave(false)}>Cancel</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 px-3">
                <input type="checkbox" checked={selectedIds.size === sorted.length && sorted.length > 0} onChange={toggleSelectAll} className="rounded border-border" />
              </th>
              {visibleColumns.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.width ? `w-[${col.width}]` : ""} ${col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""}`} onClick={() => col.sortable && toggleSort(col.key)}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </span>
                </th>
              ))}
              {onQuickEdit && <th className="w-10 px-3" />}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (onQuickEdit ? 2 : 1)} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {emptyTitle}
                  {emptyDescription && <span className="block text-xs mt-1">{emptyDescription}</span>}
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const id = rowKey(row);
                return (
                  <tr key={id} className={`border-t border-border transition-colors ${selectedIds.has(id) ? "bg-primary/5" : ""}`}>
                    <td className="px-3">
                      <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggleRow(id)} className="rounded border-border" />
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render ? col.render(row) : (row as any)[col.key]}
                      </td>
                    ))}
                    {onQuickEdit && (
                      <td className="px-3">
                        <button onClick={() => onQuickEdit(row)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted">✎</button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColumnMenu({ columns, visibility, onToggle, onReorder }: { columns: Column<any>[]; visibility: Record<string, boolean>; onToggle: (key: string) => void; onReorder: (order: string[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>Columns</Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
          {columns.map((col) => (
            <label key={col.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted cursor-pointer">
              <input type="checkbox" checked={!!visibility[col.key]} onChange={() => onToggle(col.key)} className="rounded border-border" />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
