"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from 'socket.io-client';
import { cloudApi } from '@/features/vps/cloud';
import { getSocketAuthOptions, getSocketBaseUrl } from '@/features/auth/socket-auth';

type Pod = { name: string; namespace: string; status: string; ready: string; restarts: number; age: string; node: string; cpu: string; memory: string };

export default function AdminPodsPage() {
  const [namespace, setNamespace] = useState('voidcloud');
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedPod, setSelectedPod] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [authModal, setAuthModal] = useState<{ open: boolean; pod: string }>({ open: false, pod: '' });
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthTotp, setReauthTotp] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    loadNamespaces();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (namespace) loadPods();
  }, [namespace]);

  useEffect(() => {
    if (selectedPod && namespace) joinLogs(namespace, selectedPod);
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedPod, namespace]);

  async function loadNamespaces() {
    try {
      const ns = await cloudApi.admin.pods.namespaces();
      setNamespaces(ns.namespaces ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message);
    }
  }

  async function loadPods() {
    setLoading(true);
    setError(null);
    try {
      const data = await cloudApi.admin.pods.list(namespace);
      setPods(data.pods ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  }

  function joinLogs(ns: string, pod: string) {
    setLogs([]);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    const socket = io(getSocketBaseUrl(), {
      ...getSocketAuthOptions(),
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => {
      socket.emit('join', { namespace: ns, pod, tailLines: 200 });
    });
    socket.on('log', (msg: { lines: string[] }) => {
      setLogs((prev) => [...prev, ...msg.lines]);
    });
    socket.on('error', (msg: { message: string }) => {
      setError(msg.message);
    });
    socket.on('disconnect', () => {});
    socketRef.current = socket;
  }

  async function confirmReauth() {
    setBusy(authModal.pod);
    try {
      await cloudApi.admin.reauth({ password: reauthPassword || undefined, totpCode: reauthTotp || undefined });
      await cloudApi.admin.pods.restart(namespace, authModal.pod, { password: reauthPassword || undefined, totpCode: reauthTotp || undefined });
      setAuthModal({ open: false, pod: '' });
      setReauthPassword('');
      setReauthTotp('');
      setBusy(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message);
      setBusy(null);
    }
  }

  const statusColor: Record<string, string> = {
    Running: 'text-emerald-300',
    Pending: 'text-yellow-300',
    Failed: 'text-red-300',
    Succeeded: 'text-blue-300',
    Unknown: 'text-white/50',
  };

  return (
    <div className="space-y-6 p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="vc-h1">Kubernetes Pod Manager</h1>
          <p className="text-sm text-white/60">Namespace: {namespace}. Restart and tail logs. All actions are audited and require re-auth.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            {namespaces.map((ns) => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <button onClick={loadPods} disabled={loading} className="vc-btn vc-btn-secondary hover:bg-white/10 disabled:opacity-50">
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="vc-card p-5">
          <div className="text-xs text-white/50">Pods</div>
          <div className="mt-3 text-2xl font-semibold">{pods.length}</div>
        </div>
        <div className="vc-card p-5">
          <div className="text-xs text-white/50">Running</div>
          <div className="mt-3 text-2xl font-semibold text-emerald-300">{pods.filter((p) => p.status === 'Running').length}</div>
        </div>
        <div className="vc-card p-5">
          <div className="text-xs text-white/50">Restarts</div>
          <div className="mt-3 text-2xl font-semibold">{pods.reduce((sum, p) => sum + p.restarts, 0)}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="vc-card">
          <div className="border-b border-white/5 p-4 text-sm font-semibold">Pods</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 text-left text-xs uppercase text-white/50">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ready</th>
                  <th className="p-3">Restarts</th>
                  <th className="p-3">Node</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pods.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-white/50">No pods found.</td></tr>
                )}
                {pods.map((pod) => (
                  <tr key={pod.name} className={`border-b border-white/5 last:border-0 ${selectedPod === pod.name ? 'bg-white/5' : ''}`}>
                    <td className="p-3">
                      <button onClick={() => setSelectedPod(pod.name)} className="text-left hover:underline">
                        {pod.name}
                      </button>
                    </td>
                    <td className={`p-3 ${statusColor[pod.status] || 'text-white/70'}`}>{pod.status}</td>
                    <td className="p-3">{pod.ready}</td>
                    <td className="p-3">{pod.restarts}</td>
                    <td className="p-3 text-white/70">{pod.node}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedPod(pod.name)}
                        className="text-xs text-cyan-300 hover:underline"
                      >Logs</button>
                      <button
                        onClick={() => setAuthModal({ open: true, pod: pod.name })}
                        disabled={busy === pod.name}
                        className="text-xs text-orange-300 hover:underline disabled:opacity-50"
                      >Restart</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="vc-card flex flex-col">
          <div className="border-b border-white/5 p-4 text-sm font-semibold">
            {selectedPod ? `Logs: ${selectedPod}` : 'Select a pod to tail logs'}
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed h-96 bg-black/30">
            {logs.length === 0 ? (
              <div className="text-white/50">No logs yet.</div>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all text-white/80">{line}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {authModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6">
            <h2 className="text-lg font-semibold">Re-authenticate to restart pod</h2>
            <p className="mt-2 text-sm text-white/60">
              Restarting <span className="font-mono text-white">{authModal.pod}</span> requires password or current 2FA code.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />
              <div className="text-center text-xs text-white/40">- or -</div>
              <input
                type="text"
                placeholder="Current 2FA code"
                value={reauthTotp}
                onChange={(e) => setReauthTotp(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setAuthModal({ open: false, pod: '' })} className="vc-btn vc-btn-secondary hover:bg-white/10">Cancel</button>
              <button onClick={confirmReauth} disabled={busy === authModal.pod} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
                {busy === authModal.pod ? 'Verifying…' : 'Confirm restart'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
