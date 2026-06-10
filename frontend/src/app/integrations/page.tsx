"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { MessageSquare, Mail, Webhook, Plus, CheckCircle, XCircle, Clock, Settings, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AddItemButton } from "@/components/ui/create-item-dialog";
import { integrationsApi } from "@/lib/integrations";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function IntegrationsPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs = ["slack", "email", "webhooks", "jira", "pagerduty"] as const;
  type IntegrationTab = (typeof validTabs)[number];
  const [localTab, setLocalTab] = useState<IntegrationTab>("slack");
  const activeTab: IntegrationTab =
    tabParam && validTabs.includes(tabParam as IntegrationTab) ? (tabParam as IntegrationTab) : localTab;
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "slack" as const, label: "Slack", icon: MessageSquare },
    { id: "email" as const, label: "Email", icon: Mail },
    { id: "webhooks" as const, label: "Webhooks", icon: Webhook },
    { id: "jira" as const, label: "Jira", icon: ExternalLink },
    { id: "pagerduty" as const, label: "PagerDuty", icon: AlertTriangle },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Integration Hub"
        description="Configure Slack, Email, and Webhook integrations"
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
      {activeTab === "slack" && <SlackTab isLoading={isLoading} />}
      {activeTab === "email" && <EmailTab isLoading={isLoading} />}
      {activeTab === "webhooks" && <WebhooksTab isLoading={isLoading} />}
      {activeTab === "jira" && <JiraTab isLoading={isLoading} />}
      {activeTab === "pagerduty" && <PagerDutyTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function SlackTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Slack Integration</h3>
        <AddItemButton
          label="Connect Slack"
          title="Connect Slack Workspace"
          fields={[
            { name: "workspace", label: "Workspace Name", placeholder: "amer-devops", required: true },
            { name: "webhook", label: "Webhook URL", placeholder: "https://hooks.slack.com/...", required: true },
          ]}
          onSubmit={async (values) => {
            await integrationsApi.updateSlackConfig({
              webhookUrl: values.webhook,
              channel: values.workspace,
              enabled: true,
            });
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Connect a Slack incoming webhook to receive deployment and alert notifications.
        </p>
      )}
    </div>
  );
}

function EmailTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Email Configuration</h3>
        <AddItemButton
          label="Add Email"
          title="Add Email Configuration"
          fields={[
            { name: "from", label: "From Address", placeholder: "noreply@company.com", required: true },
            { name: "smtp", label: "SMTP Server", placeholder: "smtp.gmail.com:587", required: true },
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
                  <Mail className="h-5 w-5 text-blue-500" />
                  <h4 className="text-sm font-medium text-foreground">SMTP Configuration</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">smtp.gmail.com:587 • TLS enabled</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Settings className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">From:</span>
                <span className="text-foreground">noreply@amer-portal.cc</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Recipients:</span>
                <span className="text-foreground">team@company.com</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Test Email:</span>
                <span className="text-foreground">Sent successfully</span>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">Deployments</span>
              <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Alerts</span>
              <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Reports</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-orange-500" />
                  <h4 className="text-sm font-medium text-foreground">SendGrid Integration</h4>
                  <span className="rounded-full bg-gray-500/10 px-2 py-1 text-xs text-gray-500">Not Configured</span>
                </div>
                <p className="text-xs text-muted-foreground">API-based email delivery service</p>
              </div>
              <button className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                Configure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WebhooksTab({ isLoading }: { isLoading: boolean }) {
  const queryClient = useQueryClient();
  const { data: webhooks = [], isLoading: loadingWebhooks } = useQuery({
    queryKey: ["integration-webhooks"],
    queryFn: integrationsApi.getWebhooks,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Webhook Configurations</h3>
        <AddItemButton
          label="Create Webhook"
          title="Create Webhook"
          fields={[
            { name: "name", label: "Webhook Name", placeholder: "deployment-notify", required: true },
            { name: "url", label: "Endpoint URL", type: "url", placeholder: "https://api.example.com/hook", required: true },
          ]}
          onSubmit={async (values) => {
            await integrationsApi.createWebhook({ name: values.name, url: values.url });
            await queryClient.invalidateQueries({ queryKey: ["integration-webhooks"] });
          }}
        />
      </div>

      {isLoading || loadingWebhooks ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No webhooks configured yet.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-2 flex items-center gap-2">
                <Webhook className="h-5 w-5 text-cyan-500" />
                <h4 className="text-sm font-medium text-foreground">{wh.name}</h4>
              </div>
              <p className="text-xs text-muted-foreground">{wh.url}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JiraTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Jira Integration</h3>
        <AddItemButton
          label="Connect Jira"
          title="Connect Jira Workspace"
          fields={[
            { name: "url", label: "Jira URL", type: "url", placeholder: "https://company.atlassian.net", required: true },
            { name: "project", label: "Project Key", placeholder: "DEVOPS", required: true },
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
                  <ExternalLink className="h-5 w-5 text-blue-500" />
                  <h4 className="text-sm font-medium text-foreground">Company Jira</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Connected</span>
                </div>
                <p className="text-xs text-muted-foreground">https://company.atlassian.net</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Settings className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Project:</span>
                <span className="text-foreground">DEVOPS</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Issue Sync:</span>
                <span className="text-foreground">Deployments, Incidents</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last Sync:</span>
                <span className="text-foreground">1 hour ago</span>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Issues</span>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Sprints</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-gray-400" />
                  <h4 className="text-sm font-medium text-foreground">Personal Jira</h4>
                  <span className="rounded-full bg-gray-500/10 px-2 py-1 text-xs text-gray-500">Not Connected</span>
                </div>
                <p className="text-xs text-muted-foreground">Personal workspace for side projects</p>
              </div>
              <button className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PagerDutyTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">PagerDuty Integration</h3>
        <AddItemButton
          label="Connect PagerDuty"
          title="Connect PagerDuty"
          fields={[
            { name: "service", label: "Service Name", placeholder: "Production API", required: true },
            { name: "key", label: "Integration Key", placeholder: "xxxxxxxx", required: true },
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
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <h4 className="text-sm font-medium text-foreground">Production Services</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">company.pagerduty.com</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Settings className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Service:</span>
                <span className="text-foreground">Kubernetes Cluster</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Escalation:</span>
                <span className="text-foreground">DevOps Team → SRE Team</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Alert Routing:</span>
                <span className="text-foreground">Critical, High</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last Incident:</span>
                <span className="text-foreground">3 days ago</span>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Critical</span>
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">High</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-gray-400" />
                  <h4 className="text-sm font-medium text-foreground">Staging Services</h4>
                  <span className="rounded-full bg-gray-500/10 px-2 py-1 text-xs text-gray-500">Not Configured</span>
                </div>
                <p className="text-xs text-muted-foreground">Staging environment alerts</p>
              </div>
              <button className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                Configure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IntegrationsPageContent />
    </Suspense>
  );
}
