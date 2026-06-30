// @ts-nocheck
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { useState, Suspense, lazy } from "react";

// Lazy-load all page components
const LandingPage = lazy(() => import("@/app/page").then(m => ({ default: m.default })));
const LoginRedirect = lazy(() => import("@/app/login/page"));
const AboutPage = lazy(() => import("@/app/about/page"));
const BlogPage = lazy(() => import("@/app/blog/page"));
const CareersPage = lazy(() => import("@/app/careers/page"));
const PrivacyPage = lazy(() => import("@/app/privacy/page"));
const TermsPage = lazy(() => import("@/app/terms/page"));
const StatusPage = lazy(() => import("@/app/status/page"));
const ChangelogPage = lazy(() => import("@/app/changelog/page"));
const PlatformPage = lazy(() => import("@/app/platform/page"));
const DocsPage = lazy(() => import("@/app/docs/page"));
const DocumentationPage = lazy(() => import("@/app/documentation/page"));
const GdprPage = lazy(() => import("@/app/gdpr/page"));

// AmerCloud auth
const AmerCloudPage = lazy(() => import("@/app/amercloud/page"));
const AmerCloudLoginPage = lazy(() => import("@/app/amercloud/login/page"));
const AmerCloudRegisterPage = lazy(() => import("@/app/amercloud/register/page"));
const AmerCloudForgotPage = lazy(() => import("@/app/amercloud/forgot-password/page"));
const AmerCloudResetPage = lazy(() => import("@/app/amercloud/reset-password/page"));
const AmerCloudVerifyPage = lazy(() => import("@/app/amercloud/verify-email/page"));
const AmerCloudUserDashboard = lazy(() => import("@/app/amercloud/user/dashboard/page"));

// AmerCloud dashboard
const AmerDashboard = lazy(() => import("@/app/amercloud/dashboard/page"));
const AmerAnalytics = lazy(() => import("@/app/amercloud/dashboard/analytics/page"));
const AmerBackups = lazy(() => import("@/app/amercloud/dashboard/backups/page"));
const AmerBilling = lazy(() => import("@/app/amercloud/dashboard/billing/page"));
const AmerBillingInvoices = lazy(() => import("@/app/amercloud/dashboard/billing/invoices/page"));
const AmerCrm = lazy(() => import("@/app/amercloud/dashboard/crm/page"));
const AmerDatabases = lazy(() => import("@/app/amercloud/dashboard/databases/page"));
const AmerDatabaseById = lazy(() => import("@/app/amercloud/dashboard/databases/[id]/page"));
const AmerDeployments = lazy(() => import("@/app/amercloud/dashboard/deployments/page"));
const AmerDeploymentNew = lazy(() => import("@/app/amercloud/dashboard/deployments/new/page"));
const AmerDeploymentById = lazy(() => import("@/app/amercloud/dashboard/deployments/[id]/page"));
const AmerEnterprise = lazy(() => import("@/app/amercloud/dashboard/enterprise/page"));
const AmerImages = lazy(() => import("@/app/amercloud/dashboard/images/page"));
const AmerOrgs = lazy(() => import("@/app/amercloud/dashboard/orgs/[id]/page"));
const AmerReferral = lazy(() => import("@/app/amercloud/dashboard/referral/page"));
const AmerSettings = lazy(() => import("@/app/amercloud/dashboard/settings/page"));
const AmerSettingsApiKeys = lazy(() => import("@/app/amercloud/dashboard/settings/api-keys/page"));
const AmerSettingsTeam = lazy(() => import("@/app/amercloud/dashboard/settings/team/page"));
const AmerVps = lazy(() => import("@/app/amercloud/dashboard/vps/page"));
const AmerVpsNew = lazy(() => import("@/app/amercloud/dashboard/vps/new/page"));
const AmerVpsById = lazy(() => import("@/app/amercloud/dashboard/vps/[id]/page"));
const AmerWebhooks = lazy(() => import("@/app/amercloud/dashboard/webhooks/page"));

// AmerCloud admin
const AmerAdminPage = lazy(() => import("@/app/amercloud/admin/page"));
const AmerAdminBilling = lazy(() => import("@/app/amercloud/admin/billing/page"));
const AmerAdminDashboard = lazy(() => import("@/app/amercloud/admin/dashboard/page"));
const AmerAdminMaintenance = lazy(() => import("@/app/amercloud/admin/maintenance/page"));
const AmerAdminPlans = lazy(() => import("@/app/amercloud/admin/plans/page"));
const AmerAdminTransactions = lazy(() => import("@/app/amercloud/admin/transactions/page"));
const AmerAdminUsers = lazy(() => import("@/app/amercloud/admin/users/page"));

