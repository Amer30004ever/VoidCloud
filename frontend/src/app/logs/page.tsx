"use client";

import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Loader2, FileText, Search, AlertTriangle, RefreshCw, Filter, Layers, Clock, Terminal, Radio } from "lucide-react";
import { logsApi } from "@/lib/logs";
import { useQuery } from "@tanstack/react-query";

type LogView = "pod" | "crash" | "previous" | "multi-pod";

export default function LogsPage() {
  const [selectedNamespace, setSelectedNamespace] = useState<string>("default");
  const [selectedPod, setSelectedPod] = useState<string>("");
  const [selectedDeployment, setSelectedDeployment] = useState<string>("");
  const [activeView, setActiveView] = useState<LogView>("pod");
  const [searchPattern, setSearchPattern] = useState<string>("");
  const [logs, setLogs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: failedPods } = useQuery({
    queryKey: ['failed-pods', selectedNamespace],
    queryFn: async () => {
      const response = await logsApi.getFailedPodLogs(selectedNamespace);
      return response.data;
    },
  });

  const fetchPodLogs = async () => {
    if (!selectedPod) return;
    setIsLoading(true);
    try {
      const response = await logsApi.getPodLogs(selectedNamespace, selectedPod, {
        tailLines: 100,
        timestamps: true,
      });
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs('Error fetching logs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCrashLogs = async () => {
    if (!selectedPod) return;
    setIsLoading(true);
    try {
      const response = await logsApi.getPodCrashLogs(selectedNamespace, selectedPod);
      setLogs(response.data.crashLogs || 'No crash logs available');
    } catch (error) {
      console.error('Error fetching crash logs:', error);
      setLogs('Error fetching crash logs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPreviousLogs = async () => {
    if (!selectedPod) return;
    setIsLoading(true);
    try {
      const response = await logsApi.getPodLogs(selectedNamespace, selectedPod, {
        previous: true,
        tailLines: 100,
        timestamps: true,
      });
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching previous logs:', error);
      setLogs('Error fetching previous logs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMultiPodLogs = async () => {
    if (!selectedDeployment) return;
    setIsLoading(true);
    try {
      const response = await logsApi.getDeploymentLogs(selectedNamespace, selectedDeployment, {
        tailLines: 100,
        timestamps: true,
      });
      const combinedLogs = Object.entries(response.data.pods)
        .map(([podName, podLogs]) => `=== ${podName} ===\n${podLogs}`)
        .join('\n\n');
      setLogs(combinedLogs);
    } catch (error) {
      console.error('Error fetching multi-pod logs:', error);
      setLogs('Error fetching multi-pod logs');
    } finally {
      setIsLoading(false);
    }
  };

  const searchLogs = async () => {
    if (!logs || !searchPattern) return;
    try {
      const response = await logsApi.searchLogs(logs, searchPattern, false);
      setLogs(response.data.results.join('\n'));
    } catch (error) {
      console.error('Error searching logs:', error);
    }
  };

  const handleViewChange = (view: LogView) => {
    setActiveView(view);
    setIsStreaming(false);
    setLogs('');
    if (view === 'pod' && selectedPod) fetchPodLogs();
    else if (view === 'crash' && selectedPod) fetchCrashLogs();
    else if (view === 'previous' && selectedPod) fetchPreviousLogs();
    else if (view === 'multi-pod' && selectedDeployment) fetchMultiPodLogs();
  };

  useEffect(() => {
    if (!isStreaming || activeView !== "pod" || !selectedPod) {
      if (streamRef.current) {
        clearInterval(streamRef.current);
        streamRef.current = null;
      }
      return;
    }

    const tick = () => {
      void fetchPodLogs();
    };
    const timeoutId = window.setTimeout(tick, 0);
    streamRef.current = setInterval(tick, 2000);
    return () => {
      window.clearTimeout(timeoutId);
      if (streamRef.current) clearInterval(streamRef.current);
    };
  }, [isStreaming, activeView, selectedNamespace, selectedPod]);

  return (
    <AppLayout>
      <PageHeader
        title="Logs"
        description="Real-time pod logs with search, crash logs, previous logs, and multi-pod tail"
      />

      <div className="space-y-6">
        {/* Controls */}
        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Namespace</label>
            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="default">default</option>
              <option value="kube-system">kube-system</option>
              <option value="monitoring">monitoring</option>
            </select>
          </div>
          
          {activeView === 'multi-pod' ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Deployment</label>
              <input
                type="text"
                value={selectedDeployment}
                onChange={(e) => setSelectedDeployment(e.target.value)}
                placeholder="my-app"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Pod Name</label>
              <input
                type="text"
                value={selectedPod}
                onChange={(e) => setSelectedPod(e.target.value)}
                placeholder="my-app-12345"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">View Type</label>
            <select
              value={activeView}
              onChange={(e) => handleViewChange(e.target.value as LogView)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="pod">Real-time Logs</option>
              <option value="crash">Crash Logs</option>
              <option value="previous">Previous Logs</option>
              <option value="multi-pod">Multi-pod Tail</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                if (activeView === 'pod') fetchPodLogs();
                else if (activeView === 'crash') fetchCrashLogs();
                else if (activeView === 'previous') fetchPreviousLogs();
                else if (activeView === 'multi-pod') fetchMultiPodLogs();
              }}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Fetch Logs
            </button>
            {activeView === "pod" && selectedPod && (
              <button
                type="button"
                onClick={() => setIsStreaming((s) => !s)}
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${
                  isStreaming ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                }`}
              >
                <Radio className="h-4 w-4" />
                {isStreaming ? "Live" : "Stream"}
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchPattern}
              onChange={(e) => setSearchPattern(e.target.value)}
              placeholder="Search logs (pattern)..."
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={searchLogs}
            disabled={!logs || !searchPattern}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Filter className="h-4 w-4" />
            Search
          </button>
        </div>

        {/* Failed Pods Alert */}
        {failedPods?.failed && failedPods.failed.length > 0 && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">
                Failed Pods ({failedPods.failed.length})
              </h3>
            </div>
            <div className="space-y-2">
              {failedPods.failed.slice(0, 3).map((pod) => (
                <div
                  key={pod.name}
                  className="flex items-center justify-between rounded-lg border border-destructive/30 bg-background/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{pod.name}</p>
                    <p className="text-xs text-muted-foreground">{pod.namespace} • {pod.phase}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPod(pod.name);
                      setSelectedNamespace(pod.namespace);
                      setActiveView('crash');
                      fetchCrashLogs();
                    }}
                    className="text-xs text-destructive hover:underline"
                  >
                    View Crash Logs
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log Viewer */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {activeView === 'pod' && 'Real-time Logs'}
                {activeView === 'crash' && 'Crash Logs'}
                {activeView === 'previous' && 'Previous Logs'}
                {activeView === 'multi-pod' && 'Multi-pod Tail'}
              </span>
              {selectedPod && (
                <span className="text-xs text-muted-foreground">
                  {selectedNamespace}/{selectedPod}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs ? (
              <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted p-4 text-xs text-foreground font-mono">
                {logs}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {activeView === 'multi-pod' ? 'Enter deployment name to fetch logs' : 'Enter pod name to fetch logs'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => setActiveView('pod')}
            className={`flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 ${
              activeView === 'pod' ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <Terminal className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Real-time Logs</p>
              <p className="text-xs text-muted-foreground">Live pod logs</p>
            </div>
          </button>
          <button
            onClick={() => setActiveView('crash')}
            className={`flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 ${
              activeView === 'crash' ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Crash Logs</p>
              <p className="text-xs text-muted-foreground">Previous container logs</p>
            </div>
          </button>
          <button
            onClick={() => setActiveView('previous')}
            className={`flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 ${
              activeView === 'previous' ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <Clock className="h-5 w-5 text-amber-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Previous Logs</p>
              <p className="text-xs text-muted-foreground">Before restart</p>
            </div>
          </button>
          <button
            onClick={() => setActiveView('multi-pod')}
            className={`flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 ${
              activeView === 'multi-pod' ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <Layers className="h-5 w-5 text-purple-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Multi-pod Tail</p>
              <p className="text-xs text-muted-foreground">All deployment pods</p>
            </div>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}