// Central route registry used by sidebar nav and the global Cmd+K palette.
export interface RouteEntry {
  href: string;
  label: string;
  section: string;
}

export const ALL_ROUTES: RouteEntry[] = [
  // Main
  { href: "/dashboard", label: "Dashboard", section: "Main" },
  { href: "/platform", label: "Platform Hub", section: "Main" },
  { href: "/cluster", label: "Cluster", section: "Main" },
  { href: "/github", label: "GitHub", section: "Main" },
  { href: "/documentation", label: "Documentation", section: "Main" },
  { href: "/monitoring", label: "Monitoring", section: "Main" },
  { href: "/deployments", label: "Deployments", section: "Main" },
  { href: "/pipelines", label: "Pipelines", section: "Main" },
  { href: "/inbox", label: "Inbox", section: "Main" },

  // Productivity
  { href: "/notes", label: "Notes", section: "Productivity" },
  { href: "/bookmarks", label: "Bookmarks", section: "Productivity" },
  { href: "/snippets", label: "Snippets", section: "Productivity" },
  { href: "/calendar", label: "Calendar", section: "Productivity" },
  { href: "/timeline", label: "Timeline", section: "Productivity" },
  { href: "/pomodoro", label: "Pomodoro", section: "Productivity" },

  // DevOps Core
  { href: "/runbooks", label: "Runbooks", section: "DevOps" },
  { href: "/incidents", label: "Incidents", section: "DevOps" },
  { href: "/changelog", label: "Changelog", section: "DevOps" },
  { href: "/sla", label: "SLA / SLO", section: "DevOps" },
  { href: "/cost", label: "Cost Tracker", section: "DevOps" },
  { href: "/inventory", label: "Asset Inventory", section: "DevOps" },
  { href: "/dns", label: "DNS Records", section: "DevOps" },
  { href: "/ssl-monitor", label: "SSL Monitor", section: "DevOps" },
  { href: "/uptime", label: "Uptime", section: "DevOps" },
  { href: "/backups", label: "Backups", section: "DevOps" },
  { href: "/disaster-recovery", label: "Disaster Recovery", section: "DevOps" },

  // Knowledge
  { href: "/flashcards", label: "Flashcards", section: "Knowledge" },
  { href: "/quizzes", label: "Quizzes", section: "Knowledge" },
  { href: "/glossary", label: "Glossary", section: "Knowledge" },
  { href: "/lab-environments", label: "Lab Environments", section: "Knowledge" },

  // Career
  { href: "/portfolio", label: "Portfolio", section: "Career" },
  { href: "/interview-prep", label: "Interview Prep", section: "Career" },
  { href: "/job-tracker", label: "Job Tracker", section: "Career" },
  { href: "/skills-matrix", label: "Skills Matrix", section: "Career" },

  // Team
  { href: "/team", label: "Team Directory", section: "Team" },
  { href: "/oncall", label: "On-Call", section: "Team" },
  { href: "/announcements", label: "Announcements", section: "Team" },

  // Security extensions
  { href: "/security/audit-log", label: "Audit Log", section: "Security" },
  { href: "/security/compliance", label: "Compliance", section: "Security" },
  { href: "/security/sbom", label: "SBOM", section: "Security" },
  { href: "/security/vulnerabilities", label: "Vulnerabilities", section: "Security" },
  { href: "/security/secrets", label: "Secrets", section: "Security" },

  // Admin
  { href: "/settings", label: "Settings", section: "Admin" },
];
