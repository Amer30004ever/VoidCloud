"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { FileText, Code, Sparkles, Target, Download, Upload, GitBranch, CheckCircle, AlertTriangle, Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { exportToPdf, exportTextFile } from "@/lib/export";
import { AddItemButton, IconAddButton } from "@/components/ui/create-item-dialog";

export default function CVStudioPage() {
  const [activeTab, setActiveTab] = useState<"builder" | "latex" | "ats" | "templates" | "github" | "jobs">("builder");
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "builder" as const, label: "CV Builder", icon: FileText },
    { id: "latex" as const, label: "LaTeX Editor", icon: Code },
    { id: "ats" as const, label: "ATS Optimizer", icon: Sparkles },
    { id: "jobs" as const, label: "Job Matching", icon: Target },
    { id: "templates" as const, label: "Templates", icon: FileText },
    { id: "github" as const, label: "GitHub Import", icon: GitBranch },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="CV Studio"
        description="AI-powered CV builder with ATS optimization and LaTeX support"
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
      {activeTab === "builder" && <CVBuilderTab isLoading={isLoading} />}
      {activeTab === "latex" && <LaTeXEditorTab isLoading={isLoading} />}
      {activeTab === "ats" && <ATSOptimizerTab isLoading={isLoading} />}
      {activeTab === "jobs" && <JobMatchingTab isLoading={isLoading} />}
      {activeTab === "templates" && <TemplatesTab isLoading={isLoading} />}
      {activeTab === "github" && <GitHubImportTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function CVBuilderTab({ isLoading }: { isLoading: boolean }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    experience: "",
    skills: "",
    education: "",
    certifications: "",
    projects: "",
  });
  const importInputRef = useRef<HTMLInputElement>(null);

  const buildMarkdown = () => {
    const sections = [
      `# ${formData.fullName || "Untitled CV"}`,
      formData.email || formData.phone || formData.location
        ? `**${[formData.email, formData.phone, formData.location].filter(Boolean).join(" | ")}**`
        : "",
      formData.summary ? `\n## Summary\n${formData.summary}` : "",
      formData.experience ? `\n## Experience\n${formData.experience}` : "",
      formData.skills ? `\n## Skills\n${formData.skills}` : "",
      formData.education ? `\n## Education\n${formData.education}` : "",
      formData.certifications ? `\n## Certifications\n${formData.certifications}` : "",
      formData.projects ? `\n## Projects\n${formData.projects}` : "",
    ];
    return sections.filter(Boolean).join("\n");
  };

  const buildHtml = () => {
    const md = buildMarkdown();
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${formData.fullName || "CV"}</title></head><body><pre>${md.replace(/</g, "&lt;")}</pre></body></html>`;
  };

  const handleExportPdf = () => {
    exportToPdf(formData.fullName || "CV Export", [
      {
        heading: "Personal Information",
        rows: [{
          Name: formData.fullName,
          Email: formData.email,
          Phone: formData.phone,
          Location: formData.location,
        }],
      },
      {
        heading: "Professional Details",
        rows: [{
          Summary: formData.summary,
          Experience: formData.experience,
          Skills: formData.skills,
          Education: formData.education,
          Certifications: formData.certifications,
          Projects: formData.projects,
        }],
      },
    ]);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setFormData((current) => ({ ...current, summary: text.slice(0, 2000) }));
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">CV Builder</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => exportTextFile(`${formData.fullName || "cv"}.md`, buildMarkdown(), "text/markdown;charset=utf-8;")}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <Download className="h-4 w-4" />
            Export MD
          </button>
          <button
            type="button"
            onClick={() => exportTextFile(`${formData.fullName || "cv"}.html`, buildHtml(), "text/html;charset=utf-8;")}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <Download className="h-4 w-4" />
            Export HTML
          </button>
          <button
            type="button"
            onClick={() => exportTextFile(`${formData.fullName || "cv"}.txt`, buildMarkdown())}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <Download className="h-4 w-4" />
            Export DOCX
          </button>
          <input ref={importInputRef} type="file" accept=".md,.txt,.html" className="hidden" onChange={handleImport} />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6">
              <h4 className="mb-4 text-sm font-semibold text-foreground">Personal Information</h4>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6">
              <h4 className="mb-4 text-sm font-semibold text-foreground">Professional Summary</h4>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Brief professional summary..."
              />
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6">
              <h4 className="mb-4 text-sm font-semibold text-foreground">Experience</h4>
              <textarea
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                rows={6}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Work experience details..."
              />
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6">
              <h4 className="mb-4 text-sm font-semibold text-foreground">Skills</h4>
              <textarea
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Kubernetes, Docker, AWS, CI/CD..."
              />
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6">
              <h4 className="mb-4 text-sm font-semibold text-foreground">Education</h4>
              <textarea
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Education details..."
              />
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6">
              <h4 className="mb-4 text-sm font-semibold text-foreground">Certifications</h4>
              <textarea
                value={formData.certifications}
                onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="CKA, CKAD, AWS Solutions Architect..."
              />
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6">
              <h4 className="mb-4 text-sm font-semibold text-foreground">Projects</h4>
              <textarea
                value={formData.projects}
                onChange={(e) => setFormData({ ...formData, projects: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Notable projects..."
              />
            </div>
          </div>
          
          {/* Live Preview */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Live Preview</h4>
            <div className="rounded-lg bg-background p-6 text-sm">
              {formData.fullName && <h2 className="text-lg font-bold text-foreground">{formData.fullName}</h2>}
              <div className="mb-4 text-xs text-muted-foreground">
                {formData.email && <span>{formData.email}</span>}
                {formData.phone && <span> • {formData.phone}</span>}
                {formData.location && <span> • {formData.location}</span>}
              </div>
              {formData.summary && (
                <div className="mb-4">
                  <h3 className="mb-1 font-semibold text-foreground">Summary</h3>
                  <p className="text-muted-foreground">{formData.summary}</p>
                </div>
              )}
              {formData.experience && (
                <div className="mb-4">
                  <h3 className="mb-1 font-semibold text-foreground">Experience</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{formData.experience}</p>
                </div>
              )}
              {formData.skills && (
                <div className="mb-4">
                  <h3 className="mb-1 font-semibold text-foreground">Skills</h3>
                  <p className="text-muted-foreground">{formData.skills}</p>
                </div>
              )}
              {formData.education && (
                <div className="mb-4">
                  <h3 className="mb-1 font-semibold text-foreground">Education</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{formData.education}</p>
                </div>
              )}
              {formData.certifications && (
                <div className="mb-4">
                  <h3 className="mb-1 font-semibold text-foreground">Certifications</h3>
                  <p className="text-muted-foreground">{formData.certifications}</p>
                </div>
              )}
              {formData.projects && (
                <div>
                  <h3 className="mb-1 font-semibold text-foreground">Projects</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{formData.projects}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LaTeXEditorTab({ isLoading }: { isLoading: boolean }) {
  const [latexCode, setLatexCode] = useState(`\\documentclass{article}
\\begin{document}

\\section{Experience}

\\end{document}`);
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  const handleCompile = async () => {
    setIsCompiling(true);
    // Simulate compilation
    setTimeout(() => {
      setIsCompiling(false);
      setPdfGenerated(true);
    }, 2000);
  };

  const handleDownloadPDF = () => {
    // Simulate PDF download
    const blob = new Blob([latexCode], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cv.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">LaTeX Editor</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCompile}
            disabled={isCompiling}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isCompiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Code className="h-4 w-4" />}
            {isCompiling ? "Compiling..." : "Compile PDF"}
          </button>
          {pdfGenerated && (
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* LaTeX Editor */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">LaTeX Source</h4>
            <textarea
              value={latexCode}
              onChange={(e) => setLatexCode(e.target.value)}
              rows={20}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              spellCheck={false}
            />
          </div>
          
          {/* PDF Preview */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">PDF Preview</h4>
            <div className="flex h-[500px] items-center justify-center rounded-lg bg-background text-muted-foreground">
              {isCompiling ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Compiling...</span>
                </div>
              ) : pdfGenerated ? (
                <div className="h-full w-full rounded-lg border border-border bg-white p-8">
                  <div className="text-sm text-black">
                    <h1 className="text-lg font-bold mb-4">Experience</h1>
                    <p className="text-xs text-gray-600">Your CV content will appear here after compilation.</p>
                    <div className="mt-4 p-4 bg-gray-100 rounded">
                      <p className="text-xs text-gray-500">PDF Preview Generated</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Code className="mx-auto mb-2 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm">Click &quot;Compile PDF&quot; to generate preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ATSOptimizerTab({ isLoading }: { isLoading: boolean }) {
  const [jobDescription, setJobDescription] = useState("");
  const [cvContent, setCvContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setAtsScore(78);
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">ATS Optimizer</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Job Description</h4>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Paste job description here..."
            />
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Your CV Content</h4>
            <textarea
              value={cvContent}
              onChange={(e) => setCvContent(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Paste your CV content here..."
            />
          </div>
          
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isAnalyzing ? "Analyzing..." : "Analyze & Optimize"}
          </button>
          
          {atsScore !== null && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">ATS Score</span>
                  {atsScore >= 80 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-3xl font-bold text-foreground">{atsScore}%</p>
              </div>
              
              <div className="rounded-xl border border-border bg-card p-6">
                <h4 className="mb-2 text-sm font-semibold text-foreground">Missing Keywords</h4>
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Kubernetes</span>
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">Terraform</span>
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-500">CI/CD</span>
                </div>
              </div>
              
              <div className="rounded-xl border border-border bg-card p-6">
                <h4 className="mb-2 text-sm font-semibold text-foreground">Suggestions</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Add quantified achievements</li>
                  <li>• Include more action verbs</li>
                  <li>• Match job description keywords</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplatesTab({ isLoading }: { isLoading: boolean }) {
  const templates = [
    { id: 1, name: "Modern DevOps", category: "DevOps", color: "blue" },
    { id: 2, name: "Minimal Kubernetes", category: "Kubernetes", color: "green" },
    { id: 3, name: "Cloud Engineer", category: "Cloud", color: "purple" },
    { id: 4, name: "SRE Style", category: "SRE", color: "orange" },
    { id: 5, name: "FAANG Style", category: "Enterprise", color: "red" },
    { id: 6, name: "Academic", category: "Academic", color: "gray" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">CV Templates</h3>
        <AddItemButton
          label="Create Template"
          title="Create CV Template"
          fields={[{ name: "name", label: "Template Name", placeholder: "Modern DevOps", required: true }]}
          onSubmit={() => Promise.resolve()}
        />
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 cursor-pointer transition-all">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
                  <p className="text-xs text-muted-foreground">{template.category}</p>
                </div>
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <div className="h-32 rounded-lg bg-background/50 border border-border" />
              <button className="mt-3 w-full rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20">
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GitHubImportTab({ isLoading }: { isLoading: boolean }) {
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    // Simulate import
    setTimeout(() => setIsImporting(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">GitHub Project Import</h3>
        <button
          onClick={handleImport}
          disabled={isImporting}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
          {isImporting ? "Importing..." : "Import Projects"}
        </button>
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
                  <GitBranch className="h-5 w-5 text-foreground" />
                  <h4 className="text-sm font-medium text-foreground">amer-portal</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Imported</span>
                </div>
                <p className="text-xs text-muted-foreground">DevOps portal for managing Kubernetes clusters</p>
              </div>
              <button className="rounded-lg bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">TypeScript</span>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Next.js</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">NestJS</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-gray-400" />
                  <h4 className="text-sm font-medium text-foreground">microservices-app</h4>
                  <span className="rounded-full bg-gray-500/10 px-2 py-1 text-xs text-gray-500">Not Imported</span>
                </div>
                <p className="text-xs text-muted-foreground">Microservices architecture demo</p>
              </div>
              <IconAddButton
                title="Import from GitHub"
                fields={[
                  { name: "repo", label: "Repository", placeholder: "Amer30004ever/microservices-app", required: true },
                ]}
                onSubmit={() => Promise.resolve()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobMatchingTab({ isLoading }: { isLoading: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const [matchedJobs, setMatchedJobs] = useState<
    Array<{ id: number; title: string; company: string; match: number; location: string }>
  >([]);

  const handleSearch = async () => {
    setMatchedJobs([
      { id: 1, title: "Senior DevOps Engineer", company: "Tech Corp", match: 95, location: "Remote" },
      { id: 2, title: "Kubernetes Engineer", company: "CloudScale", match: 88, location: "San Francisco" },
      { id: 3, title: "Platform Engineer", company: "StartupXYZ", match: 82, location: "New York" },
    ]);
  };

  const handleRewrite = async (jobId: number) => {
    setIsRewriting(true);
    setTimeout(() => setIsRewriting(false), 2000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Job Matching & AI Rewrite</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Search Jobs</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter job title or keywords..."
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                <Target className="h-4 w-4" />
                Find Matches
              </button>
            </div>
          </div>

          {matchedJobs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Matched Jobs</h4>
              {matchedJobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h4 className="text-sm font-medium text-foreground">{job.title}</h4>
                        <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">{job.match}% Match</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{job.company} • {job.location}</p>
                    </div>
                    <button
                      onClick={() => handleRewrite(job.id)}
                      disabled={isRewriting}
                      className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 disabled:opacity-50"
                    >
                      {isRewriting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {isRewriting ? "Rewriting..." : "AI Rewrite CV"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
