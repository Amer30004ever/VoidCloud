import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createRateLimitMiddleware } from './common/rate-limit/middleware';
import { getRedis } from './common/token-revocation';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createCorrelationIdMiddleware, StructuredLogger } from '../../shared/logging';
import { initTracing } from '../../shared/tracing/tracing';
import { initSentry } from '../../shared/sentry/sentry-init';
import { setupSwagger } from '../../shared/swagger/swagger.config';

const structuredLogger = new StructuredLogger('monitoring');

async function bootstrap() {
  initSentry('monitoring-service');
  initTracing('monitoring-service');
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
  app.useWebSocketAdapter(new IoAdapter());
  const port = process.env.PORT ?? 3010;
  setupSwagger(app, { title: 'Monitoring Service', description: 'Monitoring and metrics API', version: '1.0' });
  await app.listen(port);
  structuredLogger.log(`monitoring Service running on port ${port}`);
}

bootstrap();
