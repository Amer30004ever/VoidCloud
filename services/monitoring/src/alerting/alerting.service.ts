import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthCheckService } from '../health-check/health-check.service';
import { sendSlackAlert } from '../../../shared/slack/slack-notifier';
import Redis from 'ioredis';

export interface VpsProbe {
  vpsId: string;
  name: string;
  ipv4Address: string | null;
  userId: string;
  status: 'REACHABLE' | 'UNREACHABLE';
  failureType?: 'TIMEOUT' | 'NETWORK' | 'PROXMOX_STOPPED' | 'UNKNOWN';
  responseTimeMs: number | null;
  errorMessage?: string;
}

const CONSECUTIVE_FAILURE_THRESHOLD = 2;
const VPS_CHECK_PORTS = [22, 80, 443];
const INFRA_ALERT_COOLDOWN = 5 * 60 * 1000;

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private consecutiveFailures = new Map<string, number>();
  private lastAlerted = new Map<string, number>();
  private infraRedis: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthCheck: HealthCheckService,
  ) {}

  async checkPlatformHealth(): Promise<void> {
    const snapshot = await this.healthCheck.getLatestCached();

    if (snapshot.healthPercent < 50) {
      const key = 'platform:health-percent';
      const lastAlert = this.lastAlerted.get(key) ?? 0;
      if (Date.now() - lastAlert > INFRA_ALERT_COOLDOWN) {
        await sendSlackAlert({
          title: `Platform health critical: ${snapshot.healthPercent}%`,
          message: `${snapshot.down} of ${snapshot.services.length} services are DOWN.`,
          fields: [
            { title: 'Health %', value: `${snapshot.healthPercent}%` },
            { title: 'Down services', value: snapshot.down.toString() },
            { title: 'Degraded', value: snapshot.degraded.toString() },
          ],
          actions: [
            { text: 'Open monitoring dashboard', url: `${process.env.APP_URL ?? 'https://voidcloud.cc.cd'}/voidcloud/admin/monitoring` },
          ],
        });
        this.lastAlerted.set(key, Date.now());
      }
    }

    for (const svc of snapshot.services.filter((s) => s.status === 'DOWN')) {
      const key = `platform:${svc.name}`;
      const count = (this.consecutiveFailures.get(key) ?? 0) + 1;
      this.consecutiveFailures.set(key, count);

      if (count >= CONSECUTIVE_FAILURE_THRESHOLD) {
        const lastAlert = this.lastAlerted.get(key) ?? 0;
        if (Date.now() - lastAlert > INFRA_ALERT_COOLDOWN) {
          await sendSlackAlert({
            title: `Platform service DOWN: ${svc.name}`,
            message: `${svc.name} has been unreachable for ${count} consecutive checks.\nFailure: ${svc.failureType ?? 'UNKNOWN'}\nError: ${svc.error ?? 'none'}`,
            fields: [
              { title: 'Service', value: svc.name },
              { title: 'Failure type', value: svc.failureType ?? 'UNKNOWN' },
              { title: 'Consecutive failures', value: String(count) },
            ],
            actions: [
              { text: 'Open monitoring dashboard', url: `${process.env.APP_URL ?? 'https://voidcloud.cc.cd'}/voidcloud/admin/monitoring` },
            ],
          });
          this.lastAlerted.set(key, Date.now());
        }
      }
    }

    for (const svc of snapshot.services.filter((s) => s.status !== 'DOWN')) {
      this.consecutiveFailures.delete(`platform:${svc.name}`);
    }
  }

  async checkInfrastructure(): Promise<void> {
    const checks = await Promise.allSettled([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkRabbitMq(),
    ]);

    const names = ['Postgres', 'Redis', 'RabbitMQ'];
    for (let i = 0; i < checks.length; i++) {
      const result = checks[i];
      if (result.status === 'rejected') {
        const key = `infra:${names[i]}`;
        const lastAlert = this.lastAlerted.get(key) ?? 0;
        if (Date.now() - lastAlert > INFRA_ALERT_COOLDOWN) {
          await sendSlackAlert({
            title: `Infrastructure unreachable: ${names[i]}`,
            message: `${names[i]} connectivity check failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
            fields: [{ title: 'Service', value: names[i] }],
            actions: [
              { text: 'Open monitoring dashboard', url: `${process.env.APP_URL ?? 'https://voidcloud.cc.cd'}/voidcloud/admin/monitoring` },
            ],
          });
          this.lastAlerted.set(key, Date.now());
        }
        this.consecutiveFailures.set(key, (this.consecutiveFailures.get(key) ?? 0) + 1);
      } else {
        this.consecutiveFailures.delete(`infra:${names[i]}`);
      }
    }
  }

  private async checkPostgres(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkRedis(): Promise<void> {
    if (!this.infraRedis) {
      const url = process.env.REDIS_URL ?? 'redis://redis:6379';
      this.infraRedis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1, connectTimeout: 3000 });
    }
    await this.infraRedis.ping();
  }

  private async checkRabbitMq(): Promise<void> {
    const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
    const port = Number(process.env.RABBITMQ_PORT ?? 5672);
    await this.tcpConnect(host, port, 3000);
  }

  private async tcpConnect(host: string, port: number, timeout: number): Promise<void> {
    const net = await import('net');
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let settled = false;
      const done = (err?: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        err ? reject(err) : resolve();
      };
      socket.setTimeout(timeout);
      socket.once('timeout', () => done(new Error('TCP timeout')));
      socket.once('error', (err: Error) => done(err));
      socket.connect(port, host, () => done());
    });
  }

  async checkVpsHealth(): Promise<void> {
    const activeVps = await this.prisma.cloudDeployment.findMany({
      where: {
        status: { in: ['RUNNING', 'STARTING', 'PROVISIONING', 'DEPLOYING'] },
        suspendedAt: null,
        networkSuspendedAt: null,
        terminatedAt: null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    for (const vps of activeVps) {
      if (!vps.ipv4Address) continue;

      const probe = await this.probeVps(vps);
      await this.prisma.vpsHealthLog.create({
        data: {
          vpsId: vps.id,
          status: probe.status,
          failureType: probe.failureType,
          responseTimeMs: probe.responseTimeMs ?? undefined,
          errorMessage: probe.errorMessage,
        },
      });

      if (probe.status === 'UNREACHABLE') {
        const key = `vps:${vps.id}`;
        const count = (this.consecutiveFailures.get(key) ?? 0) + 1;
        this.consecutiveFailures.set(key, count);

        if (count >= CONSECUTIVE_FAILURE_THRESHOLD) {
          const lastAlert = this.lastAlerted.get(key) ?? 0;
          if (Date.now() - lastAlert > 10 * 60 * 1000) {
            const adminUrl = `${process.env.APP_URL ?? 'https://voidcloud.cc.cd'}/voidcloud/admin/vps/${vps.id}`;
            await sendSlackAlert({
              title: `VPS down: ${vps.name}`,
              message: `Tenant VPS is unreachable.\nIP: ${vps.ipv4Address}\nUser: ${vps.user?.name ?? vps.userId}\nConsecutive failures: ${count}`,
              fields: [
                { title: 'VPS', value: vps.name },
                { title: 'IP', value: vps.ipv4Address },
                { title: 'Tenant', value: vps.user?.name ?? vps.userId },
                { title: 'Tenant ID', value: vps.userId },
                { title: 'Failure', value: probe.failureType ?? 'UNKNOWN' },
              ],
              actions: [
                { text: 'View VPS in dashboard', url: adminUrl },
              ],
            });
            this.lastAlerted.set(key, Date.now());
          }
        }
      } else {
        this.consecutiveFailures.delete(`vps:${vps.id}`);
      }
    }
  }

  private async probeVps(vps: { id: string; name: string; ipv4Address: string; userId: string }): Promise<VpsProbe> {
    const start = Date.now();
    for (const port of VPS_CHECK_PORTS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        await fetch(`http://${vps.ipv4Address}:${port}/`, {
          signal: controller.signal as any,
          method: 'HEAD',
        });
        clearTimeout(timeout);
        return {
          vpsId: vps.id,
          name: vps.name,
          ipv4Address: vps.ipv4Address,
          userId: vps.userId,
          status: 'REACHABLE',
          responseTimeMs: Date.now() - start,
        };
      } catch {
        // try next port
      }
    }

    return {
      vpsId: vps.id,
      name: vps.name,
      ipv4Address: vps.ipv4Address,
      userId: vps.userId,
      status: 'UNREACHABLE',
      failureType: 'TIMEOUT',
      responseTimeMs: null,
      errorMessage: 'All probe ports failed',
    };
  }
}
