import { Controller, Get, Post, Body, Query, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('WhatsApp')
@Controller('webhooks/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verify WhatsApp webhook' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string | null {
    return this.whatsappService.verifyWebhook(mode, token, challenge);
  }

  @Post()
  @ApiOperation({ summary: 'Receive WhatsApp webhook events' })
  async handleWebhook(@Body() payload: any, @Headers('x-hub-signature') signature: string) {
    this.logger.log(`Received webhook event: ${JSON.stringify(payload).substring(0, 200)}...`);

    try {
      // Process messages
      if (payload.entry) {
        for (const entry of payload.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'messages') {
                await this.processMessage(change.value);
              }
            }
          }
        }
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  private async processMessage(value: any) {
    if (!value.messages || value.messages.length === 0) {
      return;
    }

    const message = value.messages[0];
    const from = message.from;
    const text = message.text?.body || '';

    this.logger.log(`Processing message from ${from}: ${text}`);

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        platform: 'whatsapp',
        contactId: from,
      },
    });

    if (!conversation) {
      // Create new conversation
      conversation = await this.prisma.conversation.create({
        data: {
          userId: 'system', // Will be assigned to an agent later
          platform: 'whatsapp',
          contactId: from,
          platformId: message.id,
          status: 'OPEN',
          title: `WhatsApp: ${from}`,
        },
      });
      this.logger.log(`Created new conversation: ${conversation.id}`);
    }

    // Store incoming message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: text,
        type: 'TEXT',
        waMessageId: message.id,
        direction: 'INBOUND',
      },
    });

    // Get auto-reply
    const autoReply = this.whatsappService.getAutoReply(text);
    
    // Send auto-reply
    await this.whatsappService.sendTextMessage(from, autoReply);

    // Store auto-reply in database
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: autoReply,
        type: 'TEXT',
        direction: 'OUTBOUND',
      },
    });

    // Route message to appropriate team
    const team = this.whatsappService.routeMessage(text);
    this.logger.log(`Message routed to ${team} team`);
  }
}
