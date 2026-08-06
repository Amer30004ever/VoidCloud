import { Injectable, Logger } from '@nestjs/common';
import { withImpersonation, AuditActor } from '../common/audit-impersonation';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret, maskSecret } from '../../../shared/crypto/crypto.util';

export interface CreateSecretDto {
  key: string;
  value: string;
  description?: string;
}

export interface UpdateSecretDto {
  value: string;
  description?: string;
}

interface CacheEntry {
  plain: string;
  expires: number;
}

@Injectable()
export class PlatformSecretsService {
  private readonly logger = new Logger(PlatformSecretsService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async list(actor?: AuditActor) {
    const secrets = await this.prisma.platformSecret.findMany({
      orderBy: { key: 'asc' },
      select: {
        id: true,
        key: true,
        description: true,
        lastRotatedAt: true,
        createdAt: true,
        updatedAt: true,
        encryptedValue: true,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'PLATFORM_SECRETS_LIST',
        userId: actor?.id,
        details: withImpersonation({}, actor) as any,
        status: 'SUCCESS',
      },
    });
    return secrets.map((s) => ({
      ...s,
      maskedValue: maskSecret(s.encryptedValue),
    }));
  }

  async getReveal(id: string, actor?: AuditActor) {
    const secret = await this.prisma.platformSecret.findUnique({ where: { id } });
    if (!secret) return null;
    const plain = decryptSecret(secret.encryptedValue);
    // Audit write must succeed before the plaintext is returned — a reveal that
    // isn't recorded is a compliance failure, so let the error propagate.
    await this.prisma.auditLog.create({
      data: {
        action: 'PLATFORM_SECRET_REVEAL',
        userId: actor?.id,
        resource: `platform_secret:${id}`,
        details: withImpersonation({ key: secret.key }, actor) as any,
        status: 'SUCCESS',
      },
    });
    return { id: secret.id, key: secret.key, plainValue: plain };
  }

  async create(dto: CreateSecretDto, userId?: string, actor?: AuditActor) {
    const encrypted = encryptSecret(dto.value);
    const secret = await this.prisma.platformSecret.create({
      data: {
        key: dto.key,
        encryptedValue: encrypted,
        description: dto.description ?? null,
        updatedBy: userId ?? null,
      },
    });
    this.invalidateCache(dto.key);
    this.prisma.auditLog.create({
      data: {
        action: 'PLATFORM_SECRET_CREATE',
        userId,
        resource: `platform_secret:${secret.id}`,
        details: withImpersonation({ key: secret.key }, actor) as any,
        status: 'SUCCESS',
      },
    }).catch(() => {});
    return secret;
  }

  async update(id: string, dto: UpdateSecretDto, userId?: string, actor?: AuditActor) {
    const existing = await this.prisma.platformSecret.findUnique({ where: { id } });
    if (!existing) return null;
    const encrypted = encryptSecret(dto.value);
    const secret = await this.prisma.platformSecret.update({
      where: { id },
      data: {
        encryptedValue: encrypted,
        description: dto.description ?? existing.description,
        updatedBy: userId ?? null,
      },
    });
    this.invalidateCache(existing.key);
    this.prisma.auditLog.create({
      data: {
        action: 'PLATFORM_SECRET_UPDATE',
        userId,
        resource: `platform_secret:${id}`,
        details: withImpersonation({ key: secret.key }, actor) as any,
        status: 'SUCCESS',
      },
    }).catch(() => {});
    return secret;
  }

  async delete(id: string, actor?: AuditActor) {
    const existing = await this.prisma.platformSecret.findUnique({ where: { id } });
    if (!existing) return false;
    await this.prisma.platformSecret.delete({ where: { id } });
    this.invalidateCache(existing.key);
    this.prisma.auditLog.create({
      data: {
        action: 'PLATFORM_SECRET_DELETE',
        userId: actor?.id,
        resource: `platform_secret:${id}`,
        details: withImpersonation({ key: existing.key }, actor) as any,
        status: 'SUCCESS',
      },
    }).catch(() => {});
    return true;
  }

  async getPlainByKey(key: string): Promise<string> {
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && cached.expires > now) {
      return cached.plain;
    }

    const secret = await this.prisma.platformSecret.findUnique({
      where: { key },
    });

    if (!secret) {
      const envValue = process.env[key.toUpperCase()] ?? process.env[key];
      if (envValue !== undefined) {
        this.cache.set(key, { plain: envValue, expires: now + this.CACHE_TTL_MS });
        return envValue;
      }
      return '';
    }

    const plain = decryptSecret(secret.encryptedValue);
    this.cache.set(key, { plain, expires: now + this.CACHE_TTL_MS });
    return plain;
  }

  private invalidateCache(key: string) {
    this.cache.delete(key);
  }
}
