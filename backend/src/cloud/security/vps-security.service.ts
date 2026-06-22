import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface UpdateSecurityDto {
  wafEnabled?: boolean;
  wafPreset?: 'OWASP' | 'WORDPRESS' | 'CUSTOM';
  wafCustomRules?: Prisma.InputJsonValue | null;
  ddosTier?: 'BASIC' | 'ADVANCED';
  fimEnabled?: boolean;
  fimPaths?: string[];
}

const DEFAULT_PATHS = ['/etc', '/var/www', '/usr/bin'];

@Injectable()
export class VpsSecurityService {
  constructor(private prisma: PrismaService) {}

  private async assertOwner(vpsId: string, userId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  async get(vpsId: string, userId: string) {
    await this.assertOwner(vpsId, userId);
    const existing = await this.prisma.vpsSecuritySettings.findUnique({ where: { vpsId } });
    return (
      existing ?? {
        vpsId,
        wafEnabled: false,
        wafPreset: 'OWASP',
        wafCustomRules: null,
        ddosTier: 'BASIC',
        fimEnabled: false,
        fimPaths: DEFAULT_PATHS,
      }
    );
  }

  async update(vpsId: string, userId: string, data: UpdateSecurityDto) {
    await this.assertOwner(vpsId, userId);
    const payload = {
      wafEnabled: data.wafEnabled ?? false,
      wafPreset: data.wafPreset ?? 'OWASP',
      wafCustomRules:
        data.wafCustomRules === undefined
          ? Prisma.JsonNull
          : data.wafCustomRules === null
          ? Prisma.JsonNull
          : (data.wafCustomRules as Prisma.InputJsonValue),
      ddosTier: data.ddosTier ?? 'BASIC',
      fimEnabled: data.fimEnabled ?? false,
      fimPaths: data.fimPaths?.length ? data.fimPaths : DEFAULT_PATHS,
    };
    return this.prisma.vpsSecuritySettings.upsert({
      where: { vpsId },
      update: payload,
      create: { vpsId, ...payload },
    });
  }
}
