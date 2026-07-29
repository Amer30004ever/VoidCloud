import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { createRateLimitMiddleware } from './common/rate-limit/middleware';
import { getRedis } from './common/token-revocation';
import { createCorrelationIdMiddleware, StructuredLogger } from '../../shared/logging';
import { initTracing } from '../../shared/tracing/tracing';
import { initSentry } from '../../shared/sentry/sentry-init';
import { setupSwagger } from '../../shared/swagger/swagger.config';

const structuredLogger = new StructuredLogger('sub2api');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  initSentry('sub2api-service');
  initTracing('sub2api-service');
  const configService = app.get(ConfigService);
  const rateLimitRedis = getRedis();
  if (rateLimitRedis) {
    app.use(createRateLimitMiddleware(rateLimitRedis));
  }
  app.use(createCorrelationIdMiddleware());

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  const port = configService.get('PORT', 3013);
  setupSwagger(app, { title: 'Sub2API Service', description: 'Subscription-to-API gateway', version: '1.0' });
  await app.listen(port);
  structuredLogger.log(`Sub2API Service running on port ${port}`);
  structuredLogger.log(`Health check: http://localhost:${port}/api/v1/health`);
}

bootstrap();
