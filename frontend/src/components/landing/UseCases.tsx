const cases = [
  {
    icon: "🚀",
    title: "Startups & MVPs",
    desc: "Launch fast without DevOps overhead. Scale when you grow — pay only for what you use.",
  },
  {
    icon: "🏢",
    title: "Egyptian SMEs",
    desc: "Local payments (Fawry/InstaPay), local support in Arabic, low latency for Egyptian customers.",
  },
  {
    icon: "💻",
    title: "Freelance Developers",
    desc: "Deploy client projects without managing servers. White-label hosting you can bill for.",
  },
];

export function UseCases() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-12 text-center">
        <h2 className="section-title">Perfect For</h2>
        <p className="mt-3 text-white/60">From solo devs to growing teams.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {cases.map((c) => (
          <div
            key={c.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/40"
          >
            <div className="mb-4 text-4xl">{c.icon}</div>
            <h3 className="mb-2 text-xl font-bold">{c.title}</h3>
            <p className="text-sm text-white/60">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
