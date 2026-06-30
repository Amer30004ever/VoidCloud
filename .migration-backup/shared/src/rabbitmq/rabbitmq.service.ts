import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RabbitMqService {
  private readonly logger = new Logger(RabbitMqService.name);
  private connected = false;

  constructor() {
    const host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
    const port = process.env.RABBITMQ_PORT ?? '5672';
    this.logger.log(`RabbitMQ configured at ${host}:${port}`);
    this.connected = true;
  }

  async publish(queue: string, payload: unknown): Promise<void> {
    this.logger.debug(`publish queue=${queue} payload=${JSON.stringify(payload).slice(0, 200)}`);
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }
}
