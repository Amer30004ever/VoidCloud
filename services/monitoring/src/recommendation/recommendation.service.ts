import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface MetricBucket {
  cpu: number[];
  ram: number[];
  disk: number[];
}

const WINDOW_DAYS = 7;
const WARNING_THRESHOLD = 85;
const CRITICAL_THRESHOLD = 90;

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateRecommendations(vpsId: string) {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60_000);
    const metrics = await this.prisma.usageMetric.findMany({
      where: { vpsId, recordedAt: { gte: since } },
    });

    const bucket: MetricBucket = { cpu: [], ram: [], disk: [] };
    for (const m of metrics) {
      if (m.metricType === 'cpu_percent') bucket.cpu.push(m.value);
      else if (m.metricType === 'ram_percent') bucket.ram.push(m.value);
      else if (m.metricType === 'disk_percent') bucket.disk.push(m.value);
    }

    const vps = await this.prisma.cloudDeployment.findUnique({
      where: { id: vpsId },
      select: { cpu: true, memory: true, storage: true },
    });
    if (!vps) return [];

    const recommendations: Array<{ type: string; message: string; severity: string; currentValue: number; suggestedValue: number; unit: string }> = [];

    for (const [metricType, values, currentVal, unit] of [
      ['cpu', bucket.cpu, vps.cpu, 'cores'],
      ['ram', bucket.ram, vps.memory, 'MB'],
      ['disk', bucket.disk, vps.storage, 'GB'],
    ] as const) {
      if (values.length === 0) continue;
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      if (avg > CRITICAL_THRESHOLD) {
        const suggested = this.nextTier(currentVal);
        recommendations.push({
          type: `${metricType}_scaling`,
          message: `Critical: average ${metricType.toUpperCase()} usage over the last ${WINDOW_DAYS} days is ${avg.toFixed(1)}%. Immediate upgrade recommended.`,
          severity: 'critical',
          currentValue: currentVal,
          suggestedValue: suggested,
          unit,
        });
      } else if (avg > WARNING_THRESHOLD) {
        const suggested = this.nextTier(currentVal);
        recommendations.push({
          type: `${metricType}_scaling`,
          message: `Warning: average ${metricType.toUpperCase()} usage over the last ${WINDOW_DAYS} days is ${avg.toFixed(1)}%. Consider upgrading.`,
          severity: 'warning',
          currentValue: currentVal,
          suggestedValue: suggested,
          unit,
        });
      }
    }

    const created = [];
    for (const rec of recommendations) {
      const existing = await this.prisma.vpsRecommendation.findFirst({
        where: { vpsId, type: rec.type, acknowledged: false },
      });
      if (existing) continue;
      const row = await this.prisma.vpsRecommendation.create({
        data: {
          vpsId,
          type: rec.type,
          message: rec.message,
          severity: rec.severity,
          currentValue: rec.currentValue,
          suggestedValue: rec.suggestedValue,
          unit: rec.unit,
        },
      });
      created.push(row);
      this.logger.warn(`Recommendation created for VPS ${vpsId}: ${rec.type} (${rec.severity})`);
    }
    return created;
  }

  async generateForAllActive() {
    const vpsList = await this.prisma.cloudDeployment.findMany({
      where: { status: 'RUNNING' },
      select: { id: true },
    });
    const results = [];
    for (const vps of vpsList) {
      results.push(...(await this.generateRecommendations(vps.id)));
    }
    return results;
  }

  async listForVps(vpsId: string) {
    return this.prisma.vpsRecommendation.findMany({
      where: { vpsId, acknowledged: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll() {
    return this.prisma.vpsRecommendation.findMany({
      where: { acknowledged: false },
      orderBy: { createdAt: 'desc' },
      include: { vps: { select: { id: true, name: true, userId: true } } },
    });
  }

  async acknowledge(id: string) {
    return this.prisma.vpsRecommendation.update({
      where: { id },
      data: { acknowledged: true },
    });
  }

  private nextTier(current: number): number {
    if (current < 1) return 2;
    if (current < 2) return 4;
    if (current < 4) return 8;
    return Math.ceil(current * 2);
  }
}
