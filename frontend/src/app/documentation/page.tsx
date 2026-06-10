"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { FileText, Folder, Search, Plus, Clock, Tag, Users, Download, Share2, History, Loader2, Edit, Eye, Save, Upload, User } from "lucide-react";
import { useState } from "react";
import { exportToPdf } from "@/lib/export";
import { AddItemButton } from "@/components/ui/create-item-dialog";

export default function DocumentationPage() {
  const [activeTab, setActiveTab] = useState<"documents" | "editor" | "categories" | "tags" | "versions">("documents");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const tabs = [
    { id: "documents" as const, label: "Documents", icon: FileText },
    { id: "editor" as const, label: "Markdown Editor", icon: Edit },
    { id: "categories" as const, label: "Categories", icon: Folder },
    { id: "tags" as const, label: "Tags", icon: Tag },
    { id: "versions" as const, label: "Version History", icon: History },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Documentation"
        description="Manage your documentation, markdown files, and knowledge base"
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
      {activeTab === "documents" && <DocumentsTab isLoading={isLoading} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onEdit={() => { setActiveTab("editor"); setIsEditing(true); }} />}
      {activeTab === "editor" && <MarkdownEditorTab isLoading={isLoading} isEditing={isEditing} setIsEditing={setIsEditing} />}
      {activeTab === "categories" && <CategoriesTab isLoading={isLoading} />}
      {activeTab === "tags" && <TagsTab isLoading={isLoading} />}
      {activeTab === "versions" && <VersionsTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function DocumentsTab({ isLoading, searchQuery, setSearchQuery, onEdit }: { isLoading: boolean; searchQuery: string; setSearchQuery: (query: string) => void; onEdit?: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <AddItemButton
          label="New Document"
          title="Create Document"
          description="Add a new documentation page to your knowledge base."
          fields={[
            { name: "title", label: "Title", placeholder: "Getting Started Guide", required: true },
            { name: "category", label: "Category", placeholder: "Getting Started" },
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
                <h4 className="text-sm font-medium text-foreground">Getting Started Guide</h4>
                <p className="text-xs text-muted-foreground">Getting Started • Updated 2h ago</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Download className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Complete guide to getting started with the DevOps portal, including setup, configuration, and basic usage.</p>
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">setup</span>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">guide</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Kubernetes Deployment Best Practices</h4>
                <p className="text-xs text-muted-foreground">Kubernetes • Updated 1d ago</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Download className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Best practices for deploying applications to Kubernetes, including resource management, security, and monitoring.</p>
            <div className="flex gap-2">
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">kubernetes</span>
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">deployment</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">CI/CD Pipeline Configuration</h4>
                <p className="text-xs text-muted-foreground">CI/CD • Updated 3d ago</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Download className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Configuration guide for setting up CI/CD pipelines using GitHub Actions and other tools.</p>
            <div className="flex gap-2">
              <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">cicd</span>
              <span className="rounded-full bg-pink-500/10 px-2 py-1 text-xs text-pink-500">github-actions</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriesTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Document Categories</h3>
        <AddItemButton
          label="New Category"
          title="Create Category"
          fields={[{ name: "name", label: "Category Name", placeholder: "Architecture", required: true }]}
          onSubmit={() => Promise.resolve()}
        />
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Getting Started</h4>
            </div>
            <p className="text-xs text-muted-foreground">12 documents</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Kubernetes</h4>
            </div>
            <p className="text-xs text-muted-foreground">8 documents</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-medium text-foreground">CI/CD</h4>
            </div>
            <p className="text-xs text-muted-foreground">5 documents</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Security</h4>
            </div>
            <p className="text-xs text-muted-foreground">3 documents</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Monitoring</h4>
            </div>
            <p className="text-xs text-muted-foreground">7 documents</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Troubleshooting</h4>
            </div>
            <p className="text-xs text-muted-foreground">4 documents</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TagsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Document Tags</h3>
        <AddItemButton
          label="New Tag"
          title="Create Tag"
          fields={[{ name: "name", label: "Tag Name", placeholder: "kubernetes", required: true }]}
          onSubmit={() => Promise.resolve()}
        />
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500">setup (12)</span>
          <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-xs text-green-500">guide (8)</span>
          <span className="rounded-full bg-purple-500/10 px-3 py-1.5 text-xs text-purple-500">kubernetes (15)</span>
          <span className="rounded-full bg-orange-500/10 px-3 py-1.5 text-xs text-orange-500">deployment (7)</span>
          <span className="rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-500">cicd (9)</span>
          <span className="rounded-full bg-pink-500/10 px-3 py-1.5 text-xs text-pink-500">github-actions (5)</span>
          <span className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs text-red-500">security (6)</span>
          <span className="rounded-full bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-500">monitoring (4)</span>
          <span className="rounded-full bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-500">troubleshooting (3)</span>
          <span className="rounded-full bg-teal-500/10 px-3 py-1.5 text-xs text-teal-500">best-practices (10)</span>
        </div>
      )}
    </div>
  );
}

function VersionsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Document Version History</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Getting Started Guide</h4>
                <p className="text-xs text-muted-foreground">Version 3 • 2h ago</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <History className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Updated setup instructions and added new troubleshooting section</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Getting Started Guide</h4>
                <p className="text-xs text-muted-foreground">Version 2 • 1d ago</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <History className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Added configuration examples and improved formatting</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Getting Started Guide</h4>
                <p className="text-xs text-muted-foreground">Version 1 • 3d ago</p>
              </div>
              <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                <History className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Initial version with basic setup instructions</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MarkdownEditorTab({ isLoading, isEditing, setIsEditing }: { isLoading: boolean; isEditing: boolean; setIsEditing: (editing: boolean) => void }) {
  const [markdown, setMarkdown] = useState("# Getting Started\n\n## Introduction\n\nWelcome to the DevOps portal documentation.\n\n## Features\n\n- Dashboard\n- Cluster Management\n- GitHub Integration\n\n## Quick Start\n\n1. Login to the portal\n2. Navigate to Dashboard\n3. Start exploring");
  const [showPreview, setShowPreview] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulate file upload
    setTimeout(() => {
      setIsUploading(false);
    }, 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    exportToPdf("Documentation Export", [
      {
        heading: "Document Content",
        rows: [{ Content: markdown.replace(/\n/g, " ").slice(0, 5000) }],
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-foreground">Markdown Editor</h3>
          {/* Collaborative Users */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white border-2 border-background">A</div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white border-2 border-background">B</div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs text-white border-2 border-background">C</div>
            </div>
            <span className="text-xs text-muted-foreground">3 editing</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <Download className="h-4 w-4" />
            Download MD
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20">
            <Download className="h-4 w-4" />
            Export HTML
          </button>
          <label className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 cursor-pointer">
            <input
              type="file"
              accept=".md,.txt,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? "Uploading..." : "Upload File"}
          </label>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Markdown Editor */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Markdown Source</h4>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={20}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Write your markdown here..."
              spellCheck={false}
            />
          </div>
          
          {/* Live Preview */}
          {showPreview && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h4 className="mb-4 text-sm font-semibold text-foreground">Live Preview</h4>
              <div className="prose prose-sm max-w-none rounded-lg bg-background p-4 text-foreground">
                <h1>Getting Started</h1>
                <h2>Introduction</h2>
                <p>Welcome to the DevOps portal documentation.</p>
                <h2>Features</h2>
                <ul>
                  <li>Dashboard</li>
                  <li>Cluster Management</li>
                  <li>GitHub Integration</li>
                </ul>
                <h2>Quick Start</h2>
                <ol>
                  <li>Login to the portal</li>
                  <li>Navigate to Dashboard</li>
                  <li>Start exploring</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
