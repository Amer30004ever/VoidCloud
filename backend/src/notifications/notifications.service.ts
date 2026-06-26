import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface NotificationData {
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: string;
  link?: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a notification for a specific user
   */
  async createNotification(data: NotificationData) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          category: data.category,
          link: data.link,
          metadata: data.metadata,
          read: false,
        },
      });

      this.logger.log(`Notification created for user ${data.userId}: ${data.title}`);
      
      // In a real implementation, this would trigger a WebSocket event
      // to push the notification to the client in real-time
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a notification for all users in a tenant
   */
  async createTenantNotification(tenantId: string, data: Omit<NotificationData, 'userId'>) {
    try {
      const userTenants = await this.prisma.userTenant.findMany({
        where: { tenantId },
        select: { userId: true },
      });

      const notifications = await Promise.all(
        userTenants.map((ut) =>
          this.createNotification({
            ...data,
            userId: ut.userId,
          }),
        ),
      );

      this.logger.log(`Created ${notifications.length} notifications for tenant ${tenantId}`);
      return notifications;
    } catch (error) {
      this.logger.error(`Failed to create tenant notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a system-wide notification (SUPER_ADMIN only)
   */
  async createSystemNotification(data: Omit<NotificationData, 'userId'>) {
    try {
      const users = await this.prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
        select: { id: true },
      });

      const notifications = await Promise.all(
        users.map((user) =>
          this.createNotification({
            ...data,
            userId: user.id,
          }),
        ),
      );

      this.logger.log(`Created ${notifications.length} system notifications`);
      return notifications;
    } catch (error) {
      this.logger.error(`Failed to create system notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    const where: any = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }
}
