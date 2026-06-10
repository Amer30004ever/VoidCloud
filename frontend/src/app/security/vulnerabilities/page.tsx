"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, Search, Filter, Download, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function VulnerabilitiesPage() {
  const [activeTab, setActiveTab] = useState<"scanner" | "results" | "history">("scanner");
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const tabs = [
    { id: "scanner" as const, label: "Scanner", icon: Shield },
    { id: "results" as const, label: "Results", icon: AlertTriangle },
    { id: "history" as const, label: "History", icon: RefreshCw },
  ];

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 3000);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Vulnerability Scanner"
        description="Scan your infrastructure for security vulnerabilities"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "scanner" && <ScannerTab isLoading={isLoading} isScanning={isScanning} onScan={handleScan} />}
      {activeTab === "results" && <ResultsTab isLoading={isLoading} />}
      {activeTab === "history" && <HistoryTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function ScannerTab({ isLoading, isScanning, onScan }: { isLoading: boolean; isScanning: boolean; onScan: () => void }) {
  const [scanScope, setScanScope] = useState<"cluster" | "images" | "code">("cluster");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Scan Configuration</h3>
        
        <div className="mb-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="scope"
              value="cluster"
              checked={scanScope === "cluster"}
              onChange={() => setScanScope("cluster")}
              className="h-4 w-4"
            />
            <span className="text-sm text-foreground">Cluster Resources</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="scope"
              value="images"
              checked={scanScope === "images"}
              onChange={() => setScanScope("images")}
              className="h-4 w-4"
            />
            <span className="text-sm text-foreground">Container Images</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="scope"
              value="code"
              checked={scanScope === "code"}
              onChange={() => setScanScope("code")}
              className="h-4 w-4"
            />
            <span className="text-sm text-foreground">Code Repository</span>
          </label>
        </div>

        <button
          onClick={onScan}
          disabled={isScanning}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          {isScanning ? "Scanning..." : "Start Scan"}
        </button>
      </div>

      {isScanning && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <h4 className="text-sm font-medium text-foreground">Scan in Progress</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Scanning cluster resources...</span>
              <span className="text-foreground">45%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-border">
              <div className="h-2 w-[45%] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vulnerabilities..."
            className="w-64 rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-red-500/50 bg-red-500/5 p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h4 className="text-sm font-medium text-foreground">CVE-2024-1234</h4>
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Critical</span>
                </div>
                <p className="text-xs text-muted-foreground">nginx:1.21.6 • Remote code execution vulnerability</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Affected pods: nginx-deployment-xxx, nginx-deployment-yyy</p>
          </div>

          <div className="rounded-xl border border-orange-500/50 bg-orange-500/5 p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <h4 className="text-sm font-medium text-foreground">CVE-2024-5678</h4>
                  <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">High</span>
                </div>
                <p className="text-xs text-muted-foreground">openssl:1.1.1k • Denial of service vulnerability</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Affected pods: redis-master-0, backend-api-xxx</p>
          </div>

          <div className="rounded-xl border border-yellow-500/50 bg-yellow-500/5 p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h4 className="text-sm font-medium text-foreground">CVE-2024-9012</h4>
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Medium</span>
                </div>
                <p className="text-xs text-muted-foreground">node:16.14.0 Prototype pollution</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Affected pods: frontend-xxx, frontend-yyy</p>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Scan History</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Cluster Scan</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Completed</span>
                </div>
                <p className="text-xs text-muted-foreground">2 hours ago • Found 3 vulnerabilities</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Image Scan</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Completed</span>
                </div>
                <p className="text-xs text-muted-foreground">1 day ago • Found 5 vulnerabilities</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Code Scan</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Completed</span>
                </div>
                <p className="text-xs text-muted-foreground">3 days ago • Found 2 vulnerabilities</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
