import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { CrashLoopGuard } from './crashloop/crash-loop.guard';
import { createRateLimitMiddleware } from './common/rate-limit/middleware';
import { createCorrelationIdMiddleware, StructuredLogger } from '../../shared/logging';
import { initSentry } from '../../shared/sentry/sentry-init';
import { initTracing } from '../../shared/tracing/tracing';
import Redis from 'ioredis';
import { setupSwagger } from '../../shared/swagger/swagger.config';

const structuredLogger = new StructuredLogger('whatsapp');

let rateLimitRedis: Redis | null = null;
function getRateLimitRedis(): Redis | null {
  if (rateLimitRedis) return rateLimitRedis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  rateLimitRedis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2, enableOfflineQueue: false });
  rateLimitRedis.on('error', () => undefined);
  return rateLimitRedis;
}

async function bootstrap() {
  process.on('unhandledRejection', (reason: unknown) => {
    structuredLogger.error(`unhandledRejection: ${String(reason)}`, reason instanceof Error ? { error: { message: reason.message, stack: reason.stack } } : undefined);
  });
  process.on('uncaughtException', (err: Error) => {
    structuredLogger.error(`uncaughtException: ${err.message}`, { error: { message: err.message, stack: err.stack } });
  });

  const app = await NestFactory.create(AppModule);
  initSentry('whatsapp-service');
  initTracing('whatsapp-service');
  const rlRedis = getRateLimitRedis();
  if (rlRedis) {
    app.use(createRateLimitMiddleware(rlRedis));
  }
  app.use(createCorrelationIdMiddleware());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = process.env.PORT ?? 3007;
  setupSwagger(app, { title: 'WhatsApp Service', description: 'WhatsApp integration API', version: '1.0' });
  await app.listen(port);
  structuredLogger.log(`WhatsApp service running on port ${port}`);

  const guard = app.get(CrashLoopGuard);
  void guard;

  const shutdown = async (signal: string) => {
    structuredLogger.log(`Received ${signal}, shutting down gracefully…`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  structuredLogger.error(`Bootstrap failed: ${err?.message ?? err}`, err instanceof Error ? { error: { message: err.message, stack: err.stack } } : undefined);
  process.exit(1);
});
