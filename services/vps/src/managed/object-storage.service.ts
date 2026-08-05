import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret } from '../../../../shared/crypto/crypto.util';

const BUCKET_RE = /^[a-z0-9][a-z0-9-]{2,61}$/;

/**
 * Tier 9 — S3-compatible object storage control plane (MinIO backed).
 *
 * The control plane owns bucket records, quotas and scoped access keys.
 * Secrets are stored AES-256-GCM encrypted and only revealed once at creation.
 */
@Injectable()
export class ObjectStorageService {
  constructor(private readonly prisma: PrismaService) {}

  private endpoint() {
    return process.env.OBJECT_STORAGE_ENDPOINT || 'https://s3.voidcloud.cc.cd';
  }

  async createBucket(
    userId: string,
    input: { name: string; region?: string; publicRead?: boolean; versioning?: boolean; quotaGb?: number },
  ) {
    const name = (input.name || '').trim().toLowerCase();
    if (!BUCKET_RE.test(name)) {
      throw new BadRequestException(
        'Bucket name must be 3-62 chars, lowercase letters, digits or hyphens',
      );
    }
    const clash = await this.prisma.objectStorageBucket.findUnique({ where: { name } });
    if (clash) throw new ConflictException('Bucket name already taken');

    return this.prisma.objectStorageBucket.create({
      data: {
        userId,
        name,
        region: input.region || 'eu-central',
        publicRead: input.publicRead ?? false,
        versioning: input.versioning ?? false,
        quotaGb: Math.min(Math.max(input.quotaGb ?? 50, 1), 10_000),
        endpoint: this.endpoint(),
      },
    });
  }

  async listBuckets(userId: string) {
    const rows = await this.prisma.objectStorageBucket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        keys: {
          where: { revokedAt: null },
          select: { id: true, label: true, accessKey: true, readOnly: true, lastUsedAt: true },
        },
      },
    });
    return rows.map((row: any) => ({
      ...row,
      usedBytes: Number(row.usedBytes ?? 0),
      usedPercent: row.quotaGb
        ? Math.min(100, (Number(row.usedBytes ?? 0) / (row.quotaGb * 1024 ** 3)) * 100)
        : 0,
    }));
  }

  private async ownedBucket(userId: string, id: string) {
    const bucket = await this.prisma.objectStorageBucket.findUnique({ where: { id } });
    if (!bucket) throw new NotFoundException('Bucket not found');
    if (bucket.userId !== userId) throw new ForbiddenException('Not your bucket');
    return bucket;
  }

  async updateBucket(
    userId: string,
    id: string,
    patch: { publicRead?: boolean; versioning?: boolean; quotaGb?: number },
  ) {
    const bucket = await this.ownedBucket(userId, id);
    return this.prisma.objectStorageBucket.update({
      where: { id: bucket.id },
      data: {
        publicRead: patch.publicRead ?? bucket.publicRead,
        versioning: patch.versioning ?? bucket.versioning,
        quotaGb: patch.quotaGb ? Math.min(Math.max(patch.quotaGb, 1), 10_000) : bucket.quotaGb,
      },
    });
  }

  async deleteBucket(userId: string, id: string) {
    const bucket = await this.ownedBucket(userId, id);
    if (bucket.objectCount > 0) {
      throw new BadRequestException('Bucket is not empty');
    }
    await this.prisma.objectStorageBucket.delete({ where: { id: bucket.id } });
    return { deleted: true, id: bucket.id };
  }

  /** Issue a scoped access key. The secret is returned exactly once. */
  async createKey(userId: string, bucketId: string, label: string, readOnly = false) {
    const bucket = await this.ownedBucket(userId, bucketId);
    const accessKey = `VC${randomBytes(9).toString('hex').toUpperCase()}`;
    const secret = randomBytes(30).toString('base64url');

    const key = await this.prisma.objectStorageKey.create({
      data: {
        bucketId: bucket.id,
        userId,
        label: label?.trim() || 'default',
        accessKey,
        secretCipher: encryptSecret(secret),
        readOnly,
      },
    });

    return {
      id: key.id,
      label: key.label,
      accessKey,
      secretKey: secret,
      readOnly,
      endpoint: bucket.endpoint,
      bucket: bucket.name,
    };
  }

  async revokeKey(userId: string, keyId: string) {
    const key = await this.prisma.objectStorageKey.findUnique({ where: { id: keyId } });
    if (!key) throw new NotFoundException('Key not found');
    if (key.userId !== userId) throw new ForbiddenException('Not your key');
    await this.prisma.objectStorageKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
    return { revoked: true, id: keyId };
  }

  /** Usage reported by the storage gateway; enforces the quota. */
  async reportUsage(bucketId: string, usedBytes: number, objectCount: number) {
    const bucket = await this.prisma.objectStorageBucket.update({
      where: { id: bucketId },
      data: {
        usedBytes: BigInt(Math.max(0, Math.floor(usedBytes))),
        objectCount: Math.max(0, Math.floor(objectCount)),
      },
    });
    const quotaBytes = bucket.quotaGb * 1024 ** 3;
    return { overQuota: Number(bucket.usedBytes) > quotaBytes, quotaBytes };
  }

  /**
   * Presign a GET URL for an object using the bucket's active key.
   * Signature is HMAC-SHA256 over "<bucket>/<key>:<expiry>" — verified by the gateway.
   */
  async presignGet(userId: string, bucketId: string, objectKey: string, ttlSeconds = 900) {
    const bucket = await this.ownedBucket(userId, bucketId);
    const key = await this.prisma.objectStorageKey.findFirst({
      where: { bucketId: bucket.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!key) throw new BadRequestException('Create an access key first');

    const expires = Math.floor(Date.now() / 1000) + Math.min(Math.max(ttlSeconds, 30), 604800);
    const secret = decryptSecret(key.secretCipher);
    const signature = createHmac('sha256', secret)
      .update(`${bucket.name}/${objectKey}:${expires}`)
      .digest('hex');

    const url = `${bucket.endpoint}/${bucket.name}/${objectKey}?X-VC-Key=${key.accessKey}&X-VC-Expires=${expires}&X-VC-Signature=${signature}`;
    return { url, expiresAt: new Date(expires * 1000).toISOString() };
  }
}
