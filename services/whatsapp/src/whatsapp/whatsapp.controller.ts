import { Body, Controller, Get, Logger, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { WhatsAppService } from './whatsapp.service';

@Controller()
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('webhooks/whatsapp')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.whatsapp.verifyWebhook(mode, token, challenge);
  }

  @Public()
  @Post('webhooks/whatsapp')
  async receive(@Body() payload: unknown) {
    this.logger.log('Webhook received');
    return { status: 'ok', payload };
  }

  @Post('whatsapp/send')
  @UseGuards(JwtAuthGuard)
  send(@Body() body: { to: string; text: string }) {
    return this.whatsapp.sendTextMessage(body.to, body.text);
  }

  @Get('whatsapp/conversations')
  @UseGuards(JwtAuthGuard)
  conversations(@CurrentUser() user: { id: string; role: string }) {
    const where = user.role === 'SUPER_ADMIN' ? {} : { userId: user.id };
    return this.prisma.conversation.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  @Get('whatsapp/conversations/:id')
  @UseGuards(JwtAuthGuard)
  conversation(@Param('id') id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  @Put('whatsapp/conversations/:id/assign')
  @UseGuards(JwtAuthGuard)
  assign(@Param('id') id: string, @Body() body: { agentId: string }) {
    return this.prisma.conversation.update({
      where: { id },
      data: { userId: body.agentId },
    });
  }

  @Post('whatsapp/webhook/configure')
  @UseGuards(JwtAuthGuard)
  configureWebhook(@Body() body: { url: string }) {
    return { ok: true, url: body.url };
  }

  @Get('whatsapp/settings')
  @UseGuards(JwtAuthGuard)
  settings() {
    return {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      supportNumber: process.env.WHATSAPP_SUPPORT_NUMBER_FORMATTED,
      webhookUrl: process.env.WHATSAPP_WEBHOOK_URL,
    };
  }

  @Put('whatsapp/settings')
  @UseGuards(JwtAuthGuard)
  updateSettings(@Body() body: Record<string, unknown>) {
    return { ok: true, settings: body };
  }
}
