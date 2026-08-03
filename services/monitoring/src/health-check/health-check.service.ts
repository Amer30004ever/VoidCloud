import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Real-time health probes for all 13 microservices.
 *
 * The probe loop is driven by HealthCheckScheduler on a fixed 30s server-side
 * interval — independent of any browser tab being open. Frontends read the
 * cached snapshot; a SUPER_ADMIN "force check" also triggers `probeAllAndPersist`
 * on demand.
 */
export type FailureType = 'TIMEOUT' | 'NETWORK' | 'HTTP_5XX' | 'HTTP_4XX' | 'MALFORMED' | 'UNKNOWN';

export interface ServiceProbe {
  name: string;
  url: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  responseTimeMs: number | null;
  failureType?: FailureType;
  error?: string;
  lastChecked: string;
}

export interface HealthSnapshot {
  services: ServiceProbe[];
  healthPercent: number;
  up: number;
  down: number;
  degraded: number;
  checkedAt: string;
  source: 'cache' | 'live';
}

/** Sanitized, unauthenticated shape served to the public /status page. */
export interface PublicStatusComponent {
  key: string;
  label: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  responseTimeMs: number | null;
  lastChecked: string;
}

export interface PublicStatusSnapshot {
  overall: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE';
  healthPercent: number;
  components: PublicStatusComponent[];
  checkedAt: string;
}

/** Customer-facing names — never leak internal service/host naming. */
const PUBLIC_LABELS: Record<string, string> = {
  auth: 'Authentication',
  user: 'User accounts',
  tenant: 'Workspaces',
  vps: 'VPS provisioning',
  billing: 'Billing & payments',
  crm: 'CRM',
  whatsapp: 'WhatsApp messaging',
  email: 'Email delivery',
  notification: 'Notifications',
  monitoring: 'Monitoring',
  audit: 'Audit log',
  analytics: 'Analytics',
  frontend: 'Web app',
};



