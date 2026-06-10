import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';

@ApiTags('Integrations')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(private readonly integrationsService: IntegrationsService) {}

  // Slack Integration Endpoints
  @Get('slack/config')
  @ApiOperation({ summary: 'Get Slack configuration' })
  async getSlackConfig() {
    return this.integrationsService.getSlackConfig();
  }

  @Put('slack/config')
  @ApiOperation({ summary: 'Update Slack configuration' })
  async updateSlackConfig(@Body() configData: any) {
    return this.integrationsService.updateSlackConfig(configData);
  }

  @Post('slack/notify')
  @ApiOperation({ summary: 'Send Slack notification' })
  async sendSlackNotification(@Body() body: { channel: string; message: string }) {
    return this.integrationsService.sendSlackNotification(body.channel, body.message);
  }

  // Webhook Management Endpoints
  @Get('webhooks')
  @ApiOperation({ summary: 'Get all webhooks' })
  async getWebhooks() {
    return this.integrationsService.getWebhooks();
  }

  @Get('webhooks/:id')
  @ApiOperation({ summary: 'Get webhook by ID' })
  async getWebhook(@Param('id') id: string) {
    return this.integrationsService.getWebhook(id);
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Create new webhook' })
  async createWebhook(@Body() webhookData: any) {
    return this.integrationsService.createWebhook(webhookData);
  }

  @Put('webhooks/:id')
  @ApiOperation({ summary: 'Update webhook' })
  async updateWebhook(@Param('id') id: string, @Body() webhookData: any) {
    return this.integrationsService.updateWebhook(id, webhookData);
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: 'Delete webhook' })
  async deleteWebhook(@Param('id') id: string) {
    return this.integrationsService.deleteWebhook(id);
  }

  @Post('webhooks/:id/test')
  @ApiOperation({ summary: 'Test webhook' })
  async testWebhook(@Param('id') id: string) {
    return this.integrationsService.testWebhook(id);
  }

  @Get('webhooks/:id/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery history' })
  async getWebhookDeliveryHistory(
    @Param('id') webhookId: string,
    @Query('limit') limit?: string,
  ) {
    return this.integrationsService.getWebhookDeliveryHistory(webhookId, limit ? parseInt(limit) : undefined);
  }
}
