import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { createRateLimitMiddleware } from './common/rate-limit/middleware';
import { getRedis } from './common/token-revocation';
import { createCorrelationIdMiddleware, StructuredLogger } from '../../shared/logging';
import { initTracing } from '../../shared/tracing/tracing';
import { initSentry } from '../../shared/sentry/sentry-init';
import { setupSwagger } from '../../shared/swagger/swagger.config';

const structuredLogger = new StructuredLogger('notification');

const VPS_PROVISION_COMPLETE_EXCHANGE = 'vps.events';
const VPS_PROVISION_COMPLETE_ROUTING = 'vps.provisioned';

function rabbitUrl(): string {
  const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
  const port = Number(process.env.RABBITMQ_PORT ?? 5672);
  const user = process.env.RABBITMQ_USER ?? 'guest';
  const pass = process.env.RABBITMQ_PASSWORD ?? 'guest';
  return `amqp://${encodeURIComponent(user)}:${encodeURIComponent(user)}@${host}:${port}`;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  initSentry('notification-service');
  initTracing('notification-service');
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
      queue: VPS_PROVISION_COMPLETE_ROUTING,
      queueOptions: { durable: true },
      exchange: VPS_PROVISION_COMPLETE_EXCHANGE,
      exchangeType: 'topic',
      routingKey: VPS_PROVISION_COMPLETE_ROUTING,
    },
  });

  const port = process.env.PORT ?? 3009;
  setupSwagger(app, { title: 'Notification Service', description: 'Notifications API', version: '1.0' });
  await app.listen(port);
  await app.startAllMicroservices();
  structuredLogger.log(`notification Service running on port ${port} (RMQ topic "${VPS_PROVISION_COMPLETE_EXCHANGE}")`);
}

bootstrap();
