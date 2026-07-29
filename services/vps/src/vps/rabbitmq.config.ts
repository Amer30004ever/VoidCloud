import { ClientOptions, Transport } from '@nestjs/microservices';

/**
 * Builds the RabbitMQ connection options for a given queue/exchange.
 * Connection settings come from the same env already wired into the K8s
 * deployment (RABBITMQ_HOST / RABBITMQ_PORT) and the existing secrets.
 */
export function rabbitConfig(queue: string, exchange?: string): ClientOptions {
  const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
  const port = Number(process.env.RABBITMQ_PORT ?? 5672);
  const user = process.env.RABBITMQ_USER ?? 'guest';
  const pass = process.env.RABBITMQ_PASSWORD ?? 'guest';
  const urls = [`amqp://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`];
  return {
    transport: Transport.RMQ,
    options: {
      urls,
      queue,
      queueOptions: { durable: true },
      ...(exchange ? { exchange, exchangeType: 'direct', routingKey: queue } : {}),
    },
  };
}

export const VPS_PROVISION_QUEUE = 'vps.provision';
export const VPS_PROVISION_COMPLETE_EXCHANGE = 'vps.events';
export const VPS_PROVISION_COMPLETE_ROUTING = 'vps.provisioned';
