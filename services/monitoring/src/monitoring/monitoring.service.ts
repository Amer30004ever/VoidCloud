import { Injectable, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { getRedis } from '../common/token-revocation';

const BLOCKED_IPS_KEY = 'ratelimit:blocked:ips';

@Injectable()
export class MonitoringService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    await this.syncActiveBlockListToRedis();
  }

  @Interval(1000 * 60 * 5)
  async refreshActiveBlockList() {
    await this.syncActiveBlockListToRedis();
  }

  private async getActiveBlockedRows() {
    const now = new Date();
    return this.prisma.ipBlockList.findMany({
      where: {
        OR: [
          { isPermanent: true },
          { expiresAt: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async syncActiveBlockListToRedis() {
    const redis = getRedis();
    if (!redis) return;

    const activeBlocks = await this.getActiveBlockedRows();
    const activeIps = new Set(activeBlocks.map((block) => block.ipAddress));
    const existing = await redis.smembers(BLOCKED_IPS_KEY);

    const toRemove = existing.filter((ip) => !activeIps.has(ip));
    if (toRemove.length) {
      await redis.srem(BLOCKED_IPS_KEY, ...toRemove);
    }

    if (activeIps.size > 0) {
      await redis.sadd(BLOCKED_IPS_KEY, ...Array.from(activeIps));
    }
  }

  clusterNodes() {
    return {
      nodes: [
        { name: 'masternode01', role: 'control-plane', cpu: 4, memoryGB: 4 },
        { name: 'workernode01', role: 'worker', cpu: 8, memoryGB: 24 },
      ],
    };
  }

  clusterPods() {
    return { pods: [], note: 'Connect in-cluster K8s API for live pod metrics' };
  }

  namespaces() {
    return { namespaces: ['voidcloud', 'kube-system', 'traefik'] };
  }

  metrics() {
    return { uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  alerts() {
    return this.prisma.alert.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  }

  createAlert(data: Record<string, unknown>) {
    return this.prisma.alert.create({ data: data as never });
  }

  async getRateLimitStats() {
    const redis = getRedis();
    if (!redis) {
      return { topIPs: [], tenantRates: [], blockedIPs: [], requestsPerMinute: 0 };
    }

    const [blockedRows, ipStats, tenantStats] = await Promise.all([
      this.getActiveBlockedRows(),
      this.collectRateLimitStats(redis, 'ratelimit:sw:ip:*', (key, count) => ({
        ip: key.replace('ratelimit:sw:ip:', ''),
        requests: count,
        blocked: false,
        country: null as string | null,
        tenantId: null,
      })),
      this.collectRateLimitStats(redis, 'ratelimit:sw:tenant:*', (key, count) => ({
        tenantId: key.replace('ratelimit:sw:tenant:', ''),
        requestsPerMin: count,
      })),
    ]);

    const blockedIPs = new Set(blockedRows.map((b) => b.ipAddress));

    const enrichedIpStats = ipStats.map((stat) => ({ ...stat, blocked: blockedIPs.has(stat.ip) }));
    enrichedIpStats.sort((a, b) => b.requests - a.requests);
    const sortedTenantStats = tenantStats.sort((a, b) => b.requestsPerMin - a.requestsPerMin);
    const totalRequests = enrichedIpStats.reduce((sum, ip) => sum + ip.requests, 0);

    return {
      topIPs: enrichedIpStats.slice(0, 50),
      tenantRates: sortedTenantStats.slice(0, 50),
      blockedIPs: blockedRows.map((b) => b.ipAddress),
      requestsPerMinute: totalRequests,
    };
  }

  private async collectRateLimitStats<T>(
    redis: Redis,
    pattern: string,
    mapper: (key: string, count: number) => T,
  ): Promise<T[]> {
    const stats: T[] = [];
    for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 1000 })) {
      const count = await redis.zcard(key);
      stats.push(mapper(key, count));
    }
    return stats;
  }

  async blockIP(ip: string, reason?: string, isPermanent = false, expiresAt?: Date) {
    const row = await this.prisma.ipBlockList.upsert({
      where: { ipAddress: ip },
      update: { reason: reason || null, isPermanent, expiresAt: expiresAt || null, blockedBy: 'admin' },
      create: { ipAddress: ip, reason: reason || null, blockedBy: 'admin', isPermanent, expiresAt: expiresAt || null },
    });

    const redis = getRedis();
    if (redis) {
      await redis.sadd(BLOCKED_IPS_KEY, ip);
    }

    return row;
  }

  async unblockIP(ip: string) {
    const redis = getRedis();
    if (redis) {
      await redis.srem(BLOCKED_IPS_KEY, ip);
    }
    return this.prisma.ipBlockList.deleteMany({ where: { ipAddress: ip } });
  }

  async getBlockedIPs() {
    return this.getActiveBlockedRows();
  }

  async trace(requestId: string) {
    const lokiUrl = process.env.LOKI_URL;
    const jaegerUrl = process.env.JAEGER_URL || process.env.TEMPO_URL;
    const lines: Array<{ timestamp: string; service: string; level: string; line: string }> = [];
    let source = 'none';
    let error: string | undefined;

    if (lokiUrl) {
      source = 'loki';
      try {
        const url = new URL('/loki/api/v1/query_range', lokiUrl);
        url.searchParams.set('query', `{correlationId="${requestId}"}`);
        url.searchParams.set('limit', '1000');
        url.searchParams.set('start', String(Date.now() - 15 * 60 * 1000));
        url.searchParams.set('end', String(Date.now()));

        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const data = (await res.json()) as { data?: { result?: Array<{ stream: Record<string, string>; values: [string, string][] }> } };
          const lokiLines = (data.data?.result ?? []).flatMap((stream) =>
            stream.values.map(([ts, line]) => ({
              timestamp: new Date(Number(ts) * 1000).toISOString(),
              service: stream.stream.service ?? stream.stream.app ?? 'unknown',
              level: stream.stream.level ?? 'info',
              line,
            })),
          );
          lokiLines.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          lines.push(...lokiLines);
        } else {
          error = `Loki responded ${res.status}`;
        }
      } catch (e: any) {
        error = e?.message ?? String(e);
      }
    }

    if (jaegerUrl) {
      try {
        const url = `${jaegerUrl.replace(/\/$/, '')}/api/traces/${encodeURIComponent(requestId)}`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const trace = (await res.json()) as { batch?: { spans?: Array<{ traceID: string; spanID: string; operationName: string; duration: number; startTime: number; tags?: Array<{ key: string; value: string }> }> } };
          const spans = trace.batch?.spans ?? [];
          for (const span of spans) {
            const tags = span.tags ?? [];
            const serviceTag = tags.find((t) => t.key === 'service.name');
            lines.push({
              timestamp: new Date(span.startTime / 1000).toISOString(),
              service: serviceTag?.value ?? 'unknown',
              level: 'trace',
              line: `${span.operationName} (${span.duration}ms) [${span.spanID}]`,
            });
          }
          lines.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          if (source === 'none') source = 'jaeger';
        } else if (!error) {
          error = `Jaeger responded ${res.status}`;
        }
      } catch (e: any) {
        if (!error) error = e?.message ?? String(e);
      }
    }

    if (!source) {
      return {
        requestId,
        source: 'placeholder',
        note: 'Deploy Loki + Jaeger to enable real trace search. Configure LOKI_URL and JAEGER_URL.',
        lines: [],
      };
    }

    return { requestId, source, lines, error };
  }
}
