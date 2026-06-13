import { Injectable, Logger, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudDeploymentsService } from '../cloud-deployments.service';
import { VpsAlertType, VpsAlertOperator } from '@prisma/client';

export interface CreateAlertRuleDto {
  vpsId?: string | null;
  name: string;
  type: VpsAlertType;
  operator: VpsAlertOperator;
  threshold: number;
  duration?: number | null;
  cooldown?: number;
  enabled?: boolean;
}

@Injectable()
export class VpsAlertService implements OnModuleInit {
  private readonly logger = new Logger(VpsAlertService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private deployments: CloudDeploymentsService,
  ) {}

  onModuleInit() {
    // Lightweight periodic checker (every 5 minutes). Skip if disabled via env.
    if (process.env.VPS_ALERT_CHECKS_DISABLED === '1') return;
    this.timer = setInterval(() => {
      this.runChecks().catch((e) => this.logger.warn(`alert check failed: ${e.message}`));
    }, 5 * 60 * 1000);
  }

  // ---------- CRUD ----------

  async listForUser(userId: string) {
    return this.prisma.vpsAlertRule.findMany({
      where: { userId },
      include: {
        vps: { select: { id: true, name: true, status: true } },
        notifications: { take: 5, orderBy: { triggeredAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForVps(userId: string, vpsId: string) {
    await this.assertOwnsVps(userId, vpsId);
    return this.prisma.vpsAlertRule.findMany({
      where: { userId, vpsId },
      include: { notifications: { take: 5, orderBy: { triggeredAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(userId: string, dto: CreateAlertRuleDto) {
    if (dto.vpsId) await this.assertOwnsVps(userId, dto.vpsId);
    return this.prisma.vpsAlertRule.create({
      data: {
        userId,
        vpsId: dto.vpsId ?? null,
        name: dto.name,
        type: dto.type,
        operator: dto.operator,
        threshold: dto.threshold,
        duration: dto.duration ?? null,
        cooldown: dto.cooldown ?? 30,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async updateRule(userId: string, ruleId: string, dto: Partial<CreateAlertRuleDto>) {
    const rule = await this.prisma.vpsAlertRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.userId !== userId) throw new NotFoundException('Alert rule not found');
    return this.prisma.vpsAlertRule.update({
      where: { id: ruleId },
      data: {
        name: dto.name ?? undefined,
        type: dto.type ?? undefined,
        operator: dto.operator ?? undefined,
        threshold: dto.threshold ?? undefined,
        duration: dto.duration === undefined ? undefined : dto.duration,
        cooldown: dto.cooldown ?? undefined,
        enabled: dto.enabled ?? undefined,
      },
    });
  }

  async deleteRule(userId: string, ruleId: string) {
    const rule = await this.prisma.vpsAlertRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.userId !== userId) throw new NotFoundException('Alert rule not found');
    await this.prisma.vpsAlertRule.delete({ where: { id: ruleId } });
    return { ok: true };
  }

  // ---------- Metrics ----------

  async currentMetrics(userId: string, vpsId: string) {
    await this.assertOwnsVps(userId, vpsId);
    const u = await this.deployments.vpsUsage(userId, vpsId);
    return {
      CPU: u.cpuPercent,
      RAM: u.ramPercent,
      DISK: u.diskPercent,
      BANDWIDTH: ((u.networkRx ?? 0) + (u.networkTx ?? 0)) / 1024,
      UPTIME: u.uptime ?? 0,
    };
  }

  // ---------- Check loop ----------

  async runChecks() {
    const rules = await this.prisma.vpsAlertRule.findMany({
      where: { enabled: true, vpsId: { not: null } },
    });
    let triggered = 0;
    for (const rule of rules) {
      try {
        if (await this.evaluateRule(rule)) triggered++;
      } catch (e: any) {
        this.logger.debug(`rule ${rule.id} eval failed: ${e.message}`);
      }
    }
    return { checked: rules.length, triggered };
  }

  private async evaluateRule(rule: { id: string; userId: string; vpsId: string | null; type: VpsAlertType; operator: VpsAlertOperator; threshold: number; cooldown: number }) {
    if (!rule.vpsId) return false;
    const metrics = await this.currentMetrics(rule.userId, rule.vpsId);
    const value = metrics[rule.type] ?? 0;
    if (!this.compare(value, rule.operator, rule.threshold)) return false;

    // Cooldown check.
    const cooldownCutoff = new Date(Date.now() - rule.cooldown * 60_000);
    const recent = await this.prisma.vpsAlertNotification.findFirst({
      where: { alertRuleId: rule.id, triggeredAt: { gt: cooldownCutoff } },
    });
    if (recent) return false;

    const message = `${rule.type} ${this.opSymbol(rule.operator)} ${rule.threshold} (current: ${value.toFixed(1)})`;
    await this.prisma.vpsAlertNotification.create({
      data: { alertRuleId: rule.id, vpsId: rule.vpsId, value, message, status: 'TRIGGERED' },
    });
    await this.prisma.vpsAlertRule.update({
      where: { id: rule.id },
      data: { lastTriggeredAt: new Date() },
    });
    return true;
  }

  private compare(value: number, op: VpsAlertOperator, threshold: number): boolean {
    switch (op) {
      case 'GREATER_THAN': return value > threshold;
      case 'LESS_THAN': return value < threshold;
      case 'EQUALS': return Math.abs(value - threshold) < 0.1;
    }
  }

  private opSymbol(op: VpsAlertOperator) {
    return op === 'GREATER_THAN' ? '>' : op === 'LESS_THAN' ? '<' : '=';
  }

  private async assertOwnsVps(userId: string, vpsId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
  }
}
