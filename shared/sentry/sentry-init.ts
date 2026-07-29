import * as Sentry from '@sentry/node';

export function initSentry(serviceName: string): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const environment = process.env.NODE_ENV ?? 'development';
  const release = process.env.OTEL_SERVICE_VERSION ?? '0.0.0';

  Sentry.init({
    dsn,
    environment,
    release,
    serverName: serviceName,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      if (event.request) {
        const headers = event.request.headers;
        if (headers) {
          const sensitive = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
          for (const key of Object.keys(headers)) {
            if (sensitive.includes(key.toLowerCase())) {
              headers[key] = '[REDACTED]';
            }
          }
        }
      }
      if (event.extra) {
        const sensitiveKeys = Object.keys(event.extra).filter((k) => /password|secret|token|key|credential/i.test(k));
        for (const k of sensitiveKeys) {
          event.extra[k] = '[REDACTED]';
        }
      }
      return event;
    },
  });
}

export { Sentry };
