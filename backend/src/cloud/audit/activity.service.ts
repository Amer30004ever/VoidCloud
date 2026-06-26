import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGE'
  | 'EMAIL_CHANGE'
  | 'PROFILE_UPDATE'
  | '2FA_ENABLE'
  | '2FA_DISABLE'
  | 'VPS_CREATE'
  | 'VPS_START'
  | 'VPS_STOP'
  | 'VPS_RESTART'
  | 'VPS_DELETE'
  | 'VPS_UPDATE'
  | 'ROLE_CHANGE'
  | 'USER_SUSPEND'
  | 'USER_ACTIVATE'
  | 'USER_DELETE'
  | 'IMPERSONATE_START'
  | 'IMPERSONATE_END'
  | 'PAYMENT'
  | 'REFUND';

export interface LogInput {
  userId: string;
  action: ActivityAction | string;
  adminId?: string | null;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: 'SUCCESS' | 'FAILED';
  resource?: string | null;
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async log(input: LogInput) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          adminId: input.adminId ?? undefined,
          action: input.action,
          details: input.details ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
          userAgent: input.userAgent ?? undefined,
          resource: input.resource ?? undefined,
          status: input.status ?? 'SUCCESS',
        },
      });
    } catch {
      // Never let audit logging break the caller.
      return null;
    }
  }

  async listForUser(
    userId: string,
    opts: { page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, opts.limit ?? 50);
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);
    return { rows, total, page, limit };
  }

  async listAll(
    opts: {
      userId?: string;
      action?: string;
      from?: string;
      to?: string;
      ipAddress?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(500, opts.limit ?? 100);
    const where: any = {};
    if (opts.userId) where.userId = opts.userId;
    if (opts.action) where.action = opts.action;
    if (opts.ipAddress) where.ipAddress = { contains: opts.ipAddress };
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          admin: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { rows, total, page, limit };
  }

  async exportCsv(
    opts: Parameters<ActivityService['listAll']>[0] = {},
  ): Promise<string> {
    const { rows } = await this.listAll({ ...opts, limit: 5000, page: 1 });
    const header = [
      'timestamp',
      'user_email',
      'user_name',
      'action',
      'status',
      'ip_address',
      'user_agent',
      'admin_email',
      'details',
    ];
    const esc = (v: any) => {
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      const e = s.replace(/"/g, '""');
      return /[",\n]/.test(e) ? `"${e}"` : e;
    };
    const lines = rows.map((r: any) =>
      [
        r.createdAt.toISOString(),
        r.user?.email ?? '',
        r.user?.name ?? '',
        r.action,
        r.status,
        r.ipAddress ?? '',
        r.userAgent ?? '',
        r.admin?.email ?? '',
        r.details ?? '',
      ]
        .map(esc)
        .join(','),
    );
    return [header.join(','), ...lines].join('\n');
  }
}
