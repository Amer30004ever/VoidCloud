import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma/prisma.service';
import { extractCorrelationIdFromHeaders } from '../../../shared/logging';

export const VPS_PROVISION_COMPLETE_EXCHANGE = 'vps.events';
export const VPS_PROVISION_COMPLETE_ROUTING = 'vps.provisioned';

@Controller()
export class VpsEventsConsumer {
  private readonly logger = new Logger(VpsEventsConsumer.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern(VPS_PROVISION_COMPLETE_ROUTING)
  async onProvisioned(
    @Payload()
    payload: {
      jobId: string;
      userId: string;
      vpsId: string;
      name: string;
      ipv4Address?: string | null;
      headers?: Record<string, unknown>;
    },
  ) {
    if (!payload?.userId || !payload?.vpsId) return;
    const correlationId = extractCorrelationIdFromHeaders(payload.headers);
    const log = (msg: string) => this.logger.log(correlationId ? `[${correlationId.slice(0, 8)}] ${msg}` : msg);
    try {
      await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          title: `VPS "${payload.name}" is ready`,
          message: `Your VPS ${payload.name} was provisioned successfully${
            payload.ipv4Address ? ` at ${payload.ipv4Address}` : ''
          }.`,
          type: 'success',
          category: 'vps',
          link: `/voidcloud/dashboard/vps/${payload.vpsId}`,
          metadata: {
            vpsId: payload.vpsId,
            jobId: payload.jobId,
            correlationId,
          } as never,
        },
      });
      log(`Notification created for user ${payload.userId} vps ${payload.vpsId}`);
    } catch (e) {
      this.logger.error(
        correlationId
          ? `[${correlationId.slice(0, 8)}] Failed to create provision notification for user ${payload.userId}: ${e instanceof Error ? e.message : String(e)}`
          : `Failed to create provision notification for user ${payload.userId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

