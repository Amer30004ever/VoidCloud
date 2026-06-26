import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudEmailService } from '../notifications/email.service';

export interface CreateMaintenanceDto {
  title: string;
  description: string;
  affectedServices: string[];
  startAt: string | Date;
  endAt: string | Date;
}

export interface CreateIncidentDto {
  title: string;
  description: string;
  severity: 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE';
}

export type OverallStatus =
  | 'OPERATIONAL'
  | 'DEGRADED'
  | 'PARTIAL_OUTAGE'
  | 'MAJOR_OUTAGE';

const SERVICES = ['VPS', 'API', 'Dashboard', 'Billing'] as const;

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    private email: CloudEmailService,
  ) {}

  /** Returns active maintenance window state, used by middleware/UI. */
  async isMaintenanceMode(): Promise<{
    active: boolean;
    message: string;
    endAt: Date | null;
    affectedServices: string[];
  }> {
    const now = new Date();
    const m = await this.prisma.maintenance.findFirst({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        startAt: { lte: now },
        endAt: { gte: now },
      },
      orderBy: { startAt: 'asc' },
    });
    if (!m) return { active: false, message: '', endAt: null, affectedServices: [] };
    return {
      active: true,
      message: m.title,
      endAt: m.endAt,
      affectedServices: m.affectedServices,
    };
  }

  async scheduleMaintenance(data: CreateMaintenanceDto, userId: string) {
    const m = await this.prisma.maintenance.create({
      data: {
        title: data.title,
        description: data.description,
        affectedServices: Array.isArray(data.affectedServices) ? data.affectedServices : [],
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        status: 'SCHEDULED',
        createdBy: userId,
      },
    });
    // Notify users (fire & forget)
    this.notifyMaintenanceScheduled(m).catch(() => {});
    return m;
  }

  async updateMaintenance(id: string, data: Partial<CreateMaintenanceDto> & { status?: string }) {
    const existing = await this.prisma.maintenance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Maintenance not found');
    const updated = await this.prisma.maintenance.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.affectedServices !== undefined && { affectedServices: data.affectedServices }),
        ...(data.startAt && { startAt: new Date(data.startAt) }),
        ...(data.endAt && { endAt: new Date(data.endAt) }),
        ...(data.status && { status: data.status }),
      },
    });
    if (data.status === 'IN_PROGRESS' && existing.status !== 'IN_PROGRESS') {
      this.notifyMaintenanceStarted(updated).catch(() => {});
    }
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      this.notifyMaintenanceCompleted(updated).catch(() => {});
    }
    return updated;
  }

  async deleteMaintenance(id: string) {
    await this.prisma.maintenance.delete({ where: { id } });
    return { ok: true };
  }

  async listMaintenance(filter?: { upcoming?: boolean }) {
    const where = filter?.upcoming
      ? { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }
      : undefined;
    return this.prisma.maintenance.findMany({
      where,
      orderBy: { startAt: 'desc' },
      take: 100,
    });
  }

  async createIncident(data: CreateIncidentDto) {
    const incident = await this.prisma.incident.create({
      data: {
        title: data.title,
        description: data.description,
        severity: data.severity,
        status: 'INVESTIGATING',
        updates: {
          create: { message: data.description, status: 'INVESTIGATING' },
        },
      },
      include: { updates: { orderBy: { createdAt: 'desc' } } },
    });
    this.notifyIncidentCreated(incident).catch(() => {});
    return incident;
  }

  async addIncidentUpdate(id: string, message: string, status: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    await this.prisma.incidentUpdate.create({
      data: { incidentId: id, message, status },
    });
    await this.prisma.incident.update({ where: { id }, data: { status } });
    return this.prisma.incident.findUnique({
      where: { id },
      include: { updates: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async resolveIncident(id: string, message?: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    await this.prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        message: message || 'Incident resolved.',
        status: 'RESOLVED',
      },
    });
    const updated = await this.prisma.incident.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
      include: { updates: { orderBy: { createdAt: 'desc' } } },
    });
    this.notifyIncidentResolved(updated).catch(() => {});
    return updated;
  }

  async listIncidents(opts?: { active?: boolean; limit?: number }) {
    const where = opts?.active ? { status: { not: 'RESOLVED' } } : undefined;
    return this.prisma.incident.findMany({
      where,
      include: { updates: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
    });
  }

  async getStatusPage(): Promise<{
    status: OverallStatus;
    incidents: any[];
    maintenance: any[];
    uptime: Record<string, number>;
  }> {
    const [incidents, maintenance] = await Promise.all([
      this.listIncidents({ active: true, limit: 20 }),
      this.prisma.maintenance.findMany({
        where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
        orderBy: { startAt: 'asc' },
        take: 20,
      }),
    ]);

    let status: OverallStatus = 'OPERATIONAL';
    for (const i of incidents) {
      if (i.severity === 'MAJOR_OUTAGE') status = 'MAJOR_OUTAGE';
      else if (i.severity === 'PARTIAL_OUTAGE' && status !== 'MAJOR_OUTAGE')
        status = 'PARTIAL_OUTAGE';
      else if (i.severity === 'DEGRADED' && status === 'OPERATIONAL')
        status = 'DEGRADED';
    }

    // Uptime calc: rough — 30-day window, subtract incident durations per service.
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - windowMs);
    const recent = await this.prisma.incident.findMany({
      where: { createdAt: { gte: since } },
    });
    const uptime: Record<string, number> = {};
    for (const svc of SERVICES) {
      const downtime = recent
        .filter((i) => i.status === 'RESOLVED' && i.resolvedAt)
        .reduce((acc, i) => acc + (i.resolvedAt!.getTime() - i.createdAt.getTime()), 0);
      uptime[svc] = Math.max(0, Math.min(100, 100 - (downtime / windowMs) * 100));
    }

    return { status, incidents, maintenance, uptime };
  }

  // ----- notification helpers -----
  private async notifyAffected(subject: string, body: string) {
    // To keep cost low we only email admins by default; full broadcast can be opted in.
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] as any } },
      select: { email: true },
      take: 200,
    });
    for (const u of users) {
      await this.email.maintenance(u.email, subject, body).catch(() => {});
    }
  }

  private async notifyMaintenanceScheduled(m: { title: string; description: string; startAt: Date; endAt: Date }) {
    return this.notifyAffected(
      `[AmerCloud] Scheduled maintenance: ${m.title}`,
      `Maintenance scheduled from ${m.startAt.toISOString()} to ${m.endAt.toISOString()}.\n\n${m.description}`,
    );
  }
  private async notifyMaintenanceStarted(m: { title: string; description: string }) {
    return this.notifyAffected(
      `[AmerCloud] Maintenance started: ${m.title}`,
      `Maintenance has started.\n\n${m.description}`,
    );
  }
  private async notifyMaintenanceCompleted(m: { title: string }) {
    return this.notifyAffected(
      `[AmerCloud] Maintenance completed: ${m.title}`,
      `Maintenance has been completed. All systems should be operational.`,
    );
  }
  private async notifyIncidentCreated(i: { title: string; severity: string; description: string }) {
    return this.notifyAffected(
      `[AmerCloud] Incident (${i.severity}): ${i.title}`,
      `A new incident has been reported.\n\n${i.description}`,
    );
  }
  private async notifyIncidentResolved(i: { title: string }) {
    return this.notifyAffected(
      `[AmerCloud] Incident resolved: ${i.title}`,
      `The incident has been resolved.`,
    );
  }
}
