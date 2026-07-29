import { Request, Response } from 'express';
import { createCorrelationIdMiddleware, getCorrelationId } from '../../../shared/logging';

describe('Correlation ID middleware (Prompt 6.1)', () => {
  const middleware = createCorrelationIdMiddleware();

  const run = async (headers: Record<string, string | undefined> = {}): Promise<{ req: Request; res: Response; next: jest.Mock }> => {
    const req = { headers } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();
    await (middleware as any)(req, res, next);
    return { req, res, next };
  };

  it('generates a UUID when no header is present', async () => {
    const { req, res } = await run();
    const id = (req as any).correlationId;
    expect(id).toBeDefined();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect((res as any).setHeader).toHaveBeenCalledWith('x-request-id', id);
  });

  it('honors an incoming X-Request-ID', async () => {
    const { req } = await run({ 'x-request-id': 'abc-123' });
    expect(getCorrelationId(req)).toBe('abc-123');
  });

  it('honors an incoming X-Correlation-ID', async () => {
    const { req } = await run({ 'x-correlation-id': 'corr-456' });
    expect(getCorrelationId(req)).toBe('corr-456');
  });

  it('prefers X-Request-ID over X-Correlation-ID when both are present', async () => {
    const { req } = await run({ 'x-request-id': 'req-1', 'x-correlation-id': 'corr-1' });
    expect(getCorrelationId(req)).toBe('req-1');
  });

  it('trims whitespace from incoming IDs', async () => {
    const { req } = await run({ 'x-request-id': '  spaced  ' });
    expect(getCorrelationId(req)).toBe('spaced');
  });

  it('ignores blank headers and generates a fresh UUID', async () => {
    const { req } = await run({ 'x-request-id': '' });
    const id = (req as any).correlationId;
    expect(id).toBeDefined();
    expect(id).not.toBe('');
  });
});
