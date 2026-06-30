/**
 * Role-based sidebar navigation for Void Cloud panels.
 * Routes follow existing app segments: voidcloud/* and amercloud/*.
 */
export const navigation = {
  SUPER_ADMIN: [
    { name: 'Dashboard', href: '/voidcloud/admin/super-admin', icon: 'LayoutDashboard' },
    { name: 'Users', href: '/amercloud/admin/users', icon: 'Users' },
    { name: 'Tenants', href: '/voidcloud/admin/tenants', icon: 'Building2' },
    { name: 'VPS Instances', href: '/amercloud/dashboard/deployments', icon: 'Server' },
    { name: 'WhatsApp CRM', href: '/voidcloud/admin/whatsapp-crm', icon: 'MessageCircle' },
    { name: 'Plans', href: '/amercloud/admin/plans', icon: 'CreditCard' },
    { name: 'Billing', href: '/amercloud/admin/billing', icon: 'Receipt' },
    { name: 'Settings', href: '/amercloud/dashboard/settings', icon: 'Settings' },
    { name: 'Audit Logs', href: '/amercloud/admin/audit', icon: 'FileText' },
    { name: 'System Health', href: '/voidcloud/admin/system-health', icon: 'Activity' },
  ],
  ADMIN: [
    { name: 'Dashboard', href: '/voidcloud/admin/business-admin', icon: 'LayoutDashboard' },
    { name: 'Team', href: '/amercloud/dashboard/settings/team', icon: 'Users' },
    { name: 'WhatsApp CRM', href: '/voidcloud/admin/whatsapp-crm', icon: 'MessageCircle' },
    { name: 'VPS Instances', href: '/amercloud/dashboard/deployments', icon: 'Server' },
    { name: 'Settings', href: '/amercloud/dashboard/settings', icon: 'Settings' },
    { name: 'Billing', href: '/amercloud/dashboard/billing', icon: 'Receipt' },
  ],
  AGENT: [
    { name: 'Dashboard', href: '/voidcloud/agent/conversations', icon: 'LayoutDashboard' },
    { name: 'Conversations', href: '/voidcloud/agent/conversations', icon: 'MessageCircle' },
    { name: 'Leads', href: '/amercloud/dashboard/crm', icon: 'UserPlus' },
  ],
  USER: [
    { name: 'Dashboard', href: '/amercloud/dashboard', icon: 'LayoutDashboard' },
    { name: 'VPS Instances', href: '/amercloud/dashboard/deployments', icon: 'Server' },
    { name: 'Billing', href: '/amercloud/dashboard/billing', icon: 'Receipt' },
    { name: 'Settings', href: '/amercloud/dashboard/settings', icon: 'Settings' },
  ],
} as const;

export type NavRole = keyof typeof navigation;
