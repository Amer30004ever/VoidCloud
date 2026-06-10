"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Loader2, Activity, Plus, AlertTriangle, CheckCircle2, Clock, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { alertsApi } from "@/lib/alerts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState<"alerts" | "rules">("alerts");
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['active-alerts'],
    queryFn: async () => {
      const response = await alertsApi.getActiveAlerts();
      return response.data;
    },
  });

  const { data: allAlerts, isLoading: allAlertsLoading } = useQuery({
    queryKey: ['all-alerts'],
    queryFn: async () => {
      const response = await alertsApi.getAllAlerts();
      return response.data;
    },
    enabled: activeTab === 'alerts',
  });

  const { data: alertRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const response = await alertsApi.getAlertRules();
      return response.data;
    },
    enabled: activeTab === 'rules',
  });

  const { data: alertStats } = useQuery({
    queryKey: ['alert-stats'],
    queryFn: async () => {
      const response = await alertsApi.getAlertStats();
      return response.data;
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      return alertsApi.acknowledgeAlert(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['all-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      return alertsApi.resolveAlert(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['all-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
    },
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAlerts(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'warning': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'info': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'acknowledged': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'resolved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const renderAlerts = () => {
    const alertsToRender = activeTab === 'alerts' ? (allAlerts || []) : [];
    
    if (allAlertsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!alertsToRender || alertsToRender.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="mt-2 text-sm text-muted-foreground">No alerts</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {alertsToRender.map((alert) => {
          const isExpanded = expandedAlerts.has(alert.id);
          return (
            <div key={alert.id} className={`rounded-xl border ${getSeverityColor(alert.severity)} bg-card`}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleExpand(alert.id)}
                    className="rounded-lg p-2 hover:bg-muted"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-foreground">{alert.ruleName}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(alert.status)}
                      <p className="text-sm font-medium text-foreground capitalize">{alert.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Fired</p>
                    <p className="text-sm text-foreground">{formatDate(alert.firedAt)}</p>
                  </div>
                  {alert.status === 'active' && (
                    <button
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                      className="rounded-lg p-2 hover:bg-muted"
                      title="Acknowledge"
                    >
                      <Clock className="h-4 w-4 text-amber-500" />
                    </button>
                  )}
                  {(alert.status === 'active' || alert.status === 'acknowledged') && (
                    <button
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={resolveMutation.isPending}
                      className="rounded-lg p-2 hover:bg-muted"
                      title="Resolve"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-border p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm text-foreground capitalize">{alert.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Severity</p>
                      <p className="text-sm text-foreground capitalize">{alert.severity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Acknowledged At</p>
                      <p className="text-sm text-foreground">{alert.acknowledgedAt ? formatDate(alert.acknowledgedAt) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Resolved At</p>
                      <p className="text-sm text-foreground">{alert.resolvedAt ? formatDate(alert.resolvedAt) : 'N/A'}</p>
                    </div>
                    {alert.remediationSteps && alert.remediationSteps.length > 0 && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Remediation Steps</p>
                        <ol className="mt-1 list-decimal list-inside space-y-1">
                          {alert.remediationSteps.map((step, idx) => (
                            <li key={idx} className="text-sm text-foreground">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderRules = () => {
    if (rulesLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!alertRules || alertRules.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No alert rules configured</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {alertRules.map((rule) => (
          <div key={rule.id} className={`rounded-xl border ${rule.enabled ? 'border-border' : 'border-muted bg-muted/50'} bg-card p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{rule.name}</p>
                <p className="text-xs text-muted-foreground">
                  {rule.type} • {rule.severity} • Threshold: {rule.threshold}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs ${rule.enabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Monitoring & Alerts"
        description="Track system health, manage alert rules, and view remediation steps"
        action={
          <button
            onClick={() => setShowCreateRuleModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Alert Rule
          </button>
        }
      />

      {/* Stats */}
      {alertStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{alertStats.total}</p>
              </div>
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="mt-2 text-3xl font-bold text-destructive">{alertStats.active}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acknowledged</p>
                <p className="mt-2 text-3xl font-bold text-amber-500">{alertStats.acknowledged}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="mt-2 text-3xl font-bold text-green-500">{alertStats.resolved}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'alerts'
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Alerts
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'rules'
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          Alert Rules
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'alerts' && renderAlerts()}
        {activeTab === 'rules' && renderRules()}
      </div>

      {/* Create Rule Modal */}
      {showCreateRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Create Alert Rule</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  id="rule-name"
                  placeholder="High CPU Usage"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Type</label>
                <select
                  id="rule-type"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="pod_crash">Pod Crash</option>
                  <option value="high_cpu">High CPU</option>
                  <option value="high_memory">High Memory</option>
                  <option value="deployment_failure">Deployment Failure</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Severity</label>
                <select
                  id="rule-severity"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Threshold</label>
                <input
                  type="number"
                  id="rule-threshold"
                  placeholder="80"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Duration (seconds)</label>
                <input
                  type="number"
                  id="rule-duration"
                  placeholder="300"
                  defaultValue="300"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateRuleModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const name = (document.getElementById('rule-name') as HTMLInputElement).value;
                  const type = (document.getElementById('rule-type') as HTMLSelectElement).value;
                  const severity = (document.getElementById('rule-severity') as HTMLSelectElement).value;
                  const threshold = parseFloat((document.getElementById('rule-threshold') as HTMLInputElement).value);
                  const duration = parseInt((document.getElementById('rule-duration') as HTMLInputElement).value);

                  await alertsApi.createAlertRule({ name, type, severity, threshold, duration });
                  queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
                  setShowCreateRuleModal(false);
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}