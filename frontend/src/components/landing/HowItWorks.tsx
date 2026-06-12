const steps = [
  { icon: "📝", title: "Sign Up", desc: "Create your free account. No credit card needed." },
  { icon: "🐳", title: "Push Your Code", desc: "Connect GitHub or push a Docker image." },
  { icon: "⚡", title: "Deploy", desc: "One click. Auto SSL, custom domain, ready in 60 seconds." },
  { icon: "📈", title: "Scale", desc: "Upgrade anytime. We handle Kubernetes for you." },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">How It Works</h2>
        <p className="mt-3 text-white/60">Four steps from idea to production.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-4">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          >
            <div className="absolute -top-3 -left-3 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-sm font-bold text-slate-950">
              {i + 1}
            </div>
            <div className="mb-3 text-3xl">{s.icon}</div>
            <h3 className="mb-2 font-semibold">{s.title}</h3>
            <p className="text-sm text-white/60">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
