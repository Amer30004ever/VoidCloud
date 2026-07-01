import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserDto,
  PasswordMode,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/create-user.dto';
import {
  generateRandomPassword,
  hashPassword,
} from '../common/utils/password.util';

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
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  private async logAudit(
    action: string,
    userId?: string,
    userEmail?: string,
    resource?: string,
    details?: unknown,
  ) {
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
      this.logger.warn(
        `Audit log failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async listUsers(role?: Role) {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
    return { users };
  }

  async searchUsers(query: string) {
    const term = query.trim();
    if (!term) return { users: [] };
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

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return { user };
  }

  async createUser(dto: CreateUserDto, actorId?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
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
        throw new BadRequestException(
          'Password must be at least 8 characters for manual mode',
        );
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

    await this.logAudit('USER_CREATED', actorId, undefined, user.email, {
      role: user.role,
      mustChangePassword,
    });

    return {
      success: true,
      user,
      temporaryPassword:
        dto.passwordMode !== PasswordMode.MANUAL ? plainPassword : undefined,
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

  async assignRole(id: string, role: Role, actorId?: string) {
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

  async suspendUser(id: string, reason?: string, actorId?: string) {
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

  async activateUser(id: string, actorId?: string) {
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

    await this.logAudit('USER_PASSWORD_RESET', actorId, user.email, user.id, {
      mustChangePassword,
    });

    return {
      success: true,
      user,
      temporaryPassword:
        dto.passwordMode !== PasswordMode.MANUAL ? plainPassword : undefined,
      mustChangePassword,
    };
  }

  async deleteUser(id: string, actorId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    await this.logAudit('USER_DELETED', actorId, user.email, id);
    return { success: true, message: 'User deleted' };
  }
}