const SERVICES: { name: string; host: string; port: number; path?: string }[] = [
  { name: 'auth', host: 'auth-service', port: 3001 },
  { name: 'user', host: 'user-service', port: 3002 },
  { name: 'tenant', host: 'tenant-service', port: 3003 },
  { name: 'vps', host: 'vps-service', port: 3004 },
  { name: 'billing', host: 'billing-service', port: 3005 },
  { name: 'crm', host: 'crm-service', port: 3006 },
  { name: 'whatsapp', host: 'whatsapp-service', port: 3007 },
  { name: 'email', host: 'email-service', port: 3008 },
  { name: 'notification', host: 'notification-service', port: 3009 },
  { name: 'monitoring', host: 'monitoring-service', port: 3010 },
  { name: 'audit', host: 'audit-service', port: 3011 },
  { name: 'analytics', host: 'analytics-service', port: 3012 },
  { name: 'frontend', host: 'frontend-service', port: 3000, path: '/' },
];

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private cache: HealthSnapshot | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Read the cached snapshot from the last scheduled probe.
   * This is what the frontend polls — never triggers new outbound pings,
   * so N open admin tabs produce N reads against the local cache, and
   * still only 1 round of pings per scheduler tick.
   */
  async getLatestCached(): Promise<HealthSnapshot> {
    if (this.cache) return this.cache;
    // Cold start (scheduler hasn't run yet) — hydrate from ServiceHealthLog.
    const rows = await this.prisma.serviceHealthLog.findMany({
      where: { serviceName: { in: SERVICES.map((s) => s.name) } },
      orderBy: { checkedAt: 'desc' },
      take: SERVICES.length * 3,
    });
    const byName = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!byName.has(r.serviceName)) byName.set(r.serviceName, r);
    const services: ServiceProbe[] = SERVICES.map((s) => {
      const r = byName.get(s.name);
      return r
        ? {
            name: s.name,
            url: `http://${s.host}:${s.port}${s.path ?? '/health'}`,
            status: r.status as ServiceProbe['status'],
            responseTimeMs: r.responseTimeMs ?? null,
            failureType: (r.failureType as FailureType | null) ?? undefined,
            error: r.errorMessage ?? undefined,
            lastChecked: r.checkedAt.toISOString(),
          }
        : {
            name: s.name,
            url: `http://${s.host}:${s.port}${s.path ?? '/health'}`,
            status: 'DOWN',
            responseTimeMs: null,
            failureType: 'UNKNOWN',
            error: 'no probe data yet',
            lastChecked: new Date(0).toISOString(),
          };
    });
    return this.summarize(services, 'cache');
  }

  /**
   * Actually ping the 13 services and persist the results. Called by:
   *  - HealthCheckScheduler on its 30s interval
   *  - POST /monitoring/services/health/check-now (SUPER_ADMIN force check)
   */
  // Single-flight guard: concurrent callers (scheduler tick racing with a
  // SUPER_ADMIN force check, or several force-checks arriving together) all
  // await the SAME probe round instead of each fanning out 13 new pings.
  private inFlight: Promise<HealthSnapshot> | null = null;

  async probeAllAndPersist(): Promise<HealthSnapshot> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.doProbeAllAndPersist().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async doProbeAllAndPersist(): Promise<HealthSnapshot> {
    const results = await Promise.all(
      SERVICES.map((s) => this.probe(s.name, s.host, s.port, s.path)),
    );
    // Persist snapshots — best-effort per row so one DB error doesn't drop the batch.
    await Promise.all(
      results.map((r) =>
        this.prisma.serviceHealthLog
          .create({
            data: {
              serviceName: r.name,
              status: r.status,
              responseTimeMs: r.responseTimeMs ?? null,
              errorMessage: r.error ?? null,
              failureType: r.failureType ?? null,
              uptimePercentage: r.status === 'UP' ? 100 : r.status === 'DEGRADED' ? 50 : 0,
            } as never,
          })
          .catch((e) => this.logger.warn(`health log persist failed (${r.name}): ${e?.message ?? e}`)),
      ),
    );
    const snap = this.summarize(results, 'live');
    this.cache = snap;
    return snap;
  }

  private summarize(results: ServiceProbe[], source: 'cache' | 'live'): HealthSnapshot {
    const up = results.filter((r) => r.status === 'UP').length;
    const down = results.filter((r) => r.status === 'DOWN').length;
    const degraded = results.filter((r) => r.status === 'DEGRADED').length;
    const healthPercent = Math.round(((up + 0.5 * degraded) / results.length) * 100);
    const checkedAt =
      results.reduce((acc, r) => (r.lastChecked > acc ? r.lastChecked : acc), '') ||
      new Date().toISOString();
    return { services: results, healthPercent, up, down, degraded, checkedAt, source };
  }

  private classifyHttpFailure(
    statusCode: number | undefined,
    err?: NodeJS.ErrnoException & { message?: string },
  ): { status: 'DOWN' | 'DEGRADED'; failureType: FailureType; error: string } {
    if (err?.message === 'timeout') return { status: 'DOWN', failureType: 'TIMEOUT', error: 'timeout' };
    if (err) {
      const code = err.code ?? '';
      if (['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH', 'ECONNRESET', 'EAI_AGAIN'].includes(code)) {
        return { status: 'DOWN', failureType: 'NETWORK', error: `${code}: ${err.message}` };
      }
      return { status: 'DOWN', failureType: 'UNKNOWN', error: err.message ?? String(err) };
    }
    if (statusCode && statusCode >= 500) return { status: 'DOWN', failureType: 'HTTP_5XX', error: `HTTP ${statusCode}` };
    if (statusCode && statusCode >= 400) return { status: 'DOWN', failureType: 'HTTP_4XX', error: `HTTP ${statusCode}` };
    return { status: 'DOWN', failureType: 'UNKNOWN', error: `HTTP ${statusCode ?? '?'}` };
  }

  /**
   * Public, unauthenticated view of service readiness for the /status page.
   * Deliberately sanitized: no internal hostnames, ports, or raw error strings.
   */
  async getPublicStatus(): Promise<PublicStatusSnapshot> {
    const snap = await this.getLatestCached();
    const components = snap.services.map((s) => ({
      key: s.name,
      label: PUBLIC_LABELS[s.name] ?? s.name,
      status: s.status,
      responseTimeMs: s.status === 'DOWN' ? null : s.responseTimeMs,
      lastChecked: s.lastChecked,
    }));
    const overall: PublicStatusSnapshot['overall'] =
      snap.down === 0 && snap.degraded === 0
        ? 'OPERATIONAL'
        : snap.down >= Math.ceil(components.length / 2)
          ? 'MAJOR_OUTAGE'
          : snap.down > 0
            ? 'PARTIAL_OUTAGE'
            : 'DEGRADED';
    return {
      overall,
      healthPercent: snap.healthPercent,
      components,
      checkedAt: snap.checkedAt,
    };
  }

  async getHistory(hours: number): Promise<{ serviceName: string; checkedAt: string; status: string; responseTimeMs: number | null }[]> {

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const rows = await this.prisma.serviceHealthLog.findMany({
      where: { checkedAt: { gte: since }, serviceName: { in: SERVICES.map((s) => s.name) } },
      orderBy: { checkedAt: 'asc' },
      select: { serviceName: true, checkedAt: true, status: true, responseTimeMs: true },
    });
    return rows.map((r) => ({ serviceName: r.serviceName, checkedAt: r.checkedAt.toISOString(), status: r.status, responseTimeMs: r.responseTimeMs }));
  }

  private probe(name: string, host: string, port: number, path = '/health'): Promise<ServiceProbe> {
    return new Promise((resolve) => {
      const start = Date.now();
      const url = `http://${host}:${port}${path}`;
      const req = http.request(
        { host, port, path, method: 'GET', timeout: 5000 },
        (res) => {
          const rt = Date.now() - start;
          res.resume();
          const sc = res.statusCode || 500;
          if (sc < 400) {
            const status: ServiceProbe['status'] = rt > 2000 ? 'DEGRADED' : 'UP';
            resolve({
              name, url, status,
              responseTimeMs: rt,
              lastChecked: new Date().toISOString(),
            });
          } else {
            const c = this.classifyHttpFailure(sc);
            resolve({
              name, url,
              status: c.status,
              responseTimeMs: rt,
              failureType: c.failureType,
              error: c.error,
              lastChecked: new Date().toISOString(),
            });
          }
        },
      );
      req.on('timeout', () => {
        req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
      });
      req.on('error', (err) => {
        const c = this.classifyHttpFailure(undefined, err as NodeJS.ErrnoException);
        resolve({
          name, url,
          status: c.status,
          responseTimeMs: null,
          failureType: c.failureType,
          error: c.error,
          lastChecked: new Date().toISOString(),
        });
      });
      req.end();
    });
  }
}
