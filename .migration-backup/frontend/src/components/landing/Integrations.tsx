const integrations = [
  "Stripe",
  "Fawry",
  "InstaPay",
  "Vodafone Cash",
  "GitHub",
  "Docker",
  "Kubernetes",
  "Cloudflare",
];

const stack = [
  "Built with NestJS + Next.js",
  "Runs on Kubernetes",
  "Secured by Cloudflare",
  "Payments by Stripe + Fawry",
];

export function Integrations() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <p className="mb-6 text-center text-sm uppercase tracking-widest text-white/40">
        Integrated with
      </p>
      <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-lg font-semibold text-white/50">
        {integrations.map((i) => (
          <span key={i} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            {i}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40">
        {stack.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </section>
  );
}
