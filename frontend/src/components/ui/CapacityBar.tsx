interface CapacityBarProps {
  used: number;
  total: number;
  label: string;
  format?: (n: number) => string;
}

/**
 * Horizontal capacity/utilization bar. Color shifts to yellow >70% and red >90%.
 * Extracted from admin/clusters for reuse across dashboards.
 */
export function CapacityBar({ used, total, label, format }: CapacityBarProps) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-cyan-400";
  return (
    <div className="min-w-[120px]">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="font-mono text-white/80">
          {format ? format(used) : used} / {format ? format(total) : total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default CapacityBar;
