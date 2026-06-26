import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  verifyWebhook(@Query() query: any) {
    this.logger.log('Webhook verification request received');

    // WhatsApp webhook verification
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    return 'Verification failed';
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    this.logger.log('Webhook received');

    try {
      // Detect platform from body structure
      let platform = 'unknown';
      let payload = body;

      if (body.object === 'whatsapp_business_account') {
        platform = 'whatsapp';
        // Extract the actual message payload
        if (body.entry?.[0]?.changes?.[0]?.value) {
          payload = body.entry[0].changes[0].value;
        }
      }

      // Call processPayload with both platform and payload
      const result = await this.webhookService.processPayload(
        platform,
        payload,
      );
      return { status: 'success', result };
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }
}