// VoidCloud admin
const VoidAdminSuperAdmin = lazy(() => import("@/app/voidcloud/admin/super-admin/page"));
const VoidAdminBusinessAdmin = lazy(() => import("@/app/voidcloud/admin/business-admin/page"));
const VoidAdminRoles = lazy(() => import("@/app/voidcloud/admin/roles/page"));
const VoidAdminSystemHealth = lazy(() => import("@/app/voidcloud/admin/system-health/page"));
const VoidAdminWhatsappCrm = lazy(() => import("@/app/voidcloud/admin/whatsapp-crm/page"));
const VoidAgentConversations = lazy(() => import("@/app/voidcloud/agent/conversations/page"));

// Devops / portal
const DevopsPage = lazy(() => import("@/app/devops/page"));
const DevopsLoginPage = lazy(() => import("@/app/devops/login/page"));
const PortalPage = lazy(() => import("@/app/portal/page"));
const DashboardPage = lazy(() => import("@/app/dashboard/page"));

// Feature pages
const AnnouncementsPage = lazy(() => import("@/app/announcements/page"));
const AutomationPage = lazy(() => import("@/app/automation/page"));
const AutomationScripts = lazy(() => import("@/app/automation/scripts/page"));
const AutomationTemplates = lazy(() => import("@/app/automation/templates/page"));
const BackupsPage = lazy(() => import("@/app/backups/page"));
const BookmarksPage = lazy(() => import("@/app/bookmarks/page"));
const CalendarPage = lazy(() => import("@/app/calendar/page"));
const ClusterPage = lazy(() => import("@/app/cluster/page"));
const CollaborationPage = lazy(() => import("@/app/collaboration/page"));
const CollaborationChat = lazy(() => import("@/app/collaboration/chat/page"));
const CostPage = lazy(() => import("@/app/cost/page"));
const CvStudioPage = lazy(() => import("@/app/cv-studio/page"));
const DeploymentsPage = lazy(() => import("@/app/deployments/page"));
const DisasterRecoveryPage = lazy(() => import("@/app/disaster-recovery/page"));
const DnsPage = lazy(() => import("@/app/dns/page"));
const FavoritesPage = lazy(() => import("@/app/favorites/page"));
const FlashcardsPage = lazy(() => import("@/app/flashcards/page"));
const GithubPage = lazy(() => import("@/app/github/page"));
const GlossaryPage = lazy(() => import("@/app/glossary/page"));
const InboxPage = lazy(() => import("@/app/inbox/page"));
const IncidentsPage = lazy(() => import("@/app/incidents/page"));
const InfrastructurePage = lazy(() => import("@/app/infrastructure/page"));
const IntegrationsPage = lazy(() => import("@/app/integrations/page"));
const IntegrationsSlack = lazy(() => import("@/app/integrations/slack/page"));
const IntegrationsWebhooks = lazy(() => import("@/app/integrations/webhooks/page"));
const InterviewPrepPage = lazy(() => import("@/app/interview-prep/page"));
const InventoryPage = lazy(() => import("@/app/inventory/page"));
const JobTrackerPage = lazy(() => import("@/app/job-tracker/page"));
const LabEnvironmentsPage = lazy(() => import("@/app/lab-environments/page"));
const LearningPage = lazy(() => import("@/app/learning/page"));
const LearningBooks = lazy(() => import("@/app/learning/books/page"));
const LearningCertifications = lazy(() => import("@/app/learning/certifications/page"));
const LearningConferences = lazy(() => import("@/app/learning/conferences/page"));
const LearningCvStudio = lazy(() => import("@/app/learning/cv-studio/page"));
const LearningJobs = lazy(() => import("@/app/learning/jobs/page"));
const LearningNews = lazy(() => import("@/app/learning/news/page"));
const LearningPaths = lazy(() => import("@/app/learning/paths/page"));
const LogsPage = lazy(() => import("@/app/logs/page"));
const MonitoringPage = lazy(() => import("@/app/monitoring/page"));
const NotesPage = lazy(() => import("@/app/notes/page"));
const NotificationsPage = lazy(() => import("@/app/notifications/page"));
const OncallPage = lazy(() => import("@/app/oncall/page"));
const PipelinesPage = lazy(() => import("@/app/pipelines/page"));
const PomodoroPage = lazy(() => import("@/app/pomodoro/page"));
const PortfolioPage = lazy(() => import("@/app/portfolio/page"));
const ProjectsPage = lazy(() => import("@/app/projects/page"));
const PromptsPage = lazy(() => import("@/app/prompts/page"));
const QuizzesPage = lazy(() => import("@/app/quizzes/page"));
const RunbooksPage = lazy(() => import("@/app/runbooks/page"));
const SecurityPage = lazy(() => import("@/app/security/page"));
const SecurityAuditLog = lazy(() => import("@/app/security/audit-log/page"));
const SecurityCompliance = lazy(() => import("@/app/security/compliance/page"));
const SecuritySbom = lazy(() => import("@/app/security/sbom/page"));
const SecuritySecrets = lazy(() => import("@/app/security/secrets/page"));
const SecurityVulnerabilities = lazy(() => import("@/app/security/vulnerabilities/page"));
const SettingsPage = lazy(() => import("@/app/settings/page"));
const SkillsMatrixPage = lazy(() => import("@/app/skills-matrix/page"));
const SlaPage = lazy(() => import("@/app/sla/page"));
const SnippetsPage = lazy(() => import("@/app/snippets/page"));
const SslMonitorPage = lazy(() => import("@/app/ssl-monitor/page"));
const TeamPage = lazy(() => import("@/app/team/page"));
const TimelinePage = lazy(() => import("@/app/timeline/page"));
const UptimePage = lazy(() => import("@/app/uptime/page"));

