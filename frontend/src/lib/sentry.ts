import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      ...(Sentry.browserTracingIntegration ? [Sentry.browserTracingIntegration()] : []),
    ],
    beforeSend(event, hint) {
      if (event.request?.cookies) {
        event.request.cookies = { ...event.request.cookies, session: '[REDACTED]' };
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
