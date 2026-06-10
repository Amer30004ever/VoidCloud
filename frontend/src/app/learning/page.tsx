"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Briefcase, Newspaper, BookOpen, Award, FileText, Search, Plus, Clock, Tag, Users, Download, Share2, Star, Loader2, Calendar, Book } from "lucide-react";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AddItemButton } from "@/components/ui/create-item-dialog";
import { useQuery } from "@tanstack/react-query";
import { learningApi } from "@/lib/learning";

function LearningPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs = ["jobs", "news", "paths", "certifications", "cv-studio", "conferences", "books"] as const;
  type LearningTab = (typeof validTabs)[number];
  const [localTab, setLocalTab] = useState<LearningTab>("jobs");
  const activeTab: LearningTab =
    tabParam && validTabs.includes(tabParam as LearningTab) ? (tabParam as LearningTab) : localTab;
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { id: "jobs" as const, label: "DevOps Jobs", icon: Briefcase },
    { id: "news" as const, label: "Tech News", icon: Newspaper },
    { id: "paths" as const, label: "Learning Paths", icon: BookOpen },
    { id: "certifications" as const, label: "Certifications", icon: Award },
    { id: "cv-studio" as const, label: "CV Studio", icon: FileText },
    { id: "conferences" as const, label: "Conferences", icon: Calendar },
    { id: "books" as const, label: "Books", icon: Book },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Learning & Career"
        description="DevOps jobs, tech news, learning paths, certifications, and AI-powered CV Studio"
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
      {activeTab === "jobs" && <JobsTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
      {activeTab === "news" && <NewsTab isLoading={isLoading} />}
      {activeTab === "paths" && <PathsTab isLoading={isLoading} />}
      {activeTab === "certifications" && <CertificationsTab isLoading={isLoading} />}
      {activeTab === "cv-studio" && <CVStudioTab isLoading={isLoading} />}
      {activeTab === "conferences" && <ConferencesTab isLoading={isLoading} />}
      {activeTab === "books" && <BooksTab isLoading={isLoading} />}
    </AppLayout>
  );
}

