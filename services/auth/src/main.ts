import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createRateLimitMiddleware } from './common/rate-limit/middleware';
import { getRedis } from './common/token-revocation';
import { createCorrelationIdMiddleware, StructuredLogger } from '../../shared/logging';
import { initTracing } from '../../shared/tracing/tracing';
import { initSentry } from '../../shared/sentry/sentry-init';
import { setupSwagger } from '../../shared/swagger/swagger.config';
import { OidcProviderService } from './oidc/oidc-provider.service';

const structuredLogger = new StructuredLogger('auth');

async function bootstrap() {
  initSentry('auth-service');
  initTracing('auth-service');
  const required = [
    'JWT_SECRET',
    'DATABASE_URL',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
  ];
  const missing = required.filter(
    (key) =>
      !process.env[key] || process.env[key]?.startsWith('your_'),
  );
  if (missing.length > 0) {
    structuredLogger.error(`Missing: ${missing.join(', ')}`);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);
  const rateLimitRedis = getRedis();
  if (rateLimitRedis) {
    app.use(createRateLimitMiddleware(rateLimitRedis));
  }
  app.use(createCorrelationIdMiddleware());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: ['https://voidcloud.cc.cd', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  const port = process.env.PORT ?? 3001;

  const oidcService = app.get(OidcProviderService);
  const oidcCallback = await oidcService.getCallback();
  if (oidcCallback) {
    const router = (app as any).getHttpAdapter().getInstance();
    router.use('/oidc', oidcCallback);
    structuredLogger.log('OIDC provider mounted at /oidc');
  } else {
    structuredLogger.warn('OIDC provider callback not available');
  }

  await app.listen(port);
  structuredLogger.log(`Auth Service running on port ${port}`);
}

bootstrap();
