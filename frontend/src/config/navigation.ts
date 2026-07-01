/**
 * Role-based sidebar navigation for Void Cloud panels.
 * Routes follow existing app segments: voidcloud/* and voidcloud/*.
 */
export const navigation = {
  SUPER_ADMIN: [
    { name: 'Dashboard', href: '/voidcloud/admin/super-admin', icon: 'LayoutDashboard' },
    { name: 'Users', href: '/voidcloud/admin/users', icon: 'Users' },
    { name: 'Tenants', href: '/voidcloud/admin/tenants', icon: 'Building2' },
    { name: 'VPS Instances', href: '/voidcloud/dashboard/deployments', icon: 'Server' },
    { name: 'WhatsApp CRM', href: '/voidcloud/admin/whatsapp-crm', icon: 'MessageCircle' },
    { name: 'Plans', href: '/voidcloud/admin/plans', icon: 'CreditCard' },
    { name: 'Billing', href: '/voidcloud/admin/billing', icon: 'Receipt' },
    { name: 'Settings', href: '/voidcloud/dashboard/settings', icon: 'Settings' },
    { name: 'Audit Logs', href: '/voidcloud/admin/audit', icon: 'FileText' },
    { name: 'System Health', href: '/voidcloud/admin/system-health', icon: 'Activity' },
  ],
  ADMIN: [
    { name: 'Dashboard', href: '/voidcloud/admin/business-admin', icon: 'LayoutDashboard' },
    { name: 'Team', href: '/voidcloud/dashboard/settings/team', icon: 'Users' },
    { name: 'WhatsApp CRM', href: '/voidcloud/admin/whatsapp-crm', icon: 'MessageCircle' },
    { name: 'VPS Instances', href: '/voidcloud/dashboard/deployments', icon: 'Server' },
    { name: 'Settings', href: '/voidcloud/dashboard/settings', icon: 'Settings' },
    { name: 'Billing', href: '/voidcloud/dashboard/billing', icon: 'Receipt' },
  ],
  AGENT: [
    { name: 'Dashboard', href: '/voidcloud/agent/conversations', icon: 'LayoutDashboard' },
    { name: 'Conversations', href: '/voidcloud/agent/conversations', icon: 'MessageCircle' },
    { name: 'Leads', href: '/voidcloud/dashboard/crm', icon: 'UserPlus' },
  ],
  USER: [
    { name: 'Dashboard', href: '/voidcloud/dashboard', icon: 'LayoutDashboard' },
    { name: 'VPS Instances', href: '/voidcloud/dashboard/deployments', icon: 'Server' },
    { name: 'Billing', href: '/voidcloud/dashboard/billing', icon: 'Receipt' },
    { name: 'Settings', href: '/voidcloud/dashboard/settings', icon: 'Settings' },
  ],
} as const;

export type NavRole = keyof typeof navigation;
