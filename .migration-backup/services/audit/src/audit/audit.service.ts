import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  getLogs(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        action: filters.action,
        resource: filters.resource,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    });
  }

  getUserLogs(userId: string, limit = 50) {
    return this.getLogs({ userId, limit });
  }

  exportLogs(filters: Record<string, unknown>) {
    return this.getLogs(filters as never);
  }

  createLog(data: {
    action: string;
    userId?: string;
    userEmail?: string;
    resource?: string;
    details?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...data,
        details: data.details as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