// Learning sub pages
const AnnounPage = lazy(() => import("@/app/announcements/page"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Loading...</div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {/* Root landing */}
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginRedirect} />

        {/* Public pages */}
        <Route path="/about" component={AboutPage} />
        <Route path="/blog" component={BlogPage} />
        <Route path="/careers" component={CareersPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/status" component={StatusPage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route path="/platform" component={PlatformPage} />
        <Route path="/docs" component={DocsPage} />
        <Route path="/documentation" component={DocumentationPage} />
        <Route path="/gdpr" component={GdprPage} />

        {/* AmerCloud auth */}
        <Route path="/amercloud" component={AmerCloudPage} />
        <Route path="/amercloud/login" component={AmerCloudLoginPage} />
        <Route path="/amercloud/register" component={AmerCloudRegisterPage} />
        <Route path="/amercloud/forgot-password" component={AmerCloudForgotPage} />
        <Route path="/amercloud/reset-password" component={AmerCloudResetPage} />
        <Route path="/amercloud/verify-email" component={AmerCloudVerifyPage} />
        <Route path="/amercloud/user/dashboard" component={AmerCloudUserDashboard} />

        {/* AmerCloud dashboard */}
        <Route path="/amercloud/dashboard" component={AmerDashboard} />
        <Route path="/amercloud/dashboard/analytics" component={AmerAnalytics} />
        <Route path="/amercloud/dashboard/backups" component={AmerBackups} />
        <Route path="/amercloud/dashboard/billing" component={AmerBilling} />
        <Route path="/amercloud/dashboard/billing/invoices" component={AmerBillingInvoices} />
        <Route path="/amercloud/dashboard/crm" component={AmerCrm} />
        <Route path="/amercloud/dashboard/databases" component={AmerDatabases} />
        <Route path="/amercloud/dashboard/databases/:id" component={AmerDatabaseById} />
        <Route path="/amercloud/dashboard/deployments" component={AmerDeployments} />
        <Route path="/amercloud/dashboard/deployments/new" component={AmerDeploymentNew} />
        <Route path="/amercloud/dashboard/deployments/:id" component={AmerDeploymentById} />
        <Route path="/amercloud/dashboard/enterprise" component={AmerEnterprise} />
        <Route path="/amercloud/dashboard/images" component={AmerImages} />
        <Route path="/amercloud/dashboard/orgs/:id" component={AmerOrgs} />
        <Route path="/amercloud/dashboard/referral" component={AmerReferral} />
        <Route path="/amercloud/dashboard/settings" component={AmerSettings} />
        <Route path="/amercloud/dashboard/settings/api-keys" component={AmerSettingsApiKeys} />
        <Route path="/amercloud/dashboard/settings/team" component={AmerSettingsTeam} />
        <Route path="/amercloud/dashboard/vps" component={AmerVps} />
        <Route path="/amercloud/dashboard/vps/new" component={AmerVpsNew} />
        <Route path="/amercloud/dashboard/vps/:id" component={AmerVpsById} />
        <Route path="/amercloud/dashboard/webhooks" component={AmerWebhooks} />

        {/* AmerCloud admin */}
        <Route path="/amercloud/admin" component={AmerAdminPage} />
        <Route path="/amercloud/admin/billing" component={AmerAdminBilling} />
        <Route path="/amercloud/admin/dashboard" component={AmerAdminDashboard} />
        <Route path="/amercloud/admin/maintenance" component={AmerAdminMaintenance} />
        <Route path="/amercloud/admin/plans" component={AmerAdminPlans} />
        <Route path="/amercloud/admin/transactions" component={AmerAdminTransactions} />
        <Route path="/amercloud/admin/users" component={AmerAdminUsers} />

        {/* VoidCloud admin */}
        <Route path="/voidcloud/admin/super-admin" component={VoidAdminSuperAdmin} />
        <Route path="/voidcloud/admin/business-admin" component={VoidAdminBusinessAdmin} />
        <Route path="/voidcloud/admin/roles" component={VoidAdminRoles} />
        <Route path="/voidcloud/admin/system-health" component={VoidAdminSystemHealth} />
        <Route path="/voidcloud/admin/whatsapp-crm" component={VoidAdminWhatsappCrm} />
        <Route path="/voidcloud/agent/conversations" component={VoidAgentConversations} />

        {/* Devops / Portal */}
        <Route path="/devops" component={DevopsPage} />
        <Route path="/devops/login" component={DevopsLoginPage} />
        <Route path="/portal" component={PortalPage} />
        <Route path="/dashboard" component={DashboardPage} />

        {/* Feature pages */}
        <Route path="/announcements" component={AnnouncementsPage} />
        <Route path="/automation" component={AutomationPage} />
        <Route path="/automation/scripts" component={AutomationScripts} />
        <Route path="/automation/templates" component={AutomationTemplates} />
        <Route path="/backups" component={BackupsPage} />
        <Route path="/bookmarks" component={BookmarksPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/cluster" component={ClusterPage} />
        <Route path="/collaboration" component={CollaborationPage} />
        <Route path="/collaboration/chat" component={CollaborationChat} />
        <Route path="/cost" component={CostPage} />
        <Route path="/cv-studio" component={CvStudioPage} />
        <Route path="/deployments" component={DeploymentsPage} />
        <Route path="/disaster-recovery" component={DisasterRecoveryPage} />
        <Route path="/dns" component={DnsPage} />
        <Route path="/favorites" component={FavoritesPage} />
        <Route path="/flashcards" component={FlashcardsPage} />
        <Route path="/github" component={GithubPage} />
        <Route path="/glossary" component={GlossaryPage} />
        <Route path="/inbox" component={InboxPage} />
        <Route path="/incidents" component={IncidentsPage} />
        <Route path="/infrastructure" component={InfrastructurePage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/integrations/slack" component={IntegrationsSlack} />
        <Route path="/integrations/webhooks" component={IntegrationsWebhooks} />
        <Route path="/interview-prep" component={InterviewPrepPage} />
        <Route path="/inventory" component={InventoryPage} />
        <Route path="/job-tracker" component={JobTrackerPage} />
        <Route path="/lab-environments" component={LabEnvironmentsPage} />
        <Route path="/learning" component={LearningPage} />
        <Route path="/learning/books" component={LearningBooks} />
        <Route path="/learning/certifications" component={LearningCertifications} />
        <Route path="/learning/conferences" component={LearningConferences} />
        <Route path="/learning/cv-studio" component={LearningCvStudio} />
        <Route path="/learning/jobs" component={LearningJobs} />
        <Route path="/learning/news" component={LearningNews} />
        <Route path="/learning/paths" component={LearningPaths} />
        <Route path="/logs" component={LogsPage} />
        <Route path="/monitoring" component={MonitoringPage} />
        <Route path="/notes" component={NotesPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/oncall" component={OncallPage} />
        <Route path="/pipelines" component={PipelinesPage} />
        <Route path="/pomodoro" component={PomodoroPage} />
        <Route path="/portfolio" component={PortfolioPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/prompts" component={PromptsPage} />
        <Route path="/quizzes" component={QuizzesPage} />
        <Route path="/runbooks" component={RunbooksPage} />
        <Route path="/security" component={SecurityPage} />
        <Route path="/security/audit-log" component={SecurityAuditLog} />
        <Route path="/security/compliance" component={SecurityCompliance} />
        <Route path="/security/sbom" component={SecuritySbom} />
        <Route path="/security/secrets" component={SecuritySecrets} />
        <Route path="/security/vulnerabilities" component={SecurityVulnerabilities} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/skills-matrix" component={SkillsMatrixPage} />
        <Route path="/sla" component={SlaPage} />
        <Route path="/snippets" component={SnippetsPage} />
        <Route path="/ssl-monitor" component={SslMonitorPage} />
        <Route path="/team" component={TeamPage} />
        <Route path="/timeline" component={TimelinePage} />
        <Route path="/uptime" component={UptimePage} />

        {/* 404 fallback */}
        <Route>
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-foreground">404</h1>
              <p className="mt-2 text-muted-foreground">Page not found</p>
              <a href="/" className="mt-4 inline-block text-primary hover:underline">Go home</a>
            </div>
          </div>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          <NotificationProvider>
            <AuthProvider>
              <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
                <AppRoutes />
              </WouterRouter>
            </AuthProvider>
          </NotificationProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
