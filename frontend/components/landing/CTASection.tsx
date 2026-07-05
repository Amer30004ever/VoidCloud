import Link from "next/link";

export function CTASection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900 via-slate-900 to-fuchsia-900 p-12 text-center shadow-2xl shadow-fuchsia-500/10">
        <h2 className="text-3xl font-bold md:text-5xl">Ready to Deploy Your Next App?</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/70">
          Join hundreds of developers shipping faster on Void Cloud.
        </p>
        <Link
          href="/register"
          className="mt-8 inline-block rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-8 py-4 font-semibold text-slate-950 shadow-2xl shadow-cyan-500/30 transition hover:opacity-90"
        >
          Start Your Free Trial →
        </Link>
        <p className="mt-4 text-xs text-white/50">No credit card required. Cancel anytime.</p>
      </div>
    </section>
  );
}
