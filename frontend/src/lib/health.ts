const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.voidcloud.cc.cd/api/v1';

const SERVICES = [
  { name: 'Auth', path: '/auth/health', port: 3001 },
  { name: 'User', path: '/users', port: 3002 },
  { name: 'Tenant', path: '/tenants', port: 3003 },
  { name: 'VPS', path: '/vps', port: 3004 },
  { name: 'Billing', path: '/billing/plans', port: 3005 },
  { name: 'CRM', path: '/crm/leads', port: 3006 },
  { name: 'WhatsApp', path: '/whatsapp/settings', port: 3007 },
  { name: 'Email', path: '/email/templates', port: 3008 },
  { name: 'Notification', path: '/notifications', port: 3009 },
  { name: 'Monitoring', path: '/monitoring/health', port: 3010 },
  { name: 'Audit', path: '/audit/logs', port: 3011 },
  { name: 'Analytics', path: '/analytics/usage', port: 3012 },
];

export async function checkAllServices() {
  const checks = await Promise.all(
    SERVICES.map(async (service) => {
      try {
        const res = await fetch(`${API_BASE.replace('/api/v1', '')}/health`, {
          method: 'GET',
          cache: 'no-store',
        }).catch(() => null);
        if (res?.ok) {
          return { name: service.name, status: 'healthy' as const };
        }
        const alt = await fetch(`${API_BASE}${service.path}`, {
          method: 'GET',
          cache: 'no-store',
        }).catch(() => null);
        return {
          name: service.name,
          status: alt?.ok || alt?.status === 401 ? ('healthy' as const) : ('unhealthy' as const),
        };
      } catch {
        return { name: service.name, status: 'unhealthy' as const };
      }
    }),
  );
  return checks;
}
