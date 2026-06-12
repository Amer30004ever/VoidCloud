import Link from "next/link";

const cols = [
  {
    title: "Product",
    links: [
      ["Features", "#features"],
      ["Pricing", "#pricing"],
      ["Changelog", "/changelog"],
      ["Roadmap", "/docs"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Documentation", "/docs"],
      ["API Reference", "/docs"],
      ["Status Page", "/status"],
      ["Support", "mailto:support@amercloud.dev"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Blog", "/blog"],
      ["Careers", "/careers"],
      ["Contact", "mailto:hello@amercloud.dev"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Security", "/security"],
      ["GDPR", "/gdpr"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/40 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-slate-950">
                ☁
              </span>
              AmerCloud
            </Link>
            <p className="mt-3 text-sm text-white/50">
              Kubernetes hosting built for Egypt and the world.
            </p>
            <div className="mt-4 flex gap-3 text-white/50">
              <a href="https://github.com" aria-label="GitHub" className="hover:text-white">GH</a>
              <a href="https://twitter.com" aria-label="Twitter" className="hover:text-white">𝕏</a>
              <a href="https://linkedin.com" aria-label="LinkedIn" className="hover:text-white">in</a>
              <a href="https://discord.com" aria-label="Discord" className="hover:text-white">DC</a>
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold text-white">{col.title}</h4>
              <ul className="space-y-2 text-sm text-white/60">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/5 pt-6 text-center text-sm text-white/40">
          © {new Date().getFullYear()} AmerCloud. Built by Amer Magdi. Hosted on our own
          Kubernetes cluster in Egypt 🇪🇬
        </div>
      </div>
    </footer>
  );
}
