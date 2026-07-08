"use client";
export default function TeamPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Team</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
        <div className="mb-4 text-5xl">ðŸ‘¥</div>
        <h2 className="text-xl font-semibold">Invite teammates</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60">Team collaboration is available on Business and Enterprise plans. Upgrade to add up to 5 team members.</p>
        <a href="/voidcloud/dashboard/billing" className="mt-4 inline-block rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950">Upgrade to Business â†’</a>
      </div>
    </div>
  );
}
