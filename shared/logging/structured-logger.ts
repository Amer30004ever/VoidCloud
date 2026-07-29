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

const isJsonEnabled = () => process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';

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
