"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Server,
  FolderGit2,
  Settings,
  FileText,
  Terminal,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Code,
  Shield,
  Users,
  Zap,
  Puzzle,
  Briefcase,
  Newspaper,
  FileEdit,
  Moon,
  Sun,
  Menu,
  X,
  Award,
  Calendar,
  Book,
  Globe,
  StickyNote,
  Bookmark,
  Code2,
  CalendarDays,
  Activity,
  Timer,
  BookOpen,
  AlertTriangle,
  GitCommit,
  Gauge,
  DollarSign,
  Boxes,
  Globe2,
  ShieldCheck,
  Heart,
  Database,
  LifeBuoy,
  Layers,
  HelpCircle,
  BookA,
  Target,
  Radar,
  PhoneCall,
  Megaphone,
  History,
  FileBox,
  MessageSquareQuote,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

interface NavSection {
  title: string;
  items: {
    href: string;
    label: string;
    icon: LucideIcon;
    badge?: number;
  }[];
}

function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function findActiveSectionTitle(pathname: string): string | null {
  for (const section of navSections) {
    const hasActiveItem = section.items.some((item) => isNavItemActive(pathname, item.href));
    if (hasActiveItem) {
      return section.title;
    }
  }
  return null;
}

const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/platform", label: "Platform Hub", icon: Globe },
      { href: "/cluster", label: "Cluster", icon: Server },
      { href: "/github", label: "GitHub", icon: FolderGit2 },
      { href: "/documentation", label: "Documentation", icon: FileText },
    ],
  },
  {
    title: "Learning & Career",
    items: [
      { href: "/learning/jobs", label: "DevOps Jobs", icon: Briefcase },
      { href: "/learning/news", label: "Tech News", icon: Newspaper },
      { href: "/learning/paths", label: "Learning Paths", icon: GraduationCap },
      { href: "/learning/certifications", label: "Certifications", icon: Award },
      { href: "/learning/cv-studio", label: "CV Studio", icon: FileEdit },
      { href: "/learning/conferences", label: "Conferences", icon: Calendar },
      { href: "/learning/books", label: "Books", icon: Book },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/automation/scripts", label: "Script Library", icon: Code },
      { href: "/automation/templates", label: "Workflow Templates", icon: Zap },
      { href: "/security/vulnerabilities", label: "Vulnerability Scanner", icon: Shield, badge: 3 },
      { href: "/collaboration/chat", label: "Team Chat", icon: Users },
    ],
  },
  {
    title: "Integrations",
    items: [
      { href: "/integrations/slack", label: "Slack", icon: Puzzle },
      { href: "/integrations/webhooks", label: "Webhooks", icon: Zap },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { theme, toggleTheme } = useTheme();
  const activeSection = findActiveSectionTitle(pathname);
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSectionExpanded = (title: string) => {
    if (activeSection === title) return true;
    return manualExpanded.has(title);
  };

  const toggleSection = (title: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setManualExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 rounded-lg bg-primary p-2 text-primary-foreground shadow-lg"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={toggleMobileMenu}
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
        />
      )}

      <aside className={cn(
        "flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border fixed lg:relative z-50 transition-transform lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 px-4 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Terminal className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight text-sidebar-foreground">
            Amer Portal
          </span>
        </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {navSections
          .filter((section) => section.title !== "Admin" || isAdmin)
          .map((section) => {
          const isExpanded = isSectionExpanded(section.title);
          const hasActiveItem = section.items.some((item) => isNavItemActive(pathname, item.href));

          return (
            <div key={section.title}>
              {/* Section Header */}
              <button
                onClick={(e) => toggleSection(section.title, e)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                  hasActiveItem || isExpanded
                    ? "text-sidebar-primary bg-sidebar-accent/50"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                )}
              >
                <span>{section.title}</span>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="mt-1 space-y-1 pl-2">
                  {section.items.map(({ href, label, icon: Icon, badge }) => {
                    const isActive = isNavItemActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-primary" : "text-sidebar-foreground/50"
                          )}
                        />
                        <span className="flex-1">{label}</span>
                        {badge !== undefined && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
          ) : (
            <Sun className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
          )}
          <span className="flex-1">{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </button>
        <p className="mt-2 px-3 text-xs text-sidebar-foreground/40">
          Amer Portal v1.0.0
        </p>
      </div>
    </aside>
    </>
  );
}