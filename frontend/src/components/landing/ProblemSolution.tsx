export function ProblemSolution() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-12 text-center">
        <h2 className="section-title">
          Stop Fighting Infrastructure. Start Shipping Code.
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 backdrop-blur-xl">
          <div className="mb-4 text-4xl">🏢</div>
          <h3 className="mb-4 text-xl font-bold">Traditional Hosting Sucks</h3>
          <ul className="space-y-3 text-white/70">
            {[
              "Months to set up Kubernetes",
              "Expensive cloud bills",
              "No Egyptian payment support",
              "Complex YAML configurations",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-red-400">✗</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/5 p-8 backdrop-blur-xl">
          <div className="mb-4 text-4xl">⚡</div>
          <h3 className="mb-4 text-xl font-bold">VoidCloud Makes It Easy</h3>
          <ul className="space-y-3 text-white/80">
            {[
              "Deploy in 60 seconds",
              "Pay 60% less than AWS",
              "Fawry + InstaPay + Stripe",
              "Simple dashboard, no YAML",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-cyan-400">✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
