"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async createNotification(data) {
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
            return notification;
        }
        catch (error) {
            this.logger.error(`Failed to create notification: ${error.message}`);
            throw error;
        }
    }
    async createTenantNotification(tenantId, data) {
        try {
            const userTenants = await this.prisma.userTenant.findMany({
                where: { tenantId },
                select: { userId: true },
            });
            const notifications = await Promise.all(userTenants.map((ut) => this.createNotification({
                ...data,
                userId: ut.userId,
            })));
            this.logger.log(`Created ${notifications.length} notifications for tenant ${tenantId}`);
            return notifications;
        }
        catch (error) {
            this.logger.error(`Failed to create tenant notifications: ${error.message}`);
            throw error;
        }
    }
    async createSystemNotification(data) {
        try {
            const users = await this.prisma.user.findMany({
                where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
                select: { id: true },
            });
            const notifications = await Promise.all(users.map((user) => this.createNotification({
                ...data,
                userId: user.id,
            })));
            this.logger.log(`Created ${notifications.length} system notifications`);
            return notifications;
        }
        catch (error) {
            this.logger.error(`Failed to create system notifications: ${error.message}`);
            throw error;
        }
    }
    async getUserNotifications(userId, unreadOnly = false) {
        const where = { userId };
        if (unreadOnly) {
            where.read = false;
        }
        return this.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async markAsRead(notificationId, userId) {
        return this.prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId,
            },
            data: { read: true },
        });
    }
    async markAllAsRead(userId) {
        return this.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }
    async deleteNotification(notificationId, userId) {
        return this.prisma.notification.deleteMany({
            where: {
                id: notificationId,
                userId,
            },
        });
    }
    async getUnreadCount(userId) {
        return this.prisma.notification.count({
            where: { userId, read: false },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map