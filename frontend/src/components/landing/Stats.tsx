"use client";

import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 50, suffix: "+", label: "Deployments in beta" },
  { value: 99.9, suffix: "%", label: "Uptime SLA", decimals: 1 },
  { value: 50, prefix: "<", suffix: "ms", label: "Avg Response (Egypt)" },
  { value: 24, suffix: "/7", label: "Support" },
];

function useCountUp(target: number, start: boolean, duration = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - startTime) / duration);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);
  return v;
}

function Stat({
  value,
  suffix,
  prefix,
  label,
  decimals,
  visible,
}: {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
  decimals?: number;
  visible: boolean;
}) {
  const v = useCountUp(value, visible);
  const display = decimals ? v.toFixed(decimals) : Math.floor(v).toString();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
      <div className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-4xl font-bold text-transparent">
        {prefix}
        {display}
        {suffix}
      </div>
      <div className="mt-2 text-sm text-white/60">{label}</div>
    </div>
  );
}

export function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Stat key={s.label} {...s} visible={visible} />
        ))}
      </div>
    </section>
  );
}
