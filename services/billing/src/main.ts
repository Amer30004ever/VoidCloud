import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createRateLimitMiddleware } from './common/rate-limit/middleware';
import { getRedis } from './common/token-revocation';
import { createCorrelationIdMiddleware, StructuredLogger } from '../../shared/logging';
import { initTracing } from '../../shared/tracing/tracing';
import { initSentry } from '../../shared/sentry/sentry-init';
import { setupSwagger } from '../../shared/swagger/swagger.config';

const structuredLogger = new StructuredLogger('billing');

async function bootstrap() {
  initSentry('billing-service');
  initTracing('billing-service');
  const app = await NestFactory.create(AppModule);
  const rateLimitRedis = getRedis();
  if (rateLimitRedis) {
    app.use(createRateLimitMiddleware(rateLimitRedis));
  }
  app.use(createCorrelationIdMiddleware());
  app.use('/api/v1/billing/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use('/api/v1/billing/webhooks/paypal', express.raw({ type: '*/*' }));
  app.use('/api/v1/billing/webhooks/paymob', express.raw({ type: '*/*' }));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = process.env.PORT ?? 3005;
  setupSwagger(app, { title: 'Billing Service', description: 'Billing and payments API', version: '1.0' });
  await app.listen(port);
  structuredLogger.log(`billing Service running on port ${port}`);
}

bootstrap();
