import { Request, Response, NextFunction } from 'express';

const HEADER = 'x-request-id';
const ALTERNATE = 'x-correlation-id';

export function getCorrelationId(req: Request): string {
  const existing = (req.headers[HEADER] ?? req.headers[ALTERNATE]) as string | undefined;
  if (existing && existing.trim()) return existing.trim();
  return crypto.randomUUID();
}

export function createCorrelationIdMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = getCorrelationId(req);
    (req as any).correlationId = id;
    res.setHeader(HEADER, id);
    next();
  };
}

export function extractCorrelationId(req: Request): string | undefined {
  return (req as any).correlationId;
}
