const items = [
  {
    quote:
      "VoidCloud saved us months of Kubernetes setup. Deployed our MVP in hours, not weeks.",
    author: "Ahmed K.",
    role: "CTO at Cairo Fintech",
  },
  {
    quote:
      "Finally, a hosting platform that supports Fawry! No more international cards for my Egyptian clients.",
    author: "Sara M.",
    role: "Full-stack Developer",
  },
  {
    quote:
      "The free tier is generous, and the Pro plan is cheaper than DigitalOcean but includes managed K8s.",
    author: "Omar E.",
    role: "SaaS Founder",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Loved by Developers</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <div
            key={t.author}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          >
            <div className="mb-3 text-amber-400">★★★★★</div>
            <p className="text-white/80">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="font-semibold">{t.author}</div>
              <div className="text-xs text-white/50">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
