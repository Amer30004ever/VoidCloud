import Link from "next/link";

export function Hero() {
  return (
    <header className="relative overflow-hidden px-6 py-24 text-center md:py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.18),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,70,239,0.12),transparent_50%)]" />

      <span className="mb-6 inline-block rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
        🚀 Now Live — Phase 2 Launch
      </span>

      <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
        Deploy Your Apps in Seconds.{" "}
        <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
          Pay Only What You Use.
        </span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
        Kubernetes-powered hosting with Egyptian local payments (Fawry / InstaPay) + global Stripe support.
        Free trial, no credit card required.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/amercloud/register"
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 font-semibold text-slate-950 shadow-2xl shadow-cyan-500/20 transition hover:opacity-90"
        >
          Start Free Trial →
        </Link>
        <Link
          href="#pricing"
          className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 hover:bg-white/10"
        >
          View Pricing
        </Link>
      </div>

      <p className="mt-8 text-sm text-white/40">
        🌍 Trusted by developers in Egypt and worldwide
      </p>

      {/* Decorative cluster visual */}
      <div className="mx-auto mt-16 max-w-4xl">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-8 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "api-gateway", status: "running" },
              { label: "web-frontend", status: "running" },
              { label: "redis-cache", status: "running" },
              { label: "postgres-db", status: "running" },
              { label: "worker-queue", status: "deploying" },
              { label: "auth-service", status: "running" },
              { label: "cdn-edge", status: "running" },
              { label: "metrics", status: "running" },
            ].map((p) => (
              <div
                key={p.label}
                className="rounded-lg border border-white/10 bg-black/40 p-3 text-left text-xs"
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      p.status === "running"
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                        : "animate-pulse bg-amber-400"
                    }`}
                  />
                  <span className="text-white/40">pod</span>
                </div>
                <div className="font-mono text-white/90">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
