import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.AGENT, Role.SUPER_ADMIN)
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Post('send')
  async sendMessage(
    @CurrentUser() user: { id: string },
    @Body() body: { phone: string; message: string },
  ) {
    return this.whatsapp.sendMessage(body.phone, body.message, user.id);
  }

  @Get('messages/:phone')
  async getMessages(
    @CurrentUser() user: { id: string },
    @Param('phone') phone: string,
  ) {
    return this.whatsapp.getMessages(phone, user.id);
  }

  @Get('contacts')
  async getContacts(@CurrentUser() user: { id: string }) {
    return this.whatsapp.getContacts(user.id);
  }

  @Post('sync-contact')
  async syncContact(
    @CurrentUser() user: { id: string },
    @Body() body: { phone: string; name: string },
  ) {
    return this.whatsapp.syncContact(body.phone, body.name, user.id);
  }

  @Public()
  @Post('webhook')
  async handleWebhook(@Body() event: any) {
    return this.whatsapp.handleWebhook(event);
  }

  @Get('status')
  async getStatus() {
    return this.whatsapp.getOpenwaStatus();
  }
}
