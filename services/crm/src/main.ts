import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { createRateLimitMiddleware } from './common/rate-limit/middleware';
import { getRedis } from './common/token-revocation';
import { createCorrelationIdMiddleware, StructuredLogger } from '../../shared/logging';
import { initTracing } from '../../shared/tracing/tracing';
import { initSentry } from '../../shared/sentry/sentry-init';
import { WHATSAPP_BROADCAST_QUEUE } from './whatsapp-broadcast/whatsapp-broadcast.consumer';
import { setupSwagger } from '../../shared/swagger/swagger.config';

const structuredLogger = new StructuredLogger('crm');

function rabbitUrl(): string {
  const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
  const port = Number(process.env.RABBITMQ_PORT ?? 5672);
  const user = process.env.RABBITMQ_USER ?? 'guest';
  const pass = process.env.RABBITMQ_PASSWORD ?? 'guest';
  return `amqp://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  initSentry('crm-service');
  initTracing('crm-service');
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

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl()],
      queue: WHATSAPP_BROADCAST_QUEUE,
      queueOptions: { durable: true },
    },
  });

  const port = process.env.PORT ?? 3006;
  setupSwagger(app, { title: 'CRM Service', description: 'Customer relationship management API', version: '1.0' });
  await app.listen(port);
  await app.startAllMicroservices();
  structuredLogger.log(`crm Service running on port ${port} (RMQ topic "${WHATSAPP_BROADCAST_QUEUE}")`);
}

bootstrap();
