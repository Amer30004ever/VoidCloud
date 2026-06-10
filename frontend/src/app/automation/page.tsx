"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Code2, Workflow, Plus, Play, Edit, Trash2, Copy, Loader2, FileText, Clock, CheckCircle } from "lucide-react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AddItemButton } from "@/components/ui/create-item-dialog";

function AutomationPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs = ["scripts", "workflows"] as const;
  type AutomationTab = (typeof validTabs)[number];
  const [localTab, setLocalTab] = useState<AutomationTab>("scripts");
  const activeTab: AutomationTab =
    tabParam && validTabs.includes(tabParam as AutomationTab) ? (tabParam as AutomationTab) : localTab;
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "scripts" as const, label: "Script Library", icon: Code2 },
    { id: "workflows" as const, label: "Workflow Templates", icon: Workflow },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Automation"
        description="Manage scripts and workflow templates for DevOps automation"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setLocalTab(tab.id)}
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
      {activeTab === "scripts" && <ScriptsTab isLoading={isLoading} />}
      {activeTab === "workflows" && <WorkflowsTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function ScriptsTab({ isLoading }: { isLoading: boolean }) {
  const [isRunning, setIsRunning] = useState<number | null>(null);

  const handleRun = (scriptId: number) => {
    setIsRunning(scriptId);
    setTimeout(() => setIsRunning(null), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Script Library</h3>
        <AddItemButton
          label="Add Script"
          title="Add Automation Script"
          fields={[
            { name: "name", label: "Script Name", placeholder: "Deploy Kubernetes Application", required: true },
            { name: "language", label: "Language", placeholder: "Bash" },
          ]}
          onSubmit={() => Promise.resolve()}
        />
      </div>
      
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
                  <Code2 className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Deploy Kubernetes Application</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Bash</span>
                </div>
                <p className="text-xs text-muted-foreground">Automated deployment script for Kubernetes applications</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRun(1)}
                  disabled={isRunning === 1}
                  className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {isRunning === 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-green-500 transition-all" style={{ width: "100%" }} />
            </div>
            <p className="text-xs text-muted-foreground">Last run: 2 hours ago • Success</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Database Backup</h4>
                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Python</span>
                </div>
                <p className="text-xs text-muted-foreground">Automated database backup with compression and encryption</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRun(2)}
                  disabled={isRunning === 2}
                  className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {isRunning === 2 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-green-500 transition-all" style={{ width: "100%" }} />
            </div>
            <p className="text-xs text-muted-foreground">Last run: 1 day ago • Success</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">SSL Certificate Renewal</h4>
                  <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">Bash</span>
                </div>
                <p className="text-xs text-muted-foreground">Automated SSL certificate renewal with Let&apos;s Encrypt</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRun(3)}
                  disabled={isRunning === 3}
                  className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {isRunning === 3 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Copy className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-yellow-500 transition-all" style={{ width: "75%" }} />
            </div>
            <p className="text-xs text-muted-foreground">Last run: 3 days ago • Partial Success</p>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowsTab({ isLoading }: { isLoading: boolean }) {
  const [isRunning, setIsRunning] = useState<number | null>(null);

  const handleRun = (workflowId: number) => {
    setIsRunning(workflowId);
    setTimeout(() => setIsRunning(null), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Workflow Templates</h3>
        <AddItemButton
          label="Create Workflow"
          title="Create Workflow"
          fields={[
            { name: "name", label: "Workflow Name", placeholder: "CI/CD Pipeline", required: true },
            { name: "trigger", label: "Trigger", placeholder: "push to main" },
          ]}
          onSubmit={() => Promise.resolve()}
        />
      </div>
      
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
                  <Workflow className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">CI/CD Pipeline</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Complete CI/CD workflow with build, test, and deploy stages</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRun(1)}
                  disabled={isRunning === 1}
                  className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {isRunning === 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Build</span>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Test</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">Deploy</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~15 min
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                95% success rate
              </span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Infrastructure Provisioning</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Terraform-based infrastructure provisioning workflow</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRun(2)}
                  disabled={isRunning === 2}
                  className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {isRunning === 2 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">Plan</span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">Apply</span>
              <span className="rounded-full bg-pink-500/10 px-2 py-1 text-xs text-pink-500">Verify</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~30 min
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                90% success rate
              </span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Monitoring Setup</h4>
                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Draft</span>
                </div>
                <p className="text-xs text-muted-foreground">Automated monitoring and alerting setup workflow</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRun(3)}
                  disabled={isRunning === 3}
                  className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {isRunning === 3 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Install</span>
              <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Configure</span>
              <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Test</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~20 min
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Not yet tested
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AutomationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AutomationPageContent />
    </Suspense>
  );
}
