const features = [
  {
    icon: "🚀",
    title: "One-Click Deploy",
    desc: "Deploy from GitHub, Docker Hub, or any container registry. Auto SSL, custom domains, and rollbacks included.",
  },
  {
    icon: "💳",
    title: "Egyptian Payments",
    desc: "Local payment methods built in — no international card needed.",
    badges: ["Fawry", "InstaPay", "Vodafone Cash", "Stripe"],
  },
  {
    icon: "📊",
    title: "Real-Time Monitoring",
    desc: "Live CPU, RAM, and storage graphs. Prometheus metrics and Grafana dashboards built-in.",
  },
  {
    icon: "🔒",
    title: "Enterprise Security",
    desc: "2FA, OAuth (GitHub/Google), audit logs, and automatic daily backups. Your data stays yours.",
  },
  {
    icon: "🌍",
    title: "Global + Local",
    desc: "Deploy to our Egypt-based cluster (low latency) or international regions. CDN included.",
  },
  {
    icon: "🤖",
    title: "CI/CD Pipeline",
    desc: "GitHub Actions integration. Auto-deploy on git push. Preview deployments for pull requests.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-12 text-center">
        <h2 className="section-title">Everything You Need to Ship</h2>
        <p className="section-subtitle">A complete platform — no glue code required.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
          >
            <div className="mb-3 text-3xl">{f.icon}</div>
            <h3 className="mb-2 font-semibold">{f.title}</h3>
            <p className="text-sm text-white/60">{f.desc}</p>
            {f.badges && (
              <div className="mt-3 flex flex-wrap gap-2">
                {f.badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
