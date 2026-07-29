import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { WhatsappBroadcastService } from './whatsapp-broadcast.service';
import { CreateTemplateDto, SendBroadcastDto } from './dto/create-template.dto';

@Controller('whatsapp/broadcast')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsappBroadcastController {
  constructor(private readonly service: WhatsappBroadcastService) {}

  @Post('templates')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createTemplate(@CurrentUser() user: { id: string; tenantId?: string }, @Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(user.id, dto);
  }

  @Get('templates')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  listTemplates(@CurrentUser() user: { id: string; tenantId?: string }) {
    return this.service.listTemplates(user.id, user.tenantId);
  }

  @Put('templates/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateTemplate(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: CreateTemplateDto) {
    return this.service.updateTemplate(id, user.id, dto);
  }

  @Delete('templates/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteTemplate(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.deleteTemplate(id, user.id);
  }

  @Post('send')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  sendBroadcast(@CurrentUser() user: { id: string; tenantId?: string }, @Body() dto: SendBroadcastDto) {
    return this.service.sendBroadcast(user.id, user.tenantId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  listBroadcasts(@CurrentUser() user: { id: string }) {
    return this.service.listBroadcasts(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getBroadcast(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.getBroadcast(id, user.id);
  }

  @Get(':id/recipients')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getRecipients(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.getRecipients(id, user.id);
  }
}