function JobsTab({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (query: string) => void }) {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["learning-jobs", searchQuery],
    queryFn: () => learningApi.getJobs(searchQuery),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button type="button" className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          <Star className="h-4 w-4" />
          Saved Jobs
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No jobs found.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">{job.title}</h4>
                  <p className="text-xs text-muted-foreground">{job.company} • {job.location} • {job.salary}</p>
                </div>
                <a href={job.url} target="_blank" rel="noreferrer" className="rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20">
                  Apply
                </a>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{job.description}</p>
              <div className="flex flex-wrap gap-2">
                {(job.skills ?? []).slice(0, 5).map((skill) => (
                  <span key={skill} className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">{skill}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Latest Tech News</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Kubernetes 1.30 Released with New Features</h4>
                <p className="text-xs text-muted-foreground">Hacker News • 2h ago</p>
              </div>
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Kubernetes</span>
            </div>
            <p className="text-xs text-muted-foreground">Kubernetes 1.30 introduces several new features including improved security, better resource management, and enhanced observability.</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Docker Announces New Security Features</h4>
                <p className="text-xs text-muted-foreground">Docker Blog • 5h ago</p>
              </div>
              <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">Docker</span>
            </div>
            <p className="text-xs text-muted-foreground">Docker introduces new security features including enhanced vulnerability scanning and improved access controls.</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">GitHub Actions Adds New Workflow Features</h4>
                <p className="text-xs text-muted-foreground">GitHub Blog • 1d ago</p>
              </div>
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">GitHub</span>
            </div>
            <p className="text-xs text-muted-foreground">GitHub Actions introduces new workflow features including improved caching, better matrix builds, and enhanced security.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PathsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Learning Paths</h3>
        <AddItemButton
          label="Start Path"
          title="Start Learning Path"
          fields={[
            { name: "path", label: "Learning Path", placeholder: "Kubernetes Fundamentals", required: true },
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
                <h4 className="text-sm font-medium text-foreground">Kubernetes Fundamentals</h4>
                <p className="text-xs text-muted-foreground">Beginner • 20 hours • 8 modules</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">In Progress</span>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-green-500 transition-all" style={{ width: "60%" }} />
            </div>
            <p className="text-xs text-muted-foreground">60% complete • 5/8 modules done</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Advanced CI/CD with GitHub Actions</h4>
                <p className="text-xs text-muted-foreground">Intermediate • 15 hours • 6 modules</p>
              </div>
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Not Started</span>
            </div>
            <p className="text-xs text-muted-foreground">Master advanced CI/CD techniques including matrix builds, caching, and custom actions.</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Cloud Native Security</h4>
                <p className="text-xs text-muted-foreground">Advanced • 25 hours • 10 modules</p>
              </div>
              <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">Not Started</span>
            </div>
            <p className="text-xs text-muted-foreground">Learn security best practices for cloud-native applications and infrastructure.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CertificationsTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Certifications</h3>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">AWS Certified DevOps Engineer - Professional</h4>
                <p className="text-xs text-muted-foreground">AWS • Professional • 30 hours</p>
              </div>
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Completed</span>
            </div>
            <p className="text-xs text-muted-foreground">Earned on March 15, 2024</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Certified Kubernetes Administrator (CKA)</h4>
                <p className="text-xs text-muted-foreground">CNCF • Professional • 25 hours</p>
              </div>
              <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">In Progress</span>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-yellow-500 transition-all" style={{ width: "40%" }} />
            </div>
            <p className="text-xs text-muted-foreground">40% complete • Target: June 2024</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Google Cloud Professional DevOps Engineer</h4>
                <p className="text-xs text-muted-foreground">Google Cloud • Professional • 35 hours</p>
              </div>
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Not Started</span>
            </div>
            <p className="text-xs text-muted-foreground">Target: September 2024</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CVStudioTab({ isLoading }: { isLoading: boolean }) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">AI-Powered CV Studio</h3>
        <AddItemButton
          label="New CV"
          title="Create New CV"
          fields={[{ name: "title", label: "CV Title", placeholder: "DevOps Engineer CV", required: true }]}
          onSubmit={() => {
            router.push("/cv-studio");
            return Promise.resolve();
          }}
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
                <h4 className="text-sm font-medium text-foreground">DevOps Engineer CV</h4>
                <p className="text-xs text-muted-foreground">Last updated 2h ago • LaTeX format</p>
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
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">ATS Score: 85%</span>
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Optimized</span>
            </div>
            <p className="text-xs text-muted-foreground">Professional CV optimized for DevOps roles with ATS-friendly formatting.</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">SRE Engineer CV</h4>
                <p className="text-xs text-muted-foreground">Last updated 1d ago • Markdown format</p>
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
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">ATS Score: 72%</span>
              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-500">Needs Optimization</span>
            </div>
            <p className="text-xs text-muted-foreground">CV for Site Reliability Engineer positions - needs AI optimization.</p>
          </div>
          
          <div className="rounded-xl border border-primary/50 bg-primary/10 p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">AI CV Optimizer</h4>
                <p className="text-xs text-muted-foreground">Optimize your CV for specific job descriptions</p>
              </div>
              <button className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                Optimize
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Paste a job description and get AI-powered suggestions to improve your CV&apos;s ATS score.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ConferencesTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Conference Calendar</h3>
      
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
                  <h4 className="text-sm font-medium text-foreground">KubeCon EU 2026</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Upcoming</span>
                </div>
                <p className="text-xs text-muted-foreground">June 15-18, 2026 • Paris, France</p>
              </div>
              <button className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                Register
              </button>
            </div>
            <p className="text-xs text-muted-foreground">The premier Kubernetes conference in Europe with workshops, talks, and networking.</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">DevOps Summit 2026</h4>
                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Upcoming</span>
                </div>
                <p className="text-xs text-muted-foreground">August 20-22, 2026 • San Francisco, CA</p>
              </div>
              <button className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                Register
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Annual DevOps conference featuring industry leaders and best practices.</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Cloud Native Day</h4>
                  <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-500">Call for Papers</span>
                </div>
                <p className="text-xs text-muted-foreground">October 10, 2026 • London, UK</p>
              </div>
              <button className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20">
                Submit
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Single-day event focused on cloud-native technologies and practices.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BooksTab({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Book Recommendations</h3>
      
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
                  <Book className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">The Phoenix Project</h4>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">Must Read</span>
                </div>
                <p className="text-xs text-muted-foreground">Gene Kim, Kevin Behr, George Spafford</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Star className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">A novel about IT, DevOps, and helping your business win.</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Site Reliability Engineering</h4>
                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">Google SRE</span>
                </div>
                <p className="text-xs text-muted-foreground">Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Richard Murphy</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Star className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">How Google runs production systems and the lessons learned.</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">The DevOps Handbook</h4>
                  <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-500">Essential</span>
                </div>
                <p className="text-xs text-muted-foreground">Gene Kim, Jez Humble, Patrick Debois, John Willis</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Star className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">How to create world-class agility, reliability, and security in technology organizations.</p>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">Kubernetes Up & Running</h4>
                  <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-500">Technical</span>
                </div>
                <p className="text-xs text-muted-foreground">Kelsey Hightower, Brendan Burns, Joe Beda</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                  <Star className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Dive into Kubernetes and learn how to deploy, manage, and scale containerized applications.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LearningPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LearningPageContent />
    </Suspense>
  );
}
