import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

// Configure API client
const apiBase = import.meta.env.VITE_API_URL || "/api";
setBaseUrl(apiBase);
setAuthTokenGetter(() => localStorage.getItem("voidcloud_token"));

// Apply stored theme on load
const storedTheme = localStorage.getItem("vc_theme") || "dark";
document.documentElement.classList.toggle("dark", storedTheme === "dark");

// Layout
import Layout from "@/components/layout";

// Auth
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";

// Onboarding
import Onboarding from "@/pages/onboarding";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminTenants from "@/pages/admin/tenants";
import AdminVPS from "@/pages/admin/vps";
import AdminClusters from "@/pages/admin/clusters";
import AdminMonitoring from "@/pages/admin/monitoring";
import AdminPlans from "@/pages/admin/plans";
import AdminBilling from "@/pages/admin/billing";
import AdminWhatsApp from "@/pages/admin/whatsapp";
import AdminSettings from "@/pages/admin/settings";
import AdminAudit from "@/pages/admin/audit";
import AdminSecurity from "@/pages/admin/security";
import AdminPods from "@/pages/admin/pods";

// Business pages
import BusinessDashboard from "@/pages/business/dashboard";
import BusinessTeam from "@/pages/business/team";
import BusinessCRM from "@/pages/business/crm";
import BusinessVPS from "@/pages/business/vps";
import BusinessBilling from "@/pages/business/billing";
import BusinessSettings from "@/pages/business/settings";

// Agent pages
import AgentDashboard from "@/pages/agent/dashboard";
import AgentConversations from "@/pages/agent/conversations";
import AgentLeads from "@/pages/agent/leads";

// User pages
import UserDashboard from "@/pages/user/dashboard";
import UserVPS from "@/pages/user/vps";
import UserBilling from "@/pages/user/billing";
import UserSettings from "@/pages/user/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: React.ComponentType;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role || "")) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function RoleRouter() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (user) {
      const themeClass =
        user.role === "SUPER_ADMIN" ? "theme-super-admin" :
        user.role === "ADMIN"       ? "theme-admin" :
        user.role === "AGENT"       ? "theme-agent" : "";
      document.body.className = `${themeClass}`;
    } else {
      document.body.className = "";
    }
  }, [user]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/onboarding" component={Onboarding} />

      {/* Root redirect by role */}
      <Route path="/">
        {() => {
          if (!isAuthenticated) return <Redirect to="/login" />;
          if (user?.role === "SUPER_ADMIN") return <Redirect to="/admin/dashboard" />;
          if (user?.role === "ADMIN")       return <Redirect to="/business/dashboard" />;
          if (user?.role === "AGENT")       return <Redirect to="/agent/dashboard" />;
          return <Redirect to="/dashboard" />;
        }}
      </Route>

      {/* ── Super Admin ── */}
      <Route path="/admin/dashboard">{() => <ProtectedRoute component={AdminDashboard} allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/users">    {() => <ProtectedRoute component={AdminUsers}     allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/tenants">  {() => <ProtectedRoute component={AdminTenants}   allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/vps">      {() => <ProtectedRoute component={AdminVPS}       allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/clusters"> {() => <ProtectedRoute component={AdminClusters}  allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/whatsapp"> {() => <ProtectedRoute component={AdminWhatsApp}  allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/plans">    {() => <ProtectedRoute component={AdminPlans}     allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/billing">  {() => <ProtectedRoute component={AdminBilling}   allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/monitoring">{() => <ProtectedRoute component={AdminMonitoring} allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/pods">     {() => <ProtectedRoute component={AdminPods}      allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/security"> {() => <ProtectedRoute component={AdminSecurity}  allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/audit">    {() => <ProtectedRoute component={AdminAudit}     allowedRoles={["SUPER_ADMIN"]} />}</Route>
      <Route path="/admin/settings"> {() => <ProtectedRoute component={AdminSettings}  allowedRoles={["SUPER_ADMIN"]} />}</Route>

      {/* ── Business Admin ── */}
      <Route path="/business/dashboard">{() => <ProtectedRoute component={BusinessDashboard} allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}</Route>
      <Route path="/business/team">     {() => <ProtectedRoute component={BusinessTeam}      allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}</Route>
      <Route path="/business/crm">      {() => <ProtectedRoute component={BusinessCRM}       allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}</Route>
      <Route path="/business/vps">      {() => <ProtectedRoute component={BusinessVPS}       allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}</Route>
      <Route path="/business/billing">  {() => <ProtectedRoute component={BusinessBilling}   allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}</Route>
      <Route path="/business/settings"> {() => <ProtectedRoute component={BusinessSettings}  allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}</Route>

      {/* ── Agent ── */}
      <Route path="/agent/dashboard">     {() => <ProtectedRoute component={AgentDashboard}     allowedRoles={["AGENT", "ADMIN", "SUPER_ADMIN"]} />}</Route>
      <Route path="/agent/conversations"> {() => <ProtectedRoute component={AgentConversations} allowedRoles={["AGENT", "ADMIN", "SUPER_ADMIN"]} />}</Route>
      <Route path="/agent/leads">         {() => <ProtectedRoute component={AgentLeads}         allowedRoles={["AGENT", "ADMIN", "SUPER_ADMIN"]} />}</Route>

      {/* ── User ── */}
      <Route path="/dashboard">{() => <ProtectedRoute component={UserDashboard} allowedRoles={["USER", "ADMIN", "SUPER_ADMIN", "AGENT"]} />}</Route>
      <Route path="/vps">      {() => <ProtectedRoute component={UserVPS}       allowedRoles={["USER", "ADMIN", "SUPER_ADMIN"]} />}</Route>
      <Route path="/billing">  {() => <ProtectedRoute component={UserBilling}   allowedRoles={["USER", "ADMIN", "SUPER_ADMIN"]} />}</Route>
      <Route path="/settings"> {() => <ProtectedRoute component={UserSettings}  allowedRoles={["USER", "ADMIN", "SUPER_ADMIN", "AGENT"]} />}</Route>

      {/* 404 */}
      <Route>
        <div className="flex items-center justify-center h-screen text-muted-foreground">Page Not Found</div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <RoleRouter />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
