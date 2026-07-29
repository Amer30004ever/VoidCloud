interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
}

/**
 * Compact inline SVG sparkline. Line color reflects the latest sample
 * (100 = green, 0 = red, otherwise yellow). Extracted from monitoring page.
 */
export function Sparkline({ points, width = 120, height = 32 }: SparklineProps) {
  if (!points.length) return <span className="text-xs text-white/40">no data</span>;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = width / Math.max(points.length - 1, 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const last = points[points.length - 1];
  const color =
    last === 100 ? "stroke-emerald-400" : last === 0 ? "stroke-red-400" : "stroke-yellow-400";
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        className={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default Sparkline;
