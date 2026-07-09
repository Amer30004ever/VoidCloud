import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Real-time health probes for all 13 microservices.
 * Each probe hits GET /health with a 5s timeout and records the outcome.
 */
export interface ServiceProbe {
  name: string;
  url: string; // internal cluster URL
  status: 'UP' | 'DEGRADED' | 'DOWN';
  responseTimeMs: number | null;
  error?: string;
  lastChecked: string;
}

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

  constructor(private readonly prisma: PrismaService) {}

  async probeAll(): Promise<{
    services: ServiceProbe[];
    healthPercent: number;
    up: number;
    down: number;
    degraded: number;
    checkedAt: string;
  }> {
    const results = await Promise.all(
      SERVICES.map((s) => this.probe(s.name, s.host, s.port, s.path)),
    );
    // persist snapshots — best-effort
    await Promise.all(
      results.map((r) =>
        this.prisma.serviceHealthLog
          .create({
            data: {
              serviceName: r.name,
              status: r.status,
              responseTimeMs: r.responseTimeMs ?? null,
              errorMessage: r.error ?? null,
              uptimePercentage: r.status === 'UP' ? 100 : r.status === 'DEGRADED' ? 50 : 0,
            } as any,
          })
          .catch(() => null),
      ),
    );
    const up = results.filter((r) => r.status === 'UP').length;
    const down = results.filter((r) => r.status === 'DOWN').length;
    const degraded = results.filter((r) => r.status === 'DEGRADED').length;
    const healthPercent = Math.round(((up + 0.5 * degraded) / results.length) * 100);
    return { services: results, healthPercent, up, down, degraded, checkedAt: new Date().toISOString() };
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
          const ok = (res.statusCode || 500) < 400;
          const status: ServiceProbe['status'] = ok ? (rt > 2000 ? 'DEGRADED' : 'UP') : 'DOWN';
          resolve({ name, url, status, responseTimeMs: rt, lastChecked: new Date().toISOString() });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ name, url, status: 'DOWN', responseTimeMs: null, error: 'timeout', lastChecked: new Date().toISOString() });
      });
      req.on('error', (err) => {
        resolve({ name, url, status: 'DOWN', responseTimeMs: null, error: err.message, lastChecked: new Date().toISOString() });
      });
      req.end();
    });
  }
}
