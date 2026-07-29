import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { rabbitConfig, VPS_PROVISION_QUEUE } from './vps/rabbitmq.config';
import { createRateLimitMiddleware } from './common/rate-limit/middleware';
import { getRedis } from './common/token-revocation';
import { createCorrelationIdMiddleware, StructuredLogger } from '../../shared/logging';
import { initTracing } from '../../shared/tracing/tracing';
import { initSentry } from '../../shared/sentry/sentry-init';
import { setupSwagger } from '../../shared/swagger/swagger.config';

const structuredLogger = new StructuredLogger('vps');

async function bootstrap() {
  initSentry('vps-service');
  initTracing('vps-service');
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

  app.connectMicroservice<MicroserviceOptions>(rabbitConfig(VPS_PROVISION_QUEUE));

  const port = process.env.PORT ?? 3004;
  setupSwagger(app, { title: 'VPS Service', description: 'VPS provisioning and management API', version: '1.0' });
  await app.listen(port);
  await app.startAllMicroservices();
  structuredLogger.log(`vps Service running on port ${port} (RMQ consumer on "${VPS_PROVISION_QUEUE}")`);

  const shutdown = async (signal: string) => {
    structuredLogger.log(`Received ${signal}, shutting down gracefully…`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap();
