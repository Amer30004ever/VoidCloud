import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @Roles(Role.USER, Role.AGENT, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List notifications' })
  @ApiResponse({ status: 200, description: 'Notifications list' })
  list(@CurrentUser() user: { id: string }, @Query('unreadOnly') unreadOnly?: string) {
    return this.notifications.list(user.id, unreadOnly === 'true');
  }

  @Put(':id/read')
  @Roles(Role.USER, Role.AGENT, Role.ADMIN, Role.SUPER_ADMIN)
  markRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.notifications.markRead(id, user.id);
  }

  @Put('read-all')
  @Roles(Role.USER, Role.AGENT, Role.ADMIN, Role.SUPER_ADMIN)
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notifications.markAllRead(user.id);
  }

  @Delete(':id')
  @Roles(Role.USER, Role.AGENT, Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.notifications.delete(id, user.id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create notification' })
  @ApiResponse({ status: 201, description: 'Notification created' })
  create(@Body() body: { userId: string; title: string; message: string; type?: string }) {
    return this.notifications.create(body);
  }

  @Get('ws')
  @ApiOperation({ summary: 'WebSocket info' })
  @ApiResponse({ status: 200, description: 'WebSocket connection info' })
  wsInfo() {
    return { endpoint: '/notifications/ws', transport: 'socket.io' };
  }
}
