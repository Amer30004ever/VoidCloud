import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService) {}

  async processWebhook(
    platform: string,
    eventType: string,
    payload: any,
    source?: string,
  ) {
    try {
      // Log the webhook
      const webhookLog = await this.prisma.webhookLog.create({
        data: {
          platform,
          eventType,
          payload,
          source: source || null,
          processed: false,
        },
      });

      // Process based on platform
      if (platform === 'whatsapp') {
        await this.processWhatsAppWebhook(eventType, payload, webhookLog.id);
      }

      // Update as processed
      await this.prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true },
      });

      return { success: true, webhookId: webhookLog.id };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    }
  }

  async processPayload(platform: string, payload: any) {
    this.logger.log(`Processing payload for ${platform}`);

    // Call the main processWebhook method with default values
    return this.processWebhook(platform, 'payload', payload, 'api');
  }

  private async processWhatsAppWebhook(
    eventType: string,
    payload: any,
    webhookLogId: string,
  ) {
    // Handle WhatsApp specific webhook events
    this.logger.log(`Processing WhatsApp webhook: ${eventType}`);

    if (eventType === 'message') {
      // Handle incoming messages
      const waId = payload.from;
      const messageText = payload.text?.body || '';

      // Find or create contact
      let contact = await this.prisma.whatsappContact.findUnique({
        where: { waId },
      });

      if (!contact && payload.profile?.name) {
        // Create contact if needed
        contact = await this.prisma.whatsappContact.create({
          data: {
            waId,
            name: payload.profile.name,
            phone: waId,
            userId: 'system', // Will be updated when user claims
          },
        });
      }

      // Create conversation or get existing
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          platform: 'whatsapp',
          contactId: waId,
        },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            platform: 'whatsapp',
            contactId: waId,
            title: payload.profile?.name || waId,
            userId: 'system',
          },
        });
      }

      // Create message
      await this.prisma.message.create({
        data: {
          content: messageText,
          role: 'user',
          direction: 'INBOUND',
          conversationId: conversation.id,
        },
      });
    }
  }
}
