"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Shield, CheckCircle, XCircle, AlertTriangle, Clock, FileText, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useState } from "react";

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "policies" | "audits" | "reports">("overview");
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Shield },
    { id: "policies" as const, label: "Policies", icon: FileText },
    { id: "audits" as const, label: "Audits", icon: Clock },
    { id: "reports" as const, label: "Reports", icon: TrendingUp },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Compliance Dashboard"
        description="Monitor and manage security compliance across your infrastructure"
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
      {activeTab === "overview" && <OverviewTab isLoading={isLoading} />}
      {activeTab === "policies" && <PoliciesTab isLoading={isLoading} />}
      {activeTab === "audits" && <AuditsTab isLoading={isLoading} />}
      {activeTab === "reports" && <ReportsTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function OverviewTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      {/* Compliance Score */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Overall Score</span>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">87%</p>
          <p className="text-xs text-muted-foreground">+5% from last month</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Active Policies</span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">24</p>
          <p className="text-xs text-muted-foreground">All compliant</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Open Issues</span>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">7</p>
          <p className="text-xs text-muted-foreground">3 critical</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Last Audit</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">2d</p>
          <p className="text-xs text-muted-foreground">Ago</p>
        </div>
      </div>

      {/* Compliance Frameworks */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Compliance Frameworks</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/10 p-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">SOC 2 Type II</p>
                  <p className="text-xs text-muted-foreground">Security, Availability, Processing Integrity</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">95%</p>
                <p className="text-xs text-green-500">Compliant</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/10 p-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">ISO 27001</p>
                  <p className="text-xs text-muted-foreground">Information Security Management</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">92%</p>
                <p className="text-xs text-green-500">Compliant</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-yellow-500/10 p-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">GDPR</p>
                  <p className="text-xs text-muted-foreground">Data Protection Regulation</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">78%</p>
                <p className="text-xs text-yellow-500">Needs Attention</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/10 p-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">HIPAA</p>
                  <p className="text-xs text-muted-foreground">Health Insurance Portability</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">88%</p>
                <p className="text-xs text-green-500">Compliant</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PoliciesTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Security Policies</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Password Policy</h4>
                <p className="text-xs text-muted-foreground">Minimum 12 characters, 2FA required</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Authentication</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Data Retention Policy</h4>
                <p className="text-xs text-muted-foreground">7 years for audit logs, 90 days for metrics</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">Data</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Access Control Policy</h4>
                <p className="text-xs text-muted-foreground">Role-based access with quarterly reviews</p>
              </div>
              <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Review Due</span>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">Access</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Audit History</h3>
      
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
                  <h4 className="text-sm font-medium text-foreground">SOC 2 Type II Audit</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Passed</span>
                </div>
                <p className="text-xs text-muted-foreground">Completed 2 days ago • 5 findings resolved</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <FileText className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="text-sm font-medium text-foreground">Internal Security Audit</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Passed</span>
                </div>
                <p className="text-xs text-muted-foreground">Completed 1 week ago • 12 findings resolved</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <FileText className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="text-sm font-medium text-foreground">Penetration Test</h4>
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">In Progress</span>
                </div>
                <p className="text-xs text-muted-foreground">Started 3 days ago • Scheduled completion in 5 days</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <FileText className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Compliance Reports</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Monthly Compliance Report</h4>
                <p className="text-xs text-muted-foreground">May 2026 • Generated 2 days ago</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <FileText className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">PDF</span>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">CSV</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Quarterly Executive Summary</h4>
                <p className="text-xs text-muted-foreground">Q1 2026 • Generated 1 month ago</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <FileText className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">PDF</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Annual Compliance Report</h4>
                <p className="text-xs text-muted-foreground">2025 • Generated 5 months ago</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <FileText className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">PDF</span>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">CSV</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
