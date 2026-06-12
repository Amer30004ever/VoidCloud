import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditAction =
  | 'PLAN_CHANGE' | 'SUSPEND' | 'ACTIVATE' | 'REFUND'
  | 'OVERRIDE_LIMITS' | 'EXTEND_TRIAL' | 'DELETE_USER' | 'BROADCAST';

@Injectable()
export class CloudAuditService {
  constructor(private prisma: PrismaService) {}

  log(adminId: string, action: AuditAction, targetId?: string, oldValue?: any, newValue?: any, ipAddress?: string) {
    return this.prisma.cloudAuditLog.create({
      data: { adminId, action, targetId, oldValue: oldValue ?? undefined, newValue: newValue ?? undefined, ipAddress },
    });
  }

  list(opts: { adminId?: string; targetId?: string; action?: string; limit?: number } = {}) {
    return this.prisma.cloudAuditLog.findMany({
      where: {
        adminId: opts.adminId,
        targetId: opts.targetId,
        action: opts.action,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts.limit ?? 100, 500),
    });
  }
}
