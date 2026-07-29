import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TosAcceptanceService {
  constructor(private prisma: PrismaService) {}

  async accept(userId: string, dto: {
    tosVersion: string;
    privacyVersion: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    if (!dto.tosVersion || !dto.privacyVersion) {
      throw new BadRequestException('tosVersion and privacyVersion are required');
    }
    const record = await this.prisma.toSAcceptance.create({
      data: {
        userId,
        tosVersion: dto.tosVersion,
        privacyVersion: dto.privacyVersion,
        ipAddress: dto.ipAddress ?? null,
        userAgent: dto.userAgent ?? null,
      },
    });
    return {
      ok: true,
      tosVersion: record.tosVersion,
      privacyVersion: record.privacyVersion,
      acceptedAt: record.acceptedAt,
    };
  }

  async hasAccepted(userId: string, tosVersion: string): Promise<boolean> {
    const count = await this.prisma.toSAcceptance.count({
      where: { userId, tosVersion },
    });
    return count > 0;
  }

  async getLatest(userId: string) {
    return this.prisma.toSAcceptance.findFirst({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
    });
  }
}
