/**
 * Tier 5.16 — usage advisor must be model-generated from real context, and must
 * honestly label itself when it falls back to rules.
 */
import { Role } from '@prisma/client';
import { AiAssistantService, AiContextService, AiToolsService } from '../../services/notification/src/ai/ai-assistant.service';

const user = { id: 'user-A', role: Role.USER };

function build(deployments: Array<{ status: string }>, creditBalance: number, invoices: Array<{ amountUSD: number }>) {
  const prisma: any = {
    cloudDeployment: { findMany: jest.fn().mockResolvedValue(deployments), findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue({ creditBalance }) },
    cloudInvoice: { findMany: jest.fn().mockResolvedValue(invoices) },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const context = new AiContextService(prisma);
  const tools = new AiToolsService(prisma, context);
  return new AiAssistantService(context, tools);
}

describe('Tier 5.16 — AiAssistantService.usageAdvice', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    delete process.env.AI_HOSTED_API_KEY;
    delete process.env.OPENAI_API_KEY;
    jest.resetModules();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns model output and source="llm" when the model answers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'Stop your two idle instances.' } }),
    }) as never;

    const service = build([{ status: 'RUNNING' }, { status: 'STOPPED' }], 50, [{ amountUSD: 20 }]);
    const result = await service.usageAdvice(user);

    expect(result.source).toBe('llm');
    expect(result.advice).toBe('Stop your two idle instances.');
    expect(result.context).toMatchObject({ vpsCount: 2, runningVps: 1, creditBalance: 50 });
  });

  it('sends the real tenant numbers to the model, not placeholders', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'ok' } }),
    });
    global.fetch = fetchMock as never;

    const service = build([{ status: 'RUNNING' }, { status: 'RUNNING' }, { status: 'STOPPED' }], 7, [{ amountUSD: 99 }]);
    await service.usageAdvice(user);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    const systemPrompt = body.messages[0].content;
    expect(systemPrompt).toContain('VPS count: 3, running: 2, stopped: 1');
    expect(systemPrompt).toContain('Credit balance: 7');
    expect(systemPrompt).toContain('last amount USD: 99');
  });

  it('falls back to a labelled heuristic when the model is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;

    const service = build([{ status: 'RUNNING' }, { status: 'STOPPED' }, { status: 'STOPPED' }], 0, []);
    const result = await service.usageAdvice(user);

    expect(result.source).toBe('heuristic');
    expect(result.advice).toContain('2 of your 3 VPS instances are not running');
    expect(result.advice).toContain('credit balance is empty');
  });

  it('heuristic reports a healthy account when nothing needs attention', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as never;

    const service = build([{ status: 'RUNNING' }], 500, [{ amountUSD: 20 }]);
    const result = await service.usageAdvice(user);

    expect(result.source).toBe('heuristic');
    expect(result.advice).toContain('nothing needs attention');
  });
});
