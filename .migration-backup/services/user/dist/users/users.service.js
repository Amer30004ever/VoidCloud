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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const password_util_1 = require("../common/utils/password.util");
const userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    mustChangePassword: true,
    suspendedAt: true,
    suspendedReason: true,
    createdAt: true,
    updatedAt: true,
};
let UsersService = UsersService_1 = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async logAudit(action, userId, userEmail, resource, details) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    action,
                    userId,
                    userEmail,
                    resource,
                    details: details ? details : undefined,
                },
            });
        }
        catch (error) {
            this.logger.warn(`Audit log failed: ${error instanceof Error ? error.message : error}`);
        }
    }
    async listUsers(role) {
        const users = await this.prisma.user.findMany({
            where: role ? { role } : undefined,
            select: userSelect,
            orderBy: { createdAt: 'desc' },
        });
        return { users };
    }
    async searchUsers(query) {
        const term = query.trim();
        if (!term)
            return { users: [] };
        const users = await this.prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: term, mode: 'insensitive' } },
                    { email: { contains: term, mode: 'insensitive' } },
                ],
            },
            select: userSelect,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return { users };
    }
    async getUser(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: userSelect,
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return { user };
    }
    async createUser(dto, actorId) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing)
            throw new common_1.ConflictException('User already exists');
        let plainPassword = dto.password;
        let mustChangePassword = false;
        if (dto.passwordMode === create_user_dto_1.PasswordMode.RANDOM) {
            plainPassword = (0, password_util_1.generateRandomPassword)();
            mustChangePassword = true;
        }
        else if (dto.passwordMode === create_user_dto_1.PasswordMode.FORCE_CHANGE) {
            plainPassword = dto.password?.trim() || (0, password_util_1.generateRandomPassword)();
            mustChangePassword = true;
        }
        else {
            if (!plainPassword || plainPassword.length < 8) {
                throw new common_1.BadRequestException('Password must be at least 8 characters for manual mode');
            }
        }
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
                role: dto.role,
                password: await (0, password_util_1.hashPassword)(plainPassword),
                isActive: dto.isActive ?? true,
                mustChangePassword,
            },
            select: userSelect,
        });
        await this.logAudit('USER_CREATED', actorId, undefined, user.email, {
            role: user.role,
            mustChangePassword,
        });
        return {
            success: true,
            user,
            temporaryPassword: dto.passwordMode !== create_user_dto_1.PasswordMode.MANUAL ? plainPassword : undefined,
            mustChangePassword,
        };
    }
    async updateUser(id, dto, actorId) {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                email: dto.email,
                name: dto.name,
                role: dto.role,
                isActive: dto.isActive,
            },
            select: userSelect,
        });
        await this.logAudit('USER_UPDATED', actorId, user.email, user.id, dto);
        return { success: true, user };
    }
    async assignRole(id, role, actorId) {
        const user = await this.prisma.user.update({
            where: { id },
            data: { role },
            select: userSelect,
        });
        await this.logAudit('USER_ROLE_ASSIGNED', actorId, user.email, user.id, {
            role,
        });
        return { success: true, user };
    }
    async suspendUser(id, reason, actorId) {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                isActive: false,
                suspendedAt: new Date(),
                suspendedReason: reason ?? 'Suspended by admin',
            },
            select: userSelect,
        });
        await this.logAudit('USER_SUSPENDED', actorId, user.email, user.id, {
            reason,
        });
        return { success: true, user };
    }
    async activateUser(id, actorId) {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                isActive: true,
                suspendedAt: null,
                suspendedReason: null,
            },
            select: userSelect,
        });
        await this.logAudit('USER_ACTIVATED', actorId, user.email, user.id);
        return { success: true, user };
    }
    async resetUserPassword(id, dto, actorId) {
        const existing = await this.prisma.user.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('User not found');
        let plainPassword = dto.password;
        let mustChangePassword = false;
        if (dto.passwordMode === create_user_dto_1.PasswordMode.RANDOM) {
            plainPassword = (0, password_util_1.generateRandomPassword)();
            mustChangePassword = true;
        }
        else if (dto.passwordMode === create_user_dto_1.PasswordMode.FORCE_CHANGE) {
            plainPassword = dto.password?.trim() || (0, password_util_1.generateRandomPassword)();
            mustChangePassword = true;
        }
        else if (!plainPassword) {
            throw new common_1.BadRequestException('Password is required for manual mode');
        }
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                password: await (0, password_util_1.hashPassword)(plainPassword),
                mustChangePassword,
            },
            select: userSelect,
        });
        await this.logAudit('USER_PASSWORD_RESET', actorId, user.email, user.id, {
            mustChangePassword,
        });
        return {
            success: true,
            user,
            temporaryPassword: dto.passwordMode !== create_user_dto_1.PasswordMode.MANUAL ? plainPassword : undefined,
            mustChangePassword,
        };
    }
    async deleteUser(id, actorId) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: userSelect,
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.prisma.user.delete({ where: { id } });
        await this.logAudit('USER_DELETED', actorId, user.email, id);
        return { success: true, message: 'User deleted' };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map