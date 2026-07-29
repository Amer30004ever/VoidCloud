import { Role } from '@prisma/client';
import { AiAssistantService, AiContextService, AiToolsService } from './ai-assistant.service';

describe('AiToolsService', () => {
  const userA = { id: 'user-A', role: Role.USER };
  const userB = { id: 'user-B', role: Role.USER };

  const OTHER_VPS = { id: 'vps-B', userId: userB.id, status: 'RUNNING', name: 'tenant-b' };
  const OWNED_VPS = { id: 'vps-A', userId: userA.id, status: 'RUNNING', name: 'tenant-a' };

  const mkPrisma = () => ({
    cloudDeployment: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([OWNED_VPS]),
      update: jest.fn().mockResolvedValue({ ...OWNED_VPS, status: 'RESTARTING' }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ creditBalance: 100 }),
    },
    cloudInvoice: {
      findMany: jest.fn().mockResolvedValue([{ amountUSD: 25 }]),
    },
    notification: {
      create: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  });

  const mkTools = () => {
    const prisma = mkPrisma();
    const context = new AiContextService(prisma as never);
    const tools = new AiToolsService(prisma as never, context);
    return { prisma, tools };
  };

  it('vps_status returns real counts from database', async () => {
    const { tools } = mkTools();
    await expect(tools.vpsStatus(userA)).resolves.toEqual({
      count: 1,
      running: true,
      runningCount: 1,
    });
  });

  it('restart_vps enforces ownership — cannot restart another tenant VPS', async () => {
    const { prisma, tools } = mkTools();
    prisma.cloudDeployment.findUnique.mockResolvedValue(OTHER_VPS);
    await expect(
      tools.execute('restart_vps', { vpsId: OTHER_VPS.id }, userA, true),
    ).rejects.toThrow('VPS not found');
    expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
  });

  it('restart_vps queues restart for owned VPS and writes audit log', async () => {
    const { prisma, tools } = mkTools();
    prisma.cloudDeployment.findUnique.mockResolvedValue(OWNED_VPS);
    await expect(
      tools.execute('restart_vps', { vpsId: OWNED_VPS.id }, userA, true),
    ).resolves.toMatchObject({ status: 'queued', vpsId: OWNED_VPS.id });
    expect(prisma.cloudDeployment.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'AI_TOOL_RESTART_VPS' }) }),
    );
  });

  it('list_invoices returns real invoice summary', async () => {
    const { tools } = mkTools();
    await expect(tools.listInvoices(userA)).resolves.toEqual({ count: 1, lastAmount: 25 });
  });

  it('requires confirmation for destructive tools', async () => {
    const { tools } = mkTools();
    await expect(
      tools.execute('restart_vps', { vpsId: OWNED_VPS.id }, userA, false),
    ).resolves.toMatchObject({ status: 'pending_confirmation' });
  });
});

describe('AiAssistantService', () => {
  it('falls back gracefully when Ollama is unavailable', async () => {
    const context = { gather: jest.fn().mockResolvedValue({
      vpsCount: 0, runningVps: 0, creditBalance: 0, invoiceCount: 0, lastInvoiceAmount: 0,
    }) } as never;
    const tools = {} as AiToolsService;
    const assistant = new AiAssistantService(context, tools);
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('connection refused')) as never;
    const result = await assistant.chat('why is my vps slow?', { id: 'u1', role: Role.USER });
    expect(result.tier).toBe('A');
    expect(result.content).toContain('unavailable');
    global.fetch = originalFetch;
  });
});
