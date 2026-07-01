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

// Layout
import Layout from "@/components/layout";

// Auth
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";

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

// Business pages
import BusinessDashboard from "@/pages/business/dashboard";
import BusinessTeam from "@/pages/business/team";
import BusinessCRM from "@/pages/business/crm";
import BusinessVPS from "@/pages/business/vps";
import BusinessBilling from "@/pages/business/billing";

// Agent pages
import AgentDashboard from "@/pages/agent/dashboard";
import AgentConversations from "@/pages/agent/conversations";
import AgentLeads from "@/pages/agent/leads";

// User pages
import UserDashboard from "@/pages/user/dashboard";
import UserVPS from "@/pages/user/vps";

import PlaceholderPage from "@/pages/placeholder";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedRoles, title }: { component: any; allowedRoles?: string[]; title?: string }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role || "")) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component title={title} />
    </Layout>
  );
}

function RoleRouter() {
  const { user, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (user) {
      const themeClass = user.role === "SUPER_ADMIN" ? "theme-super-admin" :
                        user.role === "ADMIN" ? "theme-admin" :
                        user.role === "AGENT" ? "theme-agent" : "";
      document.body.className = `dark ${themeClass}`;
    } else {
      document.body.className = "dark";
    }
  }, [user]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Root redirect */}
      <Route path="/">
        {() => {
          if (!isAuthenticated) return <Redirect to="/login" />;
          if (user?.role === "SUPER_ADMIN") return <Redirect to="/admin/dashboard" />;
          if (user?.role === "ADMIN") return <Redirect to="/business/dashboard" />;
          if (user?.role === "AGENT") return <Redirect to="/agent/dashboard" />;
          return <Redirect to="/dashboard" />;
        }}
      </Route>

      {/* Admin */}
      <Route path="/admin/dashboard">
        {() => <ProtectedRoute component={AdminDashboard} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/admin/tenants">
        {() => <ProtectedRoute component={AdminTenants} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/admin/vps">
        {() => <ProtectedRoute component={AdminVPS} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      
      <Route path="/admin/clusters">
        {() => <ProtectedRoute component={AdminClusters} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/admin/monitoring">
        {() => <ProtectedRoute component={AdminMonitoring} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/admin/whatsapp">
        {() => <ProtectedRoute component={AdminWhatsApp} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/admin/plans">
        {() => <ProtectedRoute component={AdminPlans} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/admin/billing">
        {() => <ProtectedRoute component={AdminBilling} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>
      <Route path="/admin/settings">
        {() => <ProtectedRoute component={AdminSettings} allowedRoles={["SUPER_ADMIN"]} />}
      </Route>

      {/* Business Admin */}
      <Route path="/business/dashboard">
        {() => <ProtectedRoute component={BusinessDashboard} allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}
      </Route>
      <Route path="/business/team">
        {() => <ProtectedRoute component={BusinessTeam} allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}
      </Route>
      <Route path="/business/crm">
        {() => <ProtectedRoute component={BusinessCRM} allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}
      </Route>
      <Route path="/business/vps">
        {() => <ProtectedRoute component={BusinessVPS} allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}
      </Route>
      <Route path="/business/billing">
        {() => <ProtectedRoute component={BusinessBilling} allowedRoles={["ADMIN", "SUPER_ADMIN"]} />}
      </Route>
      <Route path="/business/settings">
        {() => <ProtectedRoute component={PlaceholderPage} allowedRoles={["ADMIN", "SUPER_ADMIN"]} title="Settings" />}
      </Route>

      {/* Agent */}
      <Route path="/agent/dashboard">
        {() => <ProtectedRoute component={AgentDashboard} allowedRoles={["AGENT", "ADMIN", "SUPER_ADMIN"]} />}
      </Route>
      <Route path="/agent/conversations">
        {() => <ProtectedRoute component={AgentConversations} allowedRoles={["AGENT", "ADMIN", "SUPER_ADMIN"]} />}
      </Route>
      <Route path="/agent/leads">
        {() => <ProtectedRoute component={AgentLeads} allowedRoles={["AGENT", "ADMIN", "SUPER_ADMIN"]} />}
      </Route>

      {/* User */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={UserDashboard} allowedRoles={["USER", "ADMIN", "SUPER_ADMIN"]} />}
      </Route>
      <Route path="/vps">
        {() => <ProtectedRoute component={UserVPS} allowedRoles={["USER", "ADMIN", "SUPER_ADMIN"]} />}
      </Route>
      <Route path="/billing">
        {() => <ProtectedRoute component={PlaceholderPage} allowedRoles={["USER", "ADMIN", "SUPER_ADMIN"]} title="Billing" />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={PlaceholderPage} allowedRoles={["USER", "ADMIN", "SUPER_ADMIN"]} title="Settings" />}
      </Route>

      {/* Default Not Found */}
      <Route>
        <div className="flex items-center justify-center h-screen">Page Not Found</div>
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
