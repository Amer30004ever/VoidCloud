import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getUserNotifications(
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    // In a real implementation, userId would come from JWT token
    const userId = 'current-user-id'; // Placeholder
    return this.notificationsService.getUserNotifications(userId, unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount() {
    const userId = 'current-user-id'; // Placeholder
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string) {
    const userId = 'current-user-id'; // Placeholder
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead() {
    const userId = 'current-user-id'; // Placeholder
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(@Param('id') id: string) {
    const userId = 'current-user-id'; // Placeholder
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create a notification (admin only)' })
  async createNotification(@Body() data: any) {
    return this.notificationsService.createNotification(data);
  }
}
