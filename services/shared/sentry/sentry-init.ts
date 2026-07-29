import * as Sentry from '@sentry/node';

export function initSentry(serviceName: string) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    serverName: serviceName,
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) : 0.1,
    beforeSend(event, hint) {
      if (event.request) {
        const headers = event.request.headers || {};
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('cookie') || key.toLowerCase().includes('x-api-key')) {
            headers[key] = '[REDACTED]';
          }
        }
        if (event.request.data && typeof event.request.data === 'object') {
          const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'access_token', 'refresh_token'];
          const redact = (obj: Record<string, unknown>): Record<string, unknown> => {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(obj)) {
              if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) out[k] = '[REDACTED]';
              else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = redact(v as Record<string, unknown>);
              else out[k] = v;
            }
            return out;
          };
          event.request.data = redact(event.request.data as Record<string, unknown>);
        }
      }
      if (event.extra) {
        for (const [key, value] of Object.entries(event.extra)) {
          if (typeof value === 'string' && (value.includes('token') || value.includes('secret') || value.includes('password'))) {
            event.extra[key] = '[REDACTED]';
          }
        }
      }
      return event;
    },
  });
}

export { Sentry };
