import { API_BASE_URL } from './constants';

const SERVICE_PATHS = [
  { name: 'Auth', path: '/auth/me' },
  { name: 'User', path: '/users' },
  { name: 'Tenant', path: '/tenants' },
  { name: 'VPS', path: '/vps' },
  { name: 'Billing', path: '/billing/plans' },
  { name: 'CRM', path: '/crm/leads' },
  { name: 'WhatsApp', path: '/whatsapp/settings' },
  { name: 'Email', path: '/email/templates' },
  { name: 'Notification', path: '/notifications' },
  { name: 'Monitoring', path: '/monitoring/health' },
  { name: 'Audit', path: '/audit/logs' },
  { name: 'Analytics', path: '/analytics/usage' },
] as const;

export type ServiceHealth = {
  name: string;
  status: 'healthy' | 'unhealthy';
};

/** Probe microservice health via the API gateway (401 = service is up). */
export async function checkAllServices(): Promise<ServiceHealth[]> {
  const base = API_BASE_URL.replace(/\/$/, '');

  return Promise.all(
    SERVICE_PATHS.map(async ({ name, path }) => {
      try {
        const res = await fetch(`${base}${path}`, {
          method: 'GET',
          cache: 'no-store',
        });
        const healthy = res.ok || res.status === 401;
        return { name, status: healthy ? 'healthy' as const : 'unhealthy' as const };
      } catch {
        return { name, status: 'unhealthy' as const };
      }
    }),
  );
}
