"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { MessageSquare, Users, BookOpen, Send, Search, Pin, Archive, Loader2, GitPullRequest, CheckCircle, XCircle, AlertTriangle, Filter, Calendar, Edit } from "lucide-react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AddItemButton, IconAddButton } from "@/components/ui/create-item-dialog";
import { TeamChatPanel } from "@/components/collaboration/TeamChatPanel";
import { collaborationApi } from "@/lib/collaboration";

function CollaborationPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs = ["chat", "channels", "knowledge", "reviews", "calendar"] as const;
  type CollaborationTab = (typeof validTabs)[number];
  const [localTab, setLocalTab] = useState<CollaborationTab>("chat");
  const activeTab: CollaborationTab =
    tabParam && validTabs.includes(tabParam as CollaborationTab) ? (tabParam as CollaborationTab) : localTab;

  const [isLoading] = useState(false);

  const tabs = [
    { id: "chat" as const, label: "Team Chat", icon: MessageSquare },
    { id: "channels" as const, label: "Channels", icon: Users },
    { id: "knowledge" as const, label: "Knowledge Base", icon: BookOpen },
    { id: "reviews" as const, label: "Code Reviews", icon: GitPullRequest },
    { id: "calendar" as const, label: "Team Calendar", icon: Calendar },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Collaboration"
        description="Team chat, channels, and knowledge sharing"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setLocalTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
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
      {activeTab === "chat" && <TeamChatPanel />}
      {activeTab === "channels" && <ChannelsTab isLoading={isLoading} />}
      {activeTab === "knowledge" && <KnowledgeTab isLoading={isLoading} />}
      {activeTab === "reviews" && <ReviewsTab isLoading={isLoading} />}
      {activeTab === "calendar" && <CalendarTab isLoading={isLoading} />}
    </AppLayout>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ChatTab({ isLoading, message, setMessage }: { isLoading: boolean; message: string; setMessage: (msg: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Channels Sidebar */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Channels</h3>
            <IconAddButton
              title="Create Channel"
              fields={[{ name: "name", label: "Channel Name", placeholder: "deployments", required: true }]}
              onSubmit={() => Promise.resolve()}
            />
          </div>
          <div className="space-y-2">
            <button className="w-full rounded-lg bg-primary/10 px-3 py-2 text-left text-sm text-primary">
              # general
            </button>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent">
              # devops
            </button>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent">
              # deployments
            </button>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent">
              # alerts
            </button>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Direct Messages</h3>
            <div className="space-y-2">
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent">
                amer30004ever
              </button>
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent">
                developer1
              </button>
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent">
                developer2
              </button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-span-3 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground"># general</h3>
            <div className="flex gap-2">
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Pin className="h-4 w-4" />
              </button>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Archive className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                  A
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">amer30004ever</span>
                    <span className="text-xs text-muted-foreground">2:30 PM</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Hey team, just deployed the new version to production. Everything looks good!</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs font-medium">
                  D
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">developer1</span>
                    <span className="text-xs text-muted-foreground">2:32 PM</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Great! I&apos;ll check the monitoring dashboard to confirm.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 text-xs font-medium">
                  D
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">developer2</span>
                    <span className="text-xs text-muted-foreground">2:35 PM</span>
                  </div>
                  <p className="text-sm text-muted-foreground">The deployment is successful. All services are running normally.</p>
                </div>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="mt-6 flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Team Channels</h3>
        <AddItemButton
          label="Create Channel"
          title="Create Channel"
          fields={[{ name: "name", label: "Channel Name", placeholder: "deployments", required: true }]}
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
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-medium text-foreground"># general</span>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">General team discussions and announcements</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">5 members</p>
                <p className="text-xs text-muted-foreground">12 messages today</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-medium text-foreground"># devops</span>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">DevOps discussions, CI/CD, and infrastructure</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">3 members</p>
                <p className="text-xs text-muted-foreground">8 messages today</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-medium text-foreground"># deployments</span>
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Quiet</span>
                </div>
                <p className="text-xs text-muted-foreground">Deployment notifications and status updates</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">4 members</p>
                <p className="text-xs text-muted-foreground">2 messages today</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-medium text-foreground"># alerts</span>
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Critical</span>
                </div>
                <p className="text-xs text-muted-foreground">Alert notifications and incident responses</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">5 members</p>
                <p className="text-xs text-muted-foreground">15 messages today</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KnowledgeTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search knowledge base..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <AddItemButton
          label="New Article"
          title="New Knowledge Base Article"
          fields={[
            { name: "title", label: "Title", placeholder: "How to deploy to production", required: true },
            { name: "category", label: "Category", placeholder: "Runbooks" },
          ]}
          onSubmit={async (values) => {
            await collaborationApi.createKnowledgeArticle({
              title: values.title,
              content: values.title,
              category: values.category,
            });
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Create articles to share runbooks and team knowledge.</p>
      )}
    </div>
  );
}

function ReviewsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Code Review Queue</h3>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>
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
                  <GitPullRequest className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">feat: Add CV Studio UI</h4>
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Awaiting Review</span>
                </div>
                <p className="text-xs text-muted-foreground">feature/cv-studio • 23 files changed • 2 hours ago</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-green-500/10 p-2 text-green-500 hover:bg-green-500/20">
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">frontend</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">ui</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">fix: Resolve authentication bug</h4>
                  <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">Changes Requested</span>
                </div>
                <p className="text-xs text-muted-foreground">bugfix/auth • 5 files changed • 1 day ago</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-green-500/10 p-2 text-green-500 hover:bg-green-500/20">
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">bugfix</span>
              <span className="rounded-full bg-pink-500/10 px-2 py-1 text-xs text-pink-500">auth</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">docs: Update API documentation</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Approved</span>
                </div>
                <p className="text-xs text-muted-foreground">docs/api • 8 files changed • 3 days ago</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <GitPullRequest className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">documentation</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h4 className="text-sm font-medium text-foreground">refactor: Database migration</h4>
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Critical</span>
                </div>
                <p className="text-xs text-muted-foreground">refactor/db • 45 files changed • 5 hours ago</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-green-500/10 p-2 text-green-500 hover:bg-green-500/20">
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">database</span>
              <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">migration</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Team Calendar</h3>
        <AddItemButton
          label="Add Event"
          title="Add Calendar Event"
          fields={[
            { name: "title", label: "Event Title", placeholder: "Sprint Planning", required: true },
            { name: "date", label: "Date", placeholder: "2026-06-15" },
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
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Sprint Planning</h4>
                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Today</span>
                </div>
                <p className="text-xs text-muted-foreground">10:00 AM - 11:30 AM • All team members</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">Planning</span>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Sprint</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Code Review Session</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Tomorrow</span>
                </div>
                <p className="text-xs text-muted-foreground">2:00 PM - 3:00 PM • Dev team</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">Review</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Team Retrospective</h4>
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Friday</span>
                </div>
                <p className="text-xs text-muted-foreground">4:00 PM - 5:00 PM • All team members</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">Retrospective</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Product Demo</h4>
                  <span className="rounded-full bg-gray-500/10 px-2 py-1 text-xs text-gray-500">Next Week</span>
                </div>
                <p className="text-xs text-muted-foreground">Monday 11:00 AM - 12:00 PM • Stakeholders</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-pink-500/10 px-2 py-1 text-xs text-pink-500">Demo</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollaborationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollaborationPageContent />
    </Suspense>
  );
}
