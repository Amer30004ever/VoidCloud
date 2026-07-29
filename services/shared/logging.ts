import { Logger } from '@nestjs/common';

export class StructuredLogger {
  constructor(private readonly service: string) {}

  private prefix(level: string): string {
    return `[${level}] [${this.service}]`;
  }

  log(message: string, ...args: unknown[]): void {
    Logger.log(message, this.prefix('INFO'), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    Logger.error(message, this.prefix('ERROR'), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    Logger.warn(message, this.prefix('WARN'), ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    Logger.debug(message, this.prefix('DEBUG'), ...args);
  }
}

export function createCorrelationIdMiddleware() {
  return (req: any, res: any, next: any) => {
    const existing = req.headers['x-request-id'] || req.headers['x-correlation-id'];
    const id = typeof existing === 'string' && existing.trim() ? existing.trim() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
  };
}

export function extractCorrelationIdFromHeaders(headers: Record<string, unknown> | undefined): string | undefined {
  if (!headers) return undefined;
  return (headers['x-request-id'] ?? headers['x-correlation-id']) as string | undefined;
}

export function withCorrelationId(correlationId: string, payload: unknown): unknown {
  return { ...(payload as Record<string, unknown>), correlationId };
}
