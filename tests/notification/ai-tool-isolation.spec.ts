/**
 * Tier 5.15/5.16 — AI assistant tool-calling: adversarial cross-tenant isolation.
 *
 * Named acceptance criterion: "Tenant A's session cannot trigger a tool-call
 * action on Tenant B's VPS." Exercised against the REAL AiToolsService and the
 * REAL AiAssistantService tool-dispatch path (hosted tier), with the model
 * itself acting as the attacker — it returns a tool_call naming Tenant B's VPS.
 */
import { Role } from '@prisma/client';
import {
  AiAssistantService,
  AiContextService,
  AiToolsService,
} from '../../services/notification/src/ai/ai-assistant.service';

const TENANT_A = { id: 'user-A', role: Role.USER };
const TENANT_B_VPS = { id: 'vps-B', userId: 'user-B', status: 'RUNNING' };
const TENANT_A_VPS = { id: 'vps-A', userId: 'user-A', status: 'RUNNING' };
const SUPER = { id: 'root', role: Role.SUPER_ADMIN };

function build() {
  const prisma: any = {
    cloudDeployment: {
      findUnique: jest.fn(async ({ where }: any) =>
        [TENANT_A_VPS, TENANT_B_VPS].find((v) => v.id === where.id) ?? null,
      ),
      findMany: jest.fn(async ({ where }: any) =>
        where?.userId ? [TENANT_A_VPS].filter((v) => v.userId === where.userId) : [TENANT_A_VPS, TENANT_B_VPS],
      ),
      update: jest.fn(async ({ data }: any) => ({ ...TENANT_B_VPS, ...data })),
    },
    user: { findUnique: jest.fn().mockResolvedValue({ creditBalance: 10 }) },
    cloudInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    notification: { create: jest.fn().mockResolvedValue({ id: 'n1' }) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const context = new AiContextService(prisma);
  const tools = new AiToolsService(prisma, context);
  const assistant = new AiAssistantService(context, tools);
  return { prisma, tools, assistant };
}

describe('AI tool-calling — cross-tenant isolation', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.AI_HOSTED_API_KEY;
  });

  it('Tenant A cannot restart Tenant B VPS via a direct tool call', async () => {
    const { tools, prisma } = build();

    await expect(
      tools.execute('restart_vps', { vpsId: TENANT_B_VPS.id }, TENANT_A, true),
    ).rejects.toThrow('VPS not found');

    // No state change on the victim's instance.
    expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
  });

  it('the refused cross-tenant attempt is written to the audit log as FAILED', async () => {
    const { tools, prisma } = build();

    await tools
      .execute('restart_vps', { vpsId: TENANT_B_VPS.id }, TENANT_A, true)
      .catch(() => undefined);

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const entry = prisma.auditLog.create.mock.calls[0][0].data;
    expect(entry.status).toBe('FAILED');
    expect(entry.userId).toBe(TENANT_A.id);
    expect(entry.action).toBe('AI_TOOL_RESTART_VPS');
  });

  it('the enumeration answer is identical for "not yours" and "does not exist"', async () => {
    const { tools } = build();
    const foreign = await tools
      .execute('restart_vps', { vpsId: TENANT_B_VPS.id }, TENANT_A, true)
      .catch((e) => String(e.message));
    const missing = await tools
      .execute('restart_vps', { vpsId: 'vps-does-not-exist' }, TENANT_A, true)
      .catch((e) => String(e.message));
    expect(foreign).toBe(missing);
  });

  it('a model-issued tool_call naming Tenant B VPS cannot execute on Tenant A session', async () => {
    process.env.AI_HOSTED_API_KEY = 'test-key';
    const { assistant, prisma } = build();

    // The hosted model is the attacker here: it emits a tool call for vps-B.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  function: {
                    name: 'restart_vps',
                    arguments: JSON.stringify({ vpsId: TENANT_B_VPS.id }),
                  },
                },
              ],
            },
          },
        ],
      }),
    }) as never;

    const reply: any = await assistant.chat('please restart my server', TENANT_A);

    // Destructive tool calls must stop at confirmation, and even then the
    // ownership check below is what actually protects Tenant B.
    expect(reply.requiresConfirmation).toBe(true);
    expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();

    // Confirming does not help the attacker either.
    await expect(
      new AiToolsService(prisma, new AiContextService(prisma)).execute(
        'restart_vps',
        { vpsId: TENANT_B_VPS.id },
        TENANT_A,
        true,
      ),
    ).rejects.toThrow('VPS not found');
    expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
  });

  it('Tenant A can restart its OWN VPS (the control case)', async () => {
    const { tools, prisma } = build();
    const result: any = await tools.execute('restart_vps', { vpsId: TENANT_A_VPS.id }, TENANT_A, true);
    expect(result.status).toBe('queued');
    expect(prisma.cloudDeployment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TENANT_A_VPS.id }, data: { status: 'RESTARTING' } }),
    );
  });

  it('AI context for Tenant A is scoped to Tenant A deployments', async () => {
    const { prisma } = build();
    const ctx = new AiContextService(prisma);
    await ctx.gather(TENANT_A);
    expect(prisma.cloudDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: TENANT_A.id } }),
    );
  });

  it('SUPER_ADMIN is the only identity with an unscoped context', async () => {
    const { prisma } = build();
    await new AiContextService(prisma).gather(SUPER);
    expect(prisma.cloudDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('destructive tools refuse to run at all without explicit confirmation', async () => {
    const { tools, prisma } = build();
    const pending: any = await tools.execute('restart_vps', { vpsId: TENANT_A_VPS.id }, TENANT_A, false);
    expect(pending.status).toBe('pending_confirmation');
    expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
  });
});
