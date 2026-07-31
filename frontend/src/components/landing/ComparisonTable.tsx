const rows: Array<{ feature: string; amer: string; aws: string; vercel: string }> = [
  { feature: "Egyptian EGP Pricing", amer: "✓", aws: "✗", vercel: "✗" },
  { feature: "Fawry / InstaPay", amer: "✓", aws: "✗", vercel: "✗" },
  { feature: "Managed Kubernetes", amer: "✓", aws: "Complex (EKS)", vercel: "✗" },
  { feature: "Egypt Latency (<50ms)", amer: "✓", aws: "~150ms", vercel: "~200ms" },
  { feature: "Free Tier", amer: "7-day trial", aws: "12 months (limited)", vercel: "Hobby only" },
  { feature: "Starting Price", amer: "$9 / 270 EGP", aws: "~$73 (EKS)", vercel: "$20" },
  { feature: "Full Container Control", amer: "✓", aws: "✓", vercel: "✗ (serverless)" },
];

export function ComparisonTable() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">How We Compare</h2>
        <p className="mt-3 text-white/60">VoidCloud vs the big players.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-4 font-semibold text-white/70">Feature</th>
              <th className="px-4 py-4 font-bold text-cyan-300">VoidCloud</th>
              <th className="px-4 py-4 font-semibold text-white/50">AWS (EKS)</th>
              <th className="px-4 py-4 font-semibold text-white/50">Vercel</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.feature} className="border-t border-white/5">
                <td className="px-4 py-3 text-white/80">{r.feature}</td>
                <td className="px-4 py-3 font-medium text-cyan-300">{r.amer}</td>
                <td className="px-4 py-3 text-white/60">{r.aws}</td>
                <td className="px-4 py-3 text-white/60">{r.vercel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
