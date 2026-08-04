import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeDeadlines,
  evaluateSla,
  escalatedPriority,
  targetFor,
  type SlaEvaluation,
} from './sla';

export interface AuthUser {
  id: string;
  role: Role;
  impersonatedBy?: string;
}

const STAFF_ROLES: Role[] = [Role.AGENT, Role.SUPER_ADMIN];
const OPEN_STATUSES = ['OPEN', 'PENDING'];
const VALID_STATUS = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];
const VALID_PRIORITY = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const VALID_CATEGORY = ['GENERAL', 'BILLING', 'VPS', 'ABUSE'];

export interface CreateTicketInput {
  subject: string;
  body: string;
  category?: string;
  priority?: string;
  resourceId?: string;
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(user: AuthUser) {
    return STAFF_ROLES.includes(user.role);
  }

  /** Non-staff callers can only ever see their own tickets. */
  private scope(user: AuthUser) {
    return this.isStaff(user) ? {} : { userId: user.id };
  }

  async list(user: AuthUser, status?: string) {
    const where: Record<string, unknown> = { ...this.scope(user) };
    if (status === 'open') where['status'] = { in: OPEN_STATUSES };
    else if (status && VALID_STATUS.includes(status)) where['status'] = status;

    return this.prisma.supportTicket.findMany({
      where: where as never,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 200,
      include: { _count: { select: { messages: true } } },
    });
  }

  async get(user: AuthUser, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, ...this.scope(user) } as never,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Internal staff notes are never exposed to the requester.
    if (!this.isStaff(user)) {
      return { ...ticket, messages: ticket.messages.filter((m) => !m.internal) };
    }
    return ticket;
  }

  async create(user: AuthUser, input: CreateTicketInput) {
    const subject = (input.subject ?? '').trim();
    const body = (input.body ?? '').trim();
    if (subject.length < 3) throw new ForbiddenException('Subject is too short');
    if (body.length < 3) throw new ForbiddenException('Message is too short');

    const priority = VALID_PRIORITY.includes(input.priority ?? '')
      ? input.priority!
      : 'NORMAL';
    const now = new Date();
    const { firstResponseDueAt, resolutionDueAt } = computeDeadlines(priority, now);

    return this.prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: subject.slice(0, 200),
        category: VALID_CATEGORY.includes(input.category ?? '') ? input.category! : 'GENERAL',
        priority,
        firstResponseDueAt,
        resolutionDueAt,
        resourceId: input.resourceId ?? null,
        messages: {
          create: {
            authorId: user.id,
            authorRole: user.role,
            body: body.slice(0, 8000),
            internal: false,
          },
        },
      },
      include: { messages: true },
    });
  }

  async reply(user: AuthUser, id: string, body: string, internal = false) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, ...this.scope(user) } as never,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'CLOSED') throw new ForbiddenException('Ticket is closed');

    const text = (body ?? '').trim();
    if (text.length < 1) throw new ForbiddenException('Message is empty');

    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        authorId: user.id,
        authorRole: user.role,
        body: text.slice(0, 8000),
        internal: this.isStaff(user) ? Boolean(internal) : false,
      },
    });

    const staffReply = this.isStaff(user) && !internal;
    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: this.isStaff(user) ? 'PENDING' : 'OPEN',
        // First public staff reply stops the first-response SLA clock.
        ...(staffReply && !(ticket as { firstRespondedAt?: Date | null }).firstRespondedAt
          ? { firstRespondedAt: new Date() }
          : {}),
      } as never,
    });

    return message;
  }

  /** Status / assignment changes are staff-only, except the owner closing. */
  async updateStatus(user: AuthUser, id: string, status: string, assigneeId?: string) {
    if (!VALID_STATUS.includes(status)) throw new ForbiddenException('Invalid status');
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, ...this.scope(user) } as never,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!this.isStaff(user) && status !== 'CLOSED') {
      throw new ForbiddenException('Only support staff can change ticket status');
    }

    const data: Record<string, unknown> = { status };
    if (status === 'CLOSED' || status === 'RESOLVED') data['closedAt'] = new Date();
    if (this.isStaff(user) && assigneeId !== undefined) data['assigneeId'] = assigneeId || null;

    const updated = await this.prisma.supportTicket.update({ where: { id }, data: data as never });

    await this.prisma.auditLog.create({
      data: {
        action: 'SUPPORT_TICKET_STATUS_CHANGED',
        adminId: user.id,
        resource: id,
        details: {
          from: ticket.status,
          to: status,
          ...(user.impersonatedBy ? { impersonatedBy: user.impersonatedBy } : {}),
        } as never,
      } as never,
    });

    return updated;
  }

  async stats(user: AuthUser) {
    const where = this.scope(user) as never;
    const [open, pending, resolved, closed] = await Promise.all([
      this.prisma.supportTicket.count({ where: { ...(where as object), status: 'OPEN' } as never }),
      this.prisma.supportTicket.count({
        where: { ...(where as object), status: 'PENDING' } as never,
      }),
      this.prisma.supportTicket.count({
        where: { ...(where as object), status: 'RESOLVED' } as never,
      }),
      this.prisma.supportTicket.count({
        where: { ...(where as object), status: 'CLOSED' } as never,
      }),
    ]);
    const breached = await this.prisma.supportTicket.count({
      where: { ...(where as object), slaBreached: true } as never,
    });
    return {
      open,
      pending,
      resolved,
      closed,
      slaBreached: breached,
      total: open + pending + resolved + closed,
    };
  }

  /** SLA position of a single ticket (visible to the owner and to staff). */
  async sla(user: AuthUser, id: string): Promise<SlaEvaluation & { target: ReturnType<typeof targetFor> }> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, ...this.scope(user) } as never,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return {
      ...evaluateSla(ticket as never),
      target: targetFor((ticket as { priority: string }).priority),
    };
  }

  /**
   * Sweep open tickets, flag SLA breaches and escalate at-risk/breached ones.
   * Escalation bumps priority, clears a stale assignee so it re-enters the
   * unassigned queue, and writes an audit entry. Idempotent per level.
   */
  async runSlaSweep(now: Date = new Date()) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { status: { in: OPEN_STATUSES } } as never,
      take: 500,
    });

    let escalated = 0;
    let breached = 0;

    for (const ticket of tickets as unknown as Array<Record<string, any>>) {
      const evaluation = evaluateSla(ticket as never, now);
      const data: Record<string, unknown> = {};

      if (evaluation.breached && !ticket['slaBreached']) {
        data['slaBreached'] = true;
        breached += 1;
      }
      if (evaluation.shouldEscalate) {
        data['escalatedAt'] = now;
        data['escalationLevel'] = Number(ticket['escalationLevel'] ?? 0) + 1;
        data['priority'] = escalatedPriority(ticket['priority']);
        escalated += 1;
      }
      if (Object.keys(data).length === 0) continue;

      await this.prisma.supportTicket.update({
        where: { id: ticket['id'] },
        data: data as never,
      });

      await this.prisma.auditLog.create({
        data: {
          action: evaluation.shouldEscalate
            ? 'SUPPORT_TICKET_ESCALATED'
            : 'SUPPORT_TICKET_SLA_BREACHED',
          resource: ticket['id'],
          details: {
            priority: ticket['priority'],
            newPriority: data['priority'] ?? ticket['priority'],
            reason: evaluation.reason ?? 'sla_breach',
            minutesRemaining: evaluation.minutesRemaining,
          } as never,
        } as never,
      });
    }

    return { scanned: tickets.length, escalated, breached };
  }
}
