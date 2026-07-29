import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createRateLimitMiddleware } from './common/rate-limit/middleware';
import { getRedis } from './common/token-revocation';
import { createCorrelationIdMiddleware, StructuredLogger } from '../../shared/logging';
import { initTracing } from '../../shared/tracing/tracing';
import { initSentry } from '../../shared/sentry/sentry-init';
import { setupSwagger } from '../../shared/swagger/swagger.config';

const structuredLogger = new StructuredLogger('email');

function validateEnvVars() {
  const required = ['SMTP_HOST', 'SMTP_USER'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    structuredLogger.error(`Missing: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function bootstrap() {
  initSentry('email-service');
  initTracing('email-service');
  validateEnvVars();
  const app = await NestFactory.create(AppModule);
  const rateLimitRedis = getRedis();
  if (rateLimitRedis) {
    app.use(createRateLimitMiddleware(rateLimitRedis));
  }
  app.use(createCorrelationIdMiddleware());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3008);
  setupSwagger(app, { title: 'Email Service', description: 'Email sending API', version: '1.0' });
  structuredLogger.log('Email Service running on port 3008');
}

bootstrap();
