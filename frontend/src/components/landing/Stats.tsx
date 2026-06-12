"use client";

import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 500, suffix: "+", label: "Deployments" },
  { value: 98, suffix: "%", label: "Uptime SLA" },
  { value: 50, suffix: "ms", label: "Avg Response (Egypt)" },
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
      setV(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);
  return v;
}

function Stat({ value, suffix, label, visible }: { value: number; suffix: string; label: string; visible: boolean }) {
  const v = useCountUp(value, visible);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
      <div className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-4xl font-bold text-transparent">
        {v}
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
      <p className="mb-6 text-center text-sm uppercase tracking-widest text-white/40">
        Trusted by developers from
      </p>
      <div className="mb-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-2xl font-bold text-white/40">
        <span>Google</span>
        <span>Microsoft</span>
        <span>Stripe</span>
        <span>Fawry</span>
        <span>InstaPay</span>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Stat key={s.label} {...s} visible={visible} />
        ))}
      </div>
    </section>
  );
}
