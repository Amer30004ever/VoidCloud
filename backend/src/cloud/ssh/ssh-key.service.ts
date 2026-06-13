import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const SSH_KEY_RE = /^(ssh-(rsa|ed25519|dss)|ecdsa-sha2-[a-z0-9-]+)\s+([A-Za-z0-9+/=]+)(\s+\S+)?\s*$/;

function parseAndFingerprint(publicKey: string): { normalized: string; fingerprint: string } {
  const trimmed = publicKey.trim();
  const m = trimmed.match(SSH_KEY_RE);
  if (!m) throw new BadRequestException('Invalid SSH public key format');
  const body = m[3];
  let raw: Buffer;
  try { raw = Buffer.from(body, 'base64'); }
  catch { throw new BadRequestException('Invalid SSH public key base64'); }
  if (raw.length < 16) throw new BadRequestException('SSH public key body too short');
  const sha = createHash('sha256').update(raw).digest('base64').replace(/=+$/, '');
  return { normalized: trimmed, fingerprint: `SHA256:${sha}` };
}

@Injectable()
export class SSHKeyService {
  constructor(private prisma: PrismaService) {}

  async addKey(userId: string, name: string, publicKey: string) {
    if (!name?.trim()) throw new BadRequestException('Name is required');
    if (name.length > 100) throw new BadRequestException('Name too long');
    const { normalized, fingerprint } = parseAndFingerprint(publicKey);
    const existing = await this.prisma.sSHKey.findUnique({ where: { publicKey: normalized } });
    if (existing) {
      if (existing.userId !== userId) throw new BadRequestException('Key already registered');
      return existing;
    }
    return this.prisma.sSHKey.create({
      data: { userId, name: name.trim(), publicKey: normalized, fingerprint },
    });
  }

  listKeys(userId: string) {
    return this.prisma.sSHKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { vpses: { select: { id: true, name: true } } },
    });
  }

  async deleteKey(keyId: string, userId: string) {
    const key = await this.prisma.sSHKey.findUnique({ where: { id: keyId } });
    if (!key) throw new NotFoundException();
    if (key.userId !== userId) throw new ForbiddenException();
    await this.prisma.sSHKey.delete({ where: { id: keyId } });
    return { ok: true };
  }

  private async assertVpsOwner(vpsId: string, userId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  async addKeyToVPS(keyId: string, vpsId: string, userId: string) {
    await this.assertVpsOwner(vpsId, userId);
    const key = await this.prisma.sSHKey.findUnique({ where: { id: keyId } });
    if (!key || key.userId !== userId) throw new NotFoundException('Key not found');
    await this.prisma.cloudDeployment.update({
      where: { id: vpsId },
      data: { sshKeys: { connect: { id: keyId } } },
    });
    // TODO: push authorized_keys into Proxmox container
    return { ok: true };
  }

  async removeKeyFromVPS(keyId: string, vpsId: string, userId: string) {
    await this.assertVpsOwner(vpsId, userId);
    await this.prisma.cloudDeployment.update({
      where: { id: vpsId },
      data: { sshKeys: { disconnect: { id: keyId } } },
    });
    return { ok: true };
  }

  async getKeysForVPS(vpsId: string, userId: string) {
    await this.assertVpsOwner(vpsId, userId);
    return this.prisma.sSHKey.findMany({ where: { vpses: { some: { id: vpsId } } } });
  }
}
