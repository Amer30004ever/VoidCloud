import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval, Cron, CronExpression } from '@nestjs/schedule';
import { HealthCheckService } from './health-check.service';
import { PrismaService } from '../prisma/prisma.service';

const RAW_RETENTION_MS = 48 * 60 * 60 * 1000; // keep raw rows for 48h

/**
 * Server-side scheduler for the microservice health probes and log retention.
 *
 * - Every 30s: run `probeAllAndPersist` — the frontend's GET /monitoring/services/health
 *   just reads the resulting cache, so N open admin tabs still produce 1 round of pings.
 * - Every hour (offset 05): roll up any ServiceHealthLog rows older than 48h into
 *   hourly aggregates and delete the raw rows to bound table growth.
 */
@Injectable()
export class HealthCheckScheduler implements OnModuleInit {
  private readonly logger = new Logger(HealthCheckScheduler.name);

  constructor(
    private readonly svc: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Warm the cache on boot so the first frontend read isn't a cold miss.
    this.svc.probeAllAndPersist().catch((e) => this.logger.warn(`initial probe failed: ${e?.message ?? e}`));
  }

  @Interval('service-health-probe', 30_000)
  async tick() {
    try {
      await this.svc.probeAllAndPersist();
    } catch (e: any) {
      this.logger.warn(`scheduled probe failed: ${e?.message ?? e}`);
    }
  }

  /**
   * Hourly retention: collapse >48h-old ServiceHealthLog rows into
   * ServiceHealthHourlyRollup, then delete the raw rows.
   * Idempotent: uses (serviceName, hourStart) upsert so re-runs don't
   * double-count. Public so tests can invoke it directly.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async rollup() {
    const cutoff = new Date(Date.now() - RAW_RETENTION_MS);
    const rows = await this.prisma.serviceHealthLog.findMany({
      where: { checkedAt: { lt: cutoff } },
      orderBy: { checkedAt: 'asc' },
    });
    if (rows.length === 0) return { rolledUp: 0, buckets: 0 };

    interface Bucket {
      serviceName: string;
      hourStart: Date;
      count: number;
      up: number;
      degraded: number;
      down: number;
      rtSum: number;
      rtCount: number;
    }
    const buckets = new Map<string, Bucket>();
    for (const r of rows) {
      const d = new Date(r.checkedAt);
      d.setUTCMinutes(0, 0, 0);
      const key = `${r.serviceName}|${d.toISOString()}`;
      let b = buckets.get(key);
      if (!b) {
        b = { serviceName: r.serviceName, hourStart: d, count: 0, up: 0, degraded: 0, down: 0, rtSum: 0, rtCount: 0 };
        buckets.set(key, b);
      }
      b.count++;
      if (r.status === 'UP') b.up++;
      else if (r.status === 'DEGRADED') b.degraded++;
      else b.down++;
      if (typeof r.responseTimeMs === 'number') {
        b.rtSum += r.responseTimeMs;
        b.rtCount++;
      }
    }

    for (const b of buckets.values()) {
      const uptime = ((b.up + 0.5 * b.degraded) / Math.max(1, b.count)) * 100;
      await this.prisma.serviceHealthHourlyRollup.upsert({
        where: { serviceName_hourStart: { serviceName: b.serviceName, hourStart: b.hourStart } },
        create: {
          serviceName: b.serviceName,
          hourStart: b.hourStart,
          sampleCount: b.count,
          upCount: b.up,
          degradedCount: b.degraded,
          downCount: b.down,
          avgResponseMs: b.rtCount ? Math.round(b.rtSum / b.rtCount) : null,
          uptimePercent: uptime,
        },
        update: {
          // Merge: same-hour re-runs (e.g. late-arriving raw rows) just add on top.
          sampleCount: { increment: b.count },
          upCount: { increment: b.up },
          degradedCount: { increment: b.degraded },
          downCount: { increment: b.down },
          // avgResponseMs is a rough new-batch value; retention correctness
          // only requires bounded storage, not perfect merged averages.
          avgResponseMs: b.rtCount ? Math.round(b.rtSum / b.rtCount) : undefined,
          uptimePercent: uptime,
        },
      });
    }

    const del = await this.prisma.serviceHealthLog.deleteMany({
      where: { checkedAt: { lt: cutoff } },
    });
    this.logger.log(`retention rollup: ${del.count} raw rows collapsed into ${buckets.size} hourly buckets`);
    return { rolledUp: del.count, buckets: buckets.size };
  }
}
