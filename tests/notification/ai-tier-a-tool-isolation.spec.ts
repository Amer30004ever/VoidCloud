/**
 * Tier A (local Ollama) must be structurally incapable of executing tools.
 *
 * Two independent claims are asserted here:
 *
 *  1. A Tier A reply can never carry tool-call data, even when the *local model
 *     itself is the attacker* and returns a payload shaped exactly like an
 *     OpenAI tool_calls response. chatOllama reads only `message.content`, so
 *     the attack surface is a string, and AiToolsService.execute is never
 *     reached from that path.
 *  2. The only route that can reach execute() — POST /notification/ai/tools/execute
 *     — is JWT-guarded and ownership-gated, so Tenant A cannot use it against
 *     Tenant B's VPS.
 */
import { Role } from '@prisma/client';
import {
  AiAssistantService,
  AiContextService,
  AiToolsService,
} from '../../services/notification/src/ai/ai-assistant.service';
import { AiAssistantController } from '../../services/notification/src/ai/ai-assistant.controller';
import { JwtAuthGuard } from '../../services/notification/src/guards/jwt-auth.guard';

const TENANT_A = { id: 'user-A', role: Role.USER };
const TENANT_A_VPS = { id: 'vps-A', userId: 'user-A', status: 'RUNNING' };
const TENANT_B_VPS = { id: 'vps-B', userId: 'user-B', status: 'RUNNING' };

function build() {
  const prisma: any = {
    cloudDeployment: {
      findUnique: jest.fn(async ({ where }: any) =>
        [TENANT_A_VPS, TENANT_B_VPS].find((v) => v.id === where.id) ?? null,
      ),
      findMany: jest.fn(async ({ where }: any) =>
        where?.userId ? [TENANT_A_VPS].filter((v) => v.userId === where.userId) : [],
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
  return { prisma, tools, assistant, context };
}

describe('Tier A (Ollama) cannot reach the tool-execution path', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.AI_HOSTED_API_KEY;
  });

  it('a Tier A reply never contains toolCalls / requiresConfirmation payloads', async () => {
    // No hosted key => Tier A (local Ollama) is the only available path.
    delete process.env.AI_HOSTED_API_KEY;
    const { assistant } = build();

    // The local model is the attacker: it emits an OpenAI-style tool_calls blob.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'ok',
          tool_calls: [
            { function: { name: 'restart_vps', arguments: JSON.stringify({ vpsId: TENANT_B_VPS.id }) } },
          ],
        },
        // Also try the hosted response shape, in case anything sniffs it.
        choices: [
          {
            message: {
              tool_calls: [
                { function: { name: 'restart_vps', arguments: JSON.stringify({ vpsId: TENANT_B_VPS.id }) } },
              ],
            },
          },
        ],
      }),
    }) as never;

    const reply: any = await assistant.chat('what is my usage looking like?', TENANT_A);

    expect(reply.tier).toBe('A');
    expect(reply.toolCalls).toBeUndefined();
    expect(reply.requiresConfirmation).toBeFalsy();
    expect(reply.pendingAction).toBeUndefined();
    // The only thing carried over from the model is a plain string.
    expect(typeof reply.content).toBe('string');
    expect(JSON.stringify(reply)).not.toContain('restart_vps');
  });

  it('no Tier A response causes a VPS mutation, on any phrasing', async () => {
    delete process.env.AI_HOSTED_API_KEY;
    const { assistant, prisma } = build();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: 'calling restart_vps on vps-B now',
          tool_calls: [{ function: { name: 'restart_vps', arguments: '{"vpsId":"vps-B"}' } }],
        },
      }),
    }) as never;

    for (const msg of ['how much am I spending?', 'explain my invoice', 'what is a VPS?']) {
      await assistant.chat(msg, TENANT_A);
    }

    expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('the execute path is only reachable through the guarded controller route', async () => {
    // The tools controller carries JwtAuthGuard; there is no unauthenticated
    // surface that can dispatch a tool.
    const guards = Reflect.getMetadata('__guards__', AiAssistantController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
  });

  it('Tenant A calling /tools/execute against Tenant B VPS is refused and audited', async () => {
    const { tools, prisma, assistant, context } = build();
    const controller = new AiAssistantController(assistant, tools);

    await expect(
      controller.executeTool(TENANT_A as any, {
        toolName: 'restart_vps' as any,
        arguments: { vpsId: TENANT_B_VPS.id },
        confirmed: true,
      }),
    ).rejects.toThrow('VPS not found');

    expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
    const entry = prisma.auditLog.create.mock.calls[0][0].data;
    expect(entry.status).toBe('FAILED');
    expect(entry.userId).toBe(TENANT_A.id);
    expect(context).toBeDefined();
  });

  it('the control case still works: Tenant A executing on its OWN VPS succeeds', async () => {
    const { tools, assistant, prisma } = build();
    const controller = new AiAssistantController(assistant, tools);
    const result: any = await controller.executeTool(TENANT_A as any, {
      toolName: 'restart_vps' as any,
      arguments: { vpsId: TENANT_A_VPS.id },
      confirmed: true,
    });
    expect(result.status).toBe('queued');
    expect(prisma.cloudDeployment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TENANT_A_VPS.id } }),
    );
  });
});
