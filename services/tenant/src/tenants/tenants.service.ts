import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  listTenants() {
    return this.prisma.tenant.findMany({
      include: {
        userTenants: {
          include: {
            user: { select: { id: true, email: true, name: true } },
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { userTenants: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async createTenant(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { subdomain: dto.subdomain },
    });
    if (existing) {
      throw new BadRequestException('Subdomain already in use');
    }
    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        subdomain: dto.subdomain.toLowerCase(),
        settings: (dto.settings ?? {}) as Prisma.InputJsonValue,
        status: 'ACTIVE',
      },
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    await this.getTenant(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        subdomain: dto.subdomain?.toLowerCase(),
        status: dto.status,
        settings: dto.settings as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteTenant(id: string) {
    await this.getTenant(id);
    await this.prisma.tenant.delete({ where: { id } });
    return { success: true };
  }

  async getSettings(id: string) {
    const tenant = await this.getTenant(id);
    return { settings: tenant.settings ?? {} };
  }

  async updateSettings(id: string, settings: Record<string, unknown>) {
    const tenant = await this.getTenant(id);
    const merged = {
      ...((tenant.settings as Record<string, unknown>) ?? {}),
      ...settings,
    };
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { settings: merged as Prisma.InputJsonValue },
    });
    return { settings: updated.settings ?? {} };
  }
}
