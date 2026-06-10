"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { GitBranch, GitPullRequest, GitCommit, Activity, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { AddItemButton } from "@/components/ui/create-item-dialog";

const CONTRIBUTION_OPACITIES = Array.from({ length: 52 }, (_, index) => 0.2 + ((index * 37) % 80) / 100);

export default function GitHubPage() {
  const [activeTab, setActiveTab] = useState<"repos" | "prs" | "commits" | "workflows" | "analytics" | "branches" | "webhooks">("repos");
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "repos" as const, label: "Repositories", icon: GitBranch },
    { id: "prs" as const, label: "Pull Requests", icon: GitPullRequest },
    { id: "commits" as const, label: "Commits", icon: GitCommit },
    { id: "workflows" as const, label: "Workflows", icon: Activity },
    { id: "analytics" as const, label: "Analytics", icon: Activity },
    { id: "branches" as const, label: "Branches", icon: GitBranch },
    { id: "webhooks" as const, label: "Webhooks", icon: Activity },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="GitHub Integration"
        description="Manage your GitHub repositories, pull requests, and workflows"
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
      {activeTab === "repos" && <ReposTab isLoading={isLoading} />}
      {activeTab === "prs" && <PRsTab isLoading={isLoading} />}
      {activeTab === "commits" && <CommitsTab isLoading={isLoading} />}
      {activeTab === "workflows" && <WorkflowsTab isLoading={isLoading} />}
      {activeTab === "analytics" && <AnalyticsTab isLoading={isLoading} />}
      {activeTab === "branches" && <BranchesTab isLoading={isLoading} />}
      {activeTab === "webhooks" && <WebhooksTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function ReposTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Your Repositories</h3>
        <AddItemButton
          label="Add Repository"
          title="Add Repository"
          fields={[
            { name: "owner", label: "Owner", placeholder: "Amer30004ever", required: true },
            { name: "repo", label: "Repository", placeholder: "amer-portal", required: true },
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
              <div>
                <h4 className="text-sm font-medium text-foreground">amer-portal</h4>
                <p className="text-xs text-muted-foreground">Amer30004ever/amer-portal</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">DevOps portal for managing Kubernetes clusters, CI/CD pipelines, and infrastructure</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                main
              </span>
              <span className="flex items-center gap-1">
                <GitPullRequest className="h-3 w-3" />
                3 PRs
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Updated 2h ago
              </span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">microservices-app</h4>
                <p className="text-xs text-muted-foreground">Amer30004ever/microservices-app</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Microservices architecture demo with Kubernetes deployment</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                develop
              </span>
              <span className="flex items-center gap-1">
                <GitPullRequest className="h-3 w-3" />
                1 PR
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Updated 1d ago
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PRsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Pull Requests</h3>
      
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
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Open</span>
                  <h4 className="text-sm font-medium text-foreground">feat: Add cluster management UI</h4>
                </div>
                <p className="text-xs text-muted-foreground">#42 • amer-portal</p>
                <p className="mt-2 text-xs text-muted-foreground">Implement new cluster management interface with tabs for nodes, pods, quotas, and network policies</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">2h ago</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-green-500">
                  <CheckCircle className="h-3 w-3" />
                  2 checks passed
                </div>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Review</span>
                  <h4 className="text-sm font-medium text-foreground">fix: Resolve deployment pipeline issues</h4>
                </div>
                <p className="text-xs text-muted-foreground">#41 • microservices-app</p>
                <p className="mt-2 text-xs text-muted-foreground">Fix timeout issues in the deployment pipeline and add better error handling</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">1d ago</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-yellow-500">
                  <AlertTriangle className="h-3 w-3" />
                  1 review required
                </div>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">Merged</span>
                  <h4 className="text-sm font-medium text-foreground">chore: Update dependencies</h4>
                </div>
                <p className="text-xs text-muted-foreground">#40 • amer-portal</p>
                <p className="mt-2 text-xs text-muted-foreground">Update all dependencies to latest stable versions</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">3d ago</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-green-500">
                  <CheckCircle className="h-3 w-3" />
                  Merged
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommitsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Recent Commits</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <GitCommit className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">feat: Add cluster management UI</h4>
                <p className="text-xs text-muted-foreground">amer30004ever • 2h ago</p>
                <p className="mt-2 text-xs text-muted-foreground">abc123def</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">main</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <GitCommit className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">fix: Resolve deployment pipeline issues</h4>
                <p className="text-xs text-muted-foreground">amer30004ever • 1d ago</p>
                <p className="mt-2 text-xs text-muted-foreground">def456ghi</p>
              </div>
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">develop</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <GitCommit className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">chore: Update dependencies</h4>
                <p className="text-xs text-muted-foreground">amer30004ever • 3d ago</p>
                <p className="mt-2 text-xs text-muted-foreground">ghi789jkl</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">main</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">GitHub Actions Workflows</h3>
      
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
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Success</span>
                  <h4 className="text-sm font-medium text-foreground">CI/CD Pipeline</h4>
                </div>
                <p className="text-xs text-muted-foreground">amer-portal • #1234</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">2h ago</p>
                <p className="text-xs text-green-500">5m 32s</p>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded bg-green-500/10 px-2 py-1 text-green-500">build</span>
              <span className="rounded bg-green-500/10 px-2 py-1 text-green-500">test</span>
              <span className="rounded bg-green-500/10 px-2 py-1 text-green-500">deploy</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Failed</span>
                  <h4 className="text-sm font-medium text-foreground">Docker Build</h4>
                </div>
                <p className="text-xs text-muted-foreground">microservices-app • #5678</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">1d ago</p>
                <p className="text-xs text-red-500">2m 15s</p>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded bg-green-500/10 px-2 py-1 text-green-500">build</span>
              <span className="rounded bg-red-500/10 px-2 py-1 text-red-500">docker</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Running</span>
                  <h4 className="text-sm font-medium text-foreground">Security Scan</h4>
                </div>
                <p className="text-xs text-muted-foreground">amer-portal • #9012</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Running...</p>
                <p className="text-xs text-yellow-500">3m 45s</p>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded bg-green-500/10 px-2 py-1 text-green-500">scan</span>
              <span className="rounded bg-yellow-500/10 px-2 py-1 text-yellow-500">analyze</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Repository Analytics</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <GitBranch className="h-4 w-4" />
              <span className="text-xs">Total Repos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">12</p>
            <p className="text-xs text-muted-foreground">Active repositories</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <GitPullRequest className="h-4 w-4" />
              <span className="text-xs">Open PRs</span>
            </div>
            <p className="text-2xl font-bold text-foreground">8</p>
            <p className="text-xs text-muted-foreground">Pull requests</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <GitCommit className="h-4 w-4" />
              <span className="text-xs">Commits (30d)</span>
            </div>
            <p className="text-2xl font-bold text-foreground">156</p>
            <p className="text-xs text-muted-foreground">Total commits</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Workflow Runs</span>
            </div>
            <p className="text-2xl font-bold text-foreground">89</p>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          
          <div className="col-span-2 rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Contribution Activity</h4>
            <div className="flex gap-1">
              {CONTRIBUTION_OPACITIES.map((opacity, i) => (
                <div
                  key={i}
                  className="h-8 w-2 rounded-sm bg-green-500"
                  style={{
                    opacity,
                  }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Last 52 weeks</p>
          </div>
          
          <div className="col-span-2 rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Top Contributors</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">amer30004ever</span>
                <span className="text-xs text-muted-foreground">89 commits</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">contributor2</span>
                <span className="text-xs text-muted-foreground">34 commits</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">contributor3</span>
                <span className="text-xs text-muted-foreground">21 commits</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchesTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Branch Management</h3>
        <AddItemButton
          label="New Branch"
          title="Create Branch"
          fields={[
            { name: "name", label: "Branch Name", placeholder: "feature/new-ui", required: true },
            { name: "base", label: "Base Branch", placeholder: "main" },
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
          {/* Main branch */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">main</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Default</span>
                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Protected</span>
                </div>
                <p className="text-xs text-muted-foreground">Last commit: 2 hours ago • 156 commits</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <GitPullRequest className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-4 w-0.5 bg-border" />
                <span>feat: add new dashboard features</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-4 w-0.5 bg-border" />
                <span>fix: resolve authentication issue</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-4 w-0.5 bg-border" />
                <span>docs: update README</span>
              </div>
            </div>
          </div>
          
          {/* Feature branch */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-purple-500" />
                  <h4 className="text-sm font-medium text-foreground">feature/cv-studio</h4>
                  <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">Feature</span>
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">1 PR Open</span>
                </div>
                <p className="text-xs text-muted-foreground">Last commit: 30 minutes ago • 23 commits</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <GitPullRequest className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-4 w-0.5 bg-border" />
                <span>add: CV builder UI</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-4 w-0.5 bg-border" />
                <span>add: LaTeX editor</span>
              </div>
            </div>
          </div>
          
          {/* Development branch */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-orange-500" />
                  <h4 className="text-sm font-medium text-foreground">develop</h4>
                  <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">Development</span>
                </div>
                <p className="text-xs text-muted-foreground">Last commit: 1 day ago • 89 commits</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <GitPullRequest className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WebhooksTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Webhook Management</h3>
        <AddItemButton
          label="Add Webhook"
          title="Add GitHub Webhook"
          fields={[
            { name: "url", label: "Payload URL", type: "url", placeholder: "https://api.amer-portal.cc.cd/webhooks/github", required: true },
            { name: "events", label: "Events", placeholder: "push, pull_request" },
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
                  <Activity className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Deployment Webhook</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">https://api.example.com/deploy</p>
                <p className="text-xs text-muted-foreground">Triggers: push, pull_request</p>
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
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">push</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">pull_request</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">CI/CD Pipeline</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">https://ci.example.com/webhook</p>
                <p className="text-xs text-muted-foreground">Triggers: push, release</p>
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
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">push</span>
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">release</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-400" />
                  <h4 className="text-sm font-medium text-foreground">Slack Notification</h4>
                  <span className="rounded-full bg-gray-500/10 px-2 py-1 text-xs text-gray-500">Paused</span>
                </div>
                <p className="text-xs text-muted-foreground">https://hooks.slack.com/services/xxx</p>
                <p className="text-xs text-muted-foreground">Triggers: issues, pull_request</p>
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
            <div className="flex gap-2">
              <span className="rounded-full bg-pink-500/10 px-2 py-1 text-xs text-pink-500">issues</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">pull_request</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
