import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { extractCorrelationIdFromHeaders } from '../../../shared/logging';

export const WHATSAPP_BROADCAST_QUEUE = 'whatsapp.broadcast';

interface BroadcastJob {
  broadcastId: string;
  templateBody: string;
  recipients: { id: string; phone: string; name?: string }[];
}

@Controller()
export class WhatsappBroadcastConsumer {
  private readonly logger = new Logger(WhatsappBroadcastConsumer.name);
  private readonly rateLimitDelayMs = 2000;

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern(WHATSAPP_BROADCAST_QUEUE)
  async onBroadcast(@Payload() job: BroadcastJob & { headers?: Record<string, unknown> }) {
    if (!job?.broadcastId || !job?.recipients?.length) return;
    const correlationId = extractCorrelationIdFromHeaders(job.headers);
    const log = (msg: string) => this.logger.log(correlationId ? `[${correlationId.slice(0, 8)}] ${msg}` : msg);
    const logError = (msg: string) => this.logger.error(correlationId ? `[${correlationId.slice(0, 8)}] ${msg}` : msg);

    await this.prisma.whatsappBroadcast.update({
      where: { id: job.broadcastId },
      data: { status: 'SENDING' },
    });

    for (const recipient of job.recipients) {
      try {
        const personalized = this.personalize(job.templateBody, recipient);
        await this.sendWhatsApp(recipient.phone, personalized);
        await this.prisma.whatsappBroadcastRecipient.update({
          where: { id: recipient.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        await this.prisma.whatsappBroadcast.update({
          where: { id: job.broadcastId },
          data: { sentCount: { increment: 1 } },
        });
      } catch (error) {
        logError(`Failed to send broadcast to ${recipient.phone}: ${error instanceof Error ? error.message : String(error)}`);
        await this.prisma.whatsappBroadcastRecipient.update({
          where: { id: recipient.id },
          data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' },
        });
        await this.prisma.whatsappBroadcast.update({
          where: { id: job.broadcastId },
          data: { failedCount: { increment: 1 } },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, this.rateLimitDelayMs));
    }

    const updated = await this.prisma.whatsappBroadcast.findUnique({ where: { id: job.broadcastId } });
    const allProcessed = updated && updated.sentCount + updated.failedCount >= job.recipients.length;
    if (allProcessed) {
      await this.prisma.whatsappBroadcast.update({
        where: { id: job.broadcastId },
        data: { status: updated.failedCount > 0 ? 'FAILED' : 'COMPLETED', sentAt: new Date() },
      });
    }
  }

  private personalize(template: string, recipient: { name?: string }): string {
    return template
      .replace(/\{\{firstName\}\}/g, recipient.name?.split(' ')[0] || '')
      .replace(/\{\{name\}\}/g, recipient.name || '');
  }

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    const openwaUrl = process.env.OPENWA_URL || 'http://openwa-service.voidcloud.svc.cluster.local:2785';
    const apiKey = process.env.OPENWA_API_KEY || 'dev-admin-key';
    const https = await import('node:https');
    const url = new URL(`${openwaUrl}/api/sendText`);

    const body = JSON.stringify({ chatId: `${phone}@c.us`, text: message });

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${apiKey}`,
      },
    };

    await new Promise<void>((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`OpenWA responded ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
