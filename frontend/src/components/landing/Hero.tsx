import Link from "next/link";

export function Hero() {
  return (
    <header className="relative overflow-hidden px-6 py-24 text-center md:py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.18),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,70,239,0.12),transparent_50%)]" />

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
          <span className="relative grid h-2 w-2 place-items-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          All systems operational
        </span>
        <span className="inline-block rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
          🚀 Now Live — Phase 2 Launch
        </span>
      </div>

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
          href="mailto:nova-cloud-2026@outlook.com?subject=Enterprise%20Demo%20Request"
          className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 hover:bg-white/10"
        >
          📞 Request Enterprise Demo
        </Link>
      </div>

      <p className="mt-4 text-xs text-white/40">
        7-day free trial · After trial, deployments pause until you upgrade · No auto-charge
      </p>
    </header>
  );
}
