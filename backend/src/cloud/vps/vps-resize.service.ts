import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../audit/activity.service';

type Plan = { id: string; name: string; cpuLimit: number; memoryLimit: number; storageLimit: number; priceUSD: number; priceEGP: number };

function score(p: Pick<Plan, 'cpuLimit' | 'memoryLimit' | 'storageLimit'>) {
  return p.cpuLimit * 1000 + p.memoryLimit + p.storageLimit / 10;
}

@Injectable()
export class VPSResizeService {
  constructor(private prisma: PrismaService, private activity: ActivityService) {}

  private async loadVps(vpsId: string, userId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  private async currentPlan(vps: { cpu: number; memory: number; storage: number }) {
    const plans = await this.prisma.cloudPlan.findMany({ where: { isActive: true } });
    return plans.find(
      (p) => p.cpuLimit === vps.cpu && p.memoryLimit === vps.memory && p.storageLimit === vps.storage,
    ) ?? null;
  }

  async getAvailableUpgrades(vpsId: string, userId: string) {
    const vps = await this.loadVps(vpsId, userId);
    const plans = await this.prisma.cloudPlan.findMany({ where: { isActive: true }, orderBy: { priceUSD: 'asc' } });
    const current = await this.currentPlan(vps);
    const currentScore = current ? score(current) : score({ cpuLimit: vps.cpu, memoryLimit: vps.memory, storageLimit: vps.storage });
    return {
      current,
      upgrades: plans.filter((p) => score(p) > currentScore),
      downgrades: plans.filter((p) => score(p) < currentScore),
    };
  }

  async calculateProratedPrice(vpsId: string, userId: string, newPlanId: string) {
    const vps = await this.loadVps(vpsId, userId);
    const newPlan = await this.prisma.cloudPlan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) throw new NotFoundException('Plan not found');
    const current = await this.currentPlan(vps);

    const CYCLE_DAYS = 30;
    const anchor = vps.provisionedAt ?? vps.createdAt;
    const elapsedMs = Date.now() - new Date(anchor).getTime();
    const daysIntoCycle = Math.floor((elapsedMs / 86_400_000) % CYCLE_DAYS);
    const daysLeft = Math.max(0, CYCLE_DAYS - daysIntoCycle);

    const currentUSD = current?.priceUSD ?? 0;
    const currentEGP = current?.priceEGP ?? 0;
    const diffUSD = newPlan.priceUSD - currentUSD;
    const diffEGP = newPlan.priceEGP - currentEGP;
    const proratedUSD = Math.round((diffUSD * daysLeft / CYCLE_DAYS) * 100) / 100;
    const proratedEGP = Math.round((diffEGP * daysLeft / CYCLE_DAYS) * 100) / 100;

    return {
      daysLeft,
      cycleDays: CYCLE_DAYS,
      currentPlan: current,
      newPlan,
      amountUSD: proratedUSD,
      amountEGP: proratedEGP,
      credit: proratedUSD < 0,
      isUpgrade: score(newPlan) > (current ? score(current) : 0),
    };
  }

  async liveResizeSupported(vpsId: string, userId: string) {
    const vps = await this.loadVps(vpsId, userId);
    // Stub: live resize requires a running container; downscaling storage requires downtime.
    return { supported: vps.status === 'RUNNING', requiresReboot: false };
  }

  async resizeVPS(vpsId: string, newPlanId: string, userId: string, confirmPrice: boolean) {
    if (!confirmPrice) throw new BadRequestException('Price confirmation required');
    const vps = await this.loadVps(vpsId, userId);
    const newPlan = await this.prisma.cloudPlan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) throw new NotFoundException('Plan not found');
    if (vps.cpu === newPlan.cpuLimit && vps.memory === newPlan.memoryLimit && vps.storage === newPlan.storageLimit) {
      throw new BadRequestException('VPS already on this plan');
    }

    const quote = await this.calculateProratedPrice(vpsId, userId, newPlanId);

    // TODO: call Proxmox API to resize container (cpu/memory hot-plug, storage growth).
    const updated = await this.prisma.cloudDeployment.update({
      where: { id: vpsId },
      data: { cpu: newPlan.cpuLimit, memory: newPlan.memoryLimit, storage: newPlan.storageLimit },
    });

    if (quote.amountUSD !== 0) {
      await this.prisma.cloudInvoice.create({
        data: {
          userId,
          number: `RSZ-${Date.now()}`,
          amountUSD: Math.abs(quote.amountUSD),
          amountEGP: Math.abs(quote.amountEGP),
          currency: 'USD',
          status: quote.credit ? 'PAID' : 'PENDING',
          description: `${quote.isUpgrade ? 'Upgrade' : 'Downgrade'} ${vps.name} → ${newPlan.name} (prorated ${quote.daysLeft}/${quote.cycleDays} days)`,
          dueDate: new Date(Date.now() + 7 * 86_400_000),
          metadata: { vpsId, newPlanId, prorated: true, credit: quote.credit },
        },
      });
    }

    await this.activity.log({
      userId,
      action: 'VPS_RESIZE',
      resource: vpsId,
      details: { newPlanId, newPlan: newPlan.name, amountUSD: quote.amountUSD, isUpgrade: quote.isUpgrade },
    });

    return updated;
  }
}
