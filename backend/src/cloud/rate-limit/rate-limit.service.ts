import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AlertPrefs { threshold: number; enabled: boolean }

const DEFAULT_LIMIT = 1000; // per hour, per user
const DEFAULT_ALERT: AlertPrefs = { threshold: 80, enabled: false };

@Injectable()
export class RateLimitService {
  constructor(private prisma: PrismaService) {}

  /** Fetch current per-endpoint windows + an overall hourly window. */
  async getUserRateLimits(userId: string) {
    const now = new Date();

    // Active (non-expired) per-endpoint windows
    const rows = await this.prisma.aPIRateLimit.findMany({
      where: { userId, resetAt: { gt: now } },
      orderBy: { resetAt: 'asc' },
      take: 50,
    });

    // Overall = sum of requests across all rate-limit rows in the last hour
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recent = await this.prisma.aPIRateLimit.findMany({
      where: { userId, createdAt: { gte: hourAgo } },
    });
    const used = recent.reduce((s, r) => s + (r.limit - r.remaining), 0);
    const resetAt = new Date(now.getTime() + 60 * 60 * 1000);

    return {
      limits: rows.map((r) => ({
        endpoint: r.endpoint,
        method: r.method,
        period: r.period,
        limit: r.limit,
        remaining: r.remaining,
        resetAt: r.resetAt,
      })),
      overall: {
        limit: DEFAULT_LIMIT,
        remaining: Math.max(0, DEFAULT_LIMIT - used),
        resetAt,
      },
    };
  }

  async getUsageHistory(userId: string, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.aPIRateLimit.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { endpoint: true, limit: true, remaining: true, createdAt: true },
    });

    const dayMap = new Map<string, number>();
    const epMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dayMap.set(d, 0);
    }
    for (const r of rows) {
      const used = Math.max(1, r.limit - r.remaining);
      const d = r.createdAt.toISOString().slice(0, 10);
      dayMap.set(d, (dayMap.get(d) ?? 0) + used);
      epMap.set(r.endpoint, (epMap.get(r.endpoint) ?? 0) + used);
    }
    const daily = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const byEndpoint = Array.from(epMap.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return { daily, byEndpoint };
  }

  async getAlertThresholds(userId: string): Promise<AlertPrefs> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
    const prefs = (u?.notificationPrefs ?? {}) as Record<string, unknown>;
    const rl = (prefs.rateLimitAlert ?? {}) as Partial<AlertPrefs>;
    return {
      threshold: typeof rl.threshold === 'number' ? rl.threshold : DEFAULT_ALERT.threshold,
      enabled: typeof rl.enabled === 'boolean' ? rl.enabled : DEFAULT_ALERT.enabled,
    };
  }

  async setAlertThreshold(userId: string, threshold: number, enabled: boolean) {
    const t = Math.max(1, Math.min(100, Math.round(threshold)));
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
    const prefs = (u?.notificationPrefs ?? {}) as Record<string, unknown>;
    prefs.rateLimitAlert = { threshold: t, enabled };
    await this.prisma.user.update({ where: { id: userId }, data: { notificationPrefs: prefs as never } });
    return { threshold: t, enabled };
  }
}
