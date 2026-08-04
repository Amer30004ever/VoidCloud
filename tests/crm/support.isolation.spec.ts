import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SupportService } from '../../services/crm/src/support/support.service';

/**
 * Support ticketing must obey the same tenant rules as CRM/VPS:
 * a non-staff caller can only ever read or reply to their own tickets,
 * and internal staff notes are never returned to the customer.
 */
describe('SupportService — tenant isolation', () => {
  const customer = { id: 'user-A', role: Role.USER };
  const agent = { id: 'agent-1', role: Role.AGENT };

  const foreignTicket = {
    id: 'ticket-B',
    userId: 'user-B',
    subject: 'Tenant B ticket',
    status: 'OPEN',
    messages: [
      { id: 'm1', body: 'customer message', internal: false },
      { id: 'm2', body: 'staff only note', internal: true },
    ],
  };

  const mkPrisma = (ticket: unknown = foreignTicket) => ({
    supportTicket: {
      findMany: jest.fn().mockResolvedValue([]),
      // findFirst honours the scoped `where`; simulate a real DB by returning
      // null whenever the caller's scope excludes the row.
      findFirst: jest.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        const t = ticket as { userId: string } | null;
        if (!t) return Promise.resolve(null);
        if (where['userId'] && where['userId'] !== t.userId) return Promise.resolve(null);
        return Promise.resolve(ticket);
      }),
      create: jest.fn().mockImplementation(({ data }: never) => Promise.resolve(data)),
      update: jest.fn().mockResolvedValue({ ...foreignTicket, status: 'RESOLVED' }),
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    supportTicketMessage: {
      create: jest.fn().mockImplementation(({ data }: never) => Promise.resolve(data)),
    },
  });

  const mk = (ticket?: unknown) => {
    const prisma = mkPrisma(ticket);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { prisma, service: new SupportService(prisma as any) };
  };

  it("hides another tenant's ticket from a customer", async () => {
    const { service, prisma } = mk();
    await expect(service.get(customer, 'ticket-B')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.supportTicket.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: customer.id }) }),
    );
  });

  it('scopes list queries to the caller for non-staff', async () => {
    const { service, prisma } = mk();
    await service.list(customer);
    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: customer.id }) }),
    );
  });

  it('does not scope list queries for staff', async () => {
    const { service, prisma } = mk();
    await service.list(agent);
    const arg = prisma.supportTicket.findMany.mock.calls[0][0];
    expect(arg.where.userId).toBeUndefined();
  });

  it('strips internal staff notes from customer reads', async () => {
    const ownTicket = { ...foreignTicket, userId: customer.id };
    const { service } = mk(ownTicket);
    const result = await service.get(customer, 'ticket-B');
    expect(result.messages).toHaveLength(1);
    expect(result.messages.every((m: { internal: boolean }) => !m.internal)).toBe(true);
  });

  it('returns internal notes to staff', async () => {
    const { service } = mk();
    const result = await service.get(agent, 'ticket-B');
    expect(result.messages).toHaveLength(2);
  });

  it("blocks replies to another tenant's ticket", async () => {
    const { service } = mk();
    await expect(service.reply(customer, 'ticket-B', 'hello')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('never lets a customer author an internal note', async () => {
    const ownTicket = { ...foreignTicket, userId: customer.id };
    const { service, prisma } = mk(ownTicket);
    await service.reply(customer, 'ticket-B', 'sneaky', true);
    const arg = prisma.supportTicketMessage.create.mock.calls[0][0];
    expect(arg.data.internal).toBe(false);
  });

  it('only lets staff change ticket status', async () => {
    const ownTicket = { ...foreignTicket, userId: customer.id };
    const { service } = mk(ownTicket);
    await expect(service.updateStatus(customer, 'ticket-B', 'RESOLVED')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('forces new tickets onto the caller id', async () => {
    const { service, prisma } = mk();
    await service.create(customer, { subject: 'Need help', body: 'It is broken' });
    const arg = prisma.supportTicket.create.mock.calls[0][0];
    expect(arg.data.userId).toBe(customer.id);
  });
});
