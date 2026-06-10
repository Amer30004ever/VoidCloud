import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  PasswordMode,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/create-user.dto';
import { generateRandomPassword, hashPassword } from '../common/utils/password.util';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  private async logAudit(action: string, userId?: string, userEmail?: string, resource?: string, details?: unknown) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId,
          userEmail,
          resource,
          details: details ? (details as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (error) {
      this.logger.warn(`Audit log failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
    return { users };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return { user };
  }

  async createUser(dto: CreateUserDto, actorId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('User already exists');

    let plainPassword = dto.password;
    let mustChangePassword = false;

    if (dto.passwordMode === PasswordMode.RANDOM) {
      plainPassword = generateRandomPassword();
      mustChangePassword = true;
    } else if (dto.passwordMode === PasswordMode.FORCE_CHANGE) {
      plainPassword = dto.password?.trim() || generateRandomPassword();
      mustChangePassword = true;
    } else {
      if (!plainPassword || plainPassword.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters for manual mode');
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        password: await hashPassword(plainPassword!),
        isActive: dto.isActive ?? true,
        mustChangePassword,
      },
      select: userSelect,
    });

    await this.logAudit('USER_CREATED', actorId, undefined, user.email, { role: user.role, mustChangePassword });

    return {
      success: true,
      user,
      temporaryPassword: dto.passwordMode !== PasswordMode.MANUAL ? plainPassword : undefined,
      mustChangePassword,
    };
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId?: string) {
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

  async resetUserPassword(id: string, dto: ResetPasswordDto, actorId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    let plainPassword = dto.password;
    let mustChangePassword = false;

    if (dto.passwordMode === PasswordMode.RANDOM) {
      plainPassword = generateRandomPassword();
      mustChangePassword = true;
    } else if (dto.passwordMode === PasswordMode.FORCE_CHANGE) {
      plainPassword = dto.password?.trim() || generateRandomPassword();
      mustChangePassword = true;
    } else if (!plainPassword) {
      throw new BadRequestException('Password is required for manual mode');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        password: await hashPassword(plainPassword!),
        mustChangePassword,
      },
      select: userSelect,
    });

    await this.logAudit('USER_PASSWORD_RESET', actorId, user.email, user.id, { mustChangePassword });

    return {
      success: true,
      user,
      temporaryPassword: dto.passwordMode !== PasswordMode.MANUAL ? plainPassword : undefined,
      mustChangePassword,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: await hashPassword(dto.newPassword),
        mustChangePassword: false,
      },
    });

    await this.logAudit('USER_PASSWORD_CHANGED', userId, user.email, userId);
    return { success: true, message: 'Password updated successfully' };
  }

  async deleteUser(id: string, actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    await this.logAudit('USER_DELETED', actorId, user.email, id);
    return { success: true, message: 'User deleted' };
  }

  async getRoles() {
    const roles = [
      { id: 'ADMIN', name: 'ADMIN', description: 'Full system access' },
      { id: 'USER', name: 'USER', description: 'Standard user access' },
      { id: 'AGENT', name: 'AGENT', description: 'AI agent access' },
    ];
    return { roles };
  }

  async createRole(roleData: { name: string; description: string; permissions: string[] }) {
    return { success: true, role: { id: roleData.name.toUpperCase(), ...roleData } };
  }

  async updateRole(id: string, roleData: Record<string, unknown>) {
    return { success: true, role: { id, ...roleData } };
  }

  async getApiKeys(userId?: string) {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: userId ? { userId } : undefined,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        userId: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { apiKeys };
  }

  async generateApiKey(keyData: { name: string; userId: string; expiresAt?: string }) {
    const rawKey = `pk_${crypto.randomBytes(24).toString('hex')}`;
    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: keyData.name,
        userId: keyData.userId,
        keyHash: await hashPassword(rawKey),
        keyPrefix: rawKey.slice(0, 10),
        expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : undefined,
      },
    });
    await this.logAudit('API_KEY_CREATED', keyData.userId, undefined, apiKey.id, { name: keyData.name });
    return {
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        key: rawKey,
        createdAt: apiKey.createdAt,
      },
    };
  }

  async deleteApiKey(id: string, actorId?: string) {
    await this.prisma.apiKey.delete({ where: { id } });
    await this.logAudit('API_KEY_DELETED', actorId, undefined, id);
    return { success: true, message: 'API key deleted' };
  }

  async getAuditLogs(limit?: number) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit || 50,
    });
    return { logs };
  }

  async getNotificationSettings(userId: string) {
    return {
      settings: {
        email: true,
        slack: true,
        inApp: true,
        alerts: { critical: true, high: true, medium: false, low: false },
      },
    };
  }

  async updateNotificationSettings(userId: string, settings: unknown) {
    return { success: true, settings };
  }

  async getThemeSettings(userId: string) {
    return { settings: { theme: 'dark', accentColor: '#3b82f6' } };
  }

  async updateThemeSettings(userId: string, settings: unknown) {
    return { success: true, settings };
  }

  async createBackup() {
    const backup = {
      id: crypto.randomUUID(),
      filename: `backup-${new Date().toISOString()}.sql`,
      size: '2.5MB',
      createdAt: new Date().toISOString(),
    };
    return { success: true, backup };
  }

  async getBackups() {
    return {
      backups: [
        {
          id: '1',
          filename: 'backup-latest.sql',
          size: '2.5MB',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    };
  }

  async restoreBackup(backupId: string) {
    return { success: true, message: 'Backup restored successfully' };
  }
}
