import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useRouter } from "@/compat/next-navigation";
import { cloudDatabases, type ManagedDb, type DbBackup } from "@/lib/cloud";

export default function DatabaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [db, setDb] = useState<ManagedDb | null>(null);
  const [backups, setBackups] = useState<DbBackup[]>([]);
  const [revealPw, setRevealPw] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    cloudDatabases.get(id).then(setDb);
    cloudDatabases.backups(id).then(setBackups);
  }, [id]);

  if (!db) return <p className="text-white/50">Loading…</p>;

  const copy = (s: string) => { navigator.clipboard.writeText(s); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const remove = async () => {
    if (!confirm("Delete this database? This cannot be undone.")) return;
    await cloudDatabases.remove(db.id);
    router.push("/amercloud/dashboard/databases");
  };

  const toggleReplica = async () => {
    const next = db.readReplicas > 0 ? 0 : 1;
    const updated = await cloudDatabases.update(db.id, { readReplicas: next });
    setDb(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">{db.name}</h1>
          <p className="mt-1 text-sm text-white/60">{db.engine} · {db.status}</p>
        </div>
        <button onClick={remove} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">Delete</button>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-base font-semibold text-white mb-3">Connection</h2>
        <Row k="Host" v={db.host} onCopy={() => copy(db.host)} />
        <Row k="Port" v={String(db.port)} />
        <Row k="Username" v={db.username} />
        <Row k="Password" v={revealPw ? db.password : "•".repeat(20)}
          onCopy={() => copy(db.password)}
          extra={<button onClick={() => setRevealPw(!revealPw)} className="text-xs text-cyan-300 hover:underline">{revealPw ? "Hide" : "Reveal"}</button>} />
        <Row k="Connection String" v={revealPw ? db.connectionString : db.connectionString.replace(db.password, "••••")}
          onCopy={() => copy(db.connectionString)} />
        {copied && <p className="mt-2 text-xs text-emerald-300">Copied to clipboard</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-base font-semibold text-white mb-3">Scaling</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase text-white/50">Vertical scale</div>
            <p className="mt-1 text-sm text-white/80">Change RAM/storage by upgrading to a larger plan.</p>
            <button className="mt-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">Change plan</button>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase text-white/50">Horizontal scale</div>
            <p className="mt-1 text-sm text-white/80">Read replicas: <span className="font-mono">{db.readReplicas}</span></p>
            <button onClick={toggleReplica} className="mt-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              {db.readReplicas > 0 ? "Remove replica" : "Add read replica"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Backups</h2>
          <span className="text-xs text-white/50">Daily automated · PITR {db.pitrEnabled ? "enabled" : "disabled"}</span>
        </div>
        {backups.length === 0 ? (
          <p className="text-sm text-white/50">No backups yet.</p>
        ) : (
          <div className="space-y-1">
            {backups.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <div>
                  <div className="text-white">{new Date(b.createdAt).toLocaleString()}</div>
                  <div className="text-xs text-white/50">{b.sizeMB} MB · {b.status}</div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs">Restore</button>
                  <button className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ k, v, onCopy, extra }: { k: string; v: string; onCopy?: () => void; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
      <div className="w-40 text-xs text-white/50">{k}</div>
      <code className="flex-1 truncate font-mono text-xs text-cyan-200">{v}</code>
      {extra}
      {onCopy && <button onClick={onCopy} className="text-xs text-cyan-300 hover:underline">Copy</button>}
    </div>
  );
}
