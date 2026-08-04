/**
 * Canonical structured logging + correlation-id utilities (Prompt 6.1).
 *
 * This is the single source of truth. All 13 services import it as
 * `../../shared/logging`. The former duplicate at the repo-root
 * `shared/logging/` package was deleted to remove the drift.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  service: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  error?: { message: string; stack?: string };
  [key: string]: unknown;
}

const isJsonEnabled = () =>
  process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';

export class StructuredLogger {
  constructor(private readonly service: string) {}

  private format(context: LogContext): string {
    if (isJsonEnabled()) {
      const payload: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        service: context.service,
        level: context.level,
        message: context.message,
      };
      if (context.correlationId) payload.correlationId = context.correlationId;
      if (context.userId) payload.userId = context.userId;
      if (context.tenantId) payload.tenantId = context.tenantId;
      if (context.error) payload.error = context.error;
      Object.assign(payload, context);
      return JSON.stringify(payload);
    }
    const prefix = `[${context.service}]`;
    const cid = context.correlationId ? ` ${context.correlationId.slice(0, 8)}` : '';
    return `${prefix}${cid} ${context.level.toUpperCase()}: ${context.message}`;
  }

  log(message: string, context?: Partial<LogContext>) {
    console.log(this.format({ service: this.service, level: 'info', message, ...context }));
  }

  warn(message: string, context?: Partial<LogContext>) {
    console.warn(this.format({ service: this.service, level: 'warn', message, ...context }));
  }

  error(message: string, context?: Partial<LogContext>) {
    console.error(this.format({ service: this.service, level: 'error', message, ...context }));
  }

  debug(message: string, context?: Partial<LogContext>) {
    console.debug(this.format({ service: this.service, level: 'debug', message, ...context }));
  }
}

const HEADER = 'x-request-id';
const ALTERNATE = 'x-correlation-id';

export function getCorrelationId(req: any): string {
  const existing = (req?.headers?.[HEADER] ?? req?.headers?.[ALTERNATE]) as string | undefined;
  if (existing && existing.trim()) return existing.trim();
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createCorrelationIdMiddleware() {
  return (req: any, res: any, next: any) => {
    const id = getCorrelationId(req);
    req.headers[HEADER] = id;
    (req as any).correlationId = id;
    res.setHeader(HEADER, id);
    next();
  };
}

export function extractCorrelationId(req: any): string | undefined {
  return (req as any)?.correlationId;
}

export function extractCorrelationIdFromHeaders(
  headers: Record<string, unknown> | undefined,
): string | undefined {
  if (!headers) return undefined;
  return (headers[HEADER] ?? headers[ALTERNATE]) as string | undefined;
}

/** Attach the correlation id to an outbound RabbitMQ/event payload. */
export function withCorrelationId(correlationId: string, payload: unknown): unknown {
  return { ...(payload as Record<string, unknown>), correlationId };
}
