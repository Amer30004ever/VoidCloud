import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudDeploymentsService } from '../cloud-deployments.service';
import { randomBytes } from 'crypto';

export type ImageType = 'SNAPSHOT' | 'CUSTOM' | 'MARKETPLACE';

@Injectable()
export class ImageService {
  constructor(
    private prisma: PrismaService,
    private deployments: CloudDeploymentsService,
  ) { }

  private async assertVpsOwner(vpsId: string, userId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({
      where: { id: vpsId },
    });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  private async assertImageAccess(imageId: string, userId: string) {
    const image = await this.prisma.customImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Image not found');
    if (image.userId === userId || image.isPublic) return image;
    const share = await this.prisma.customImageShare.findFirst({
      where: { imageId, sharedWithEmail: userId },
    });
    if (!share) throw new ForbiddenException();
    return image;
  }

  async createSnapshot(
    vpsId: string,
    userId: string,
    name: string,
    description?: string,
  ) {
    if (!name?.trim()) throw new BadRequestException('Name is required');
    const vps = await this.assertVpsOwner(vpsId, userId);
    // TODO: trigger Proxmox snapshot via ProxmoxService
    const sizeMB = vps.storage ?? 1024;
    return this.prisma.customImage.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        type: 'SNAPSHOT',
        sourceVpsId: vpsId,
        sizeMB,
        storageUrl: `proxmox://snapshot/${vpsId}/${randomBytes(6).toString('hex')}`,
      },
    });
  }

  async createFromUpload(
    userId: string,
    name: string,
    sizeMB: number,
    storageUrl: string,
    description?: string,
  ) {
    if (!name?.trim()) throw new BadRequestException('Name is required');
    if (!storageUrl) throw new BadRequestException('storageUrl required');
    // TODO: convert to Proxmox template format
    return this.prisma.customImage.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        type: 'CUSTOM',
        sizeMB: Math.max(0, Math.floor(sizeMB || 0)),
        storageUrl,
      },
    });
  }

  async listUserImages(userId: string) {
    const owned = await this.prisma.customImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { sourceVps: { select: { id: true, name: true } } },
    });
    // Temporarily disable shared images due to Prisma schema mismatch
    // const shared = await this.prisma.customImageShare.findMany({
    //   where: { sharedWithEmail: userId },
    //   include: {
    //     image: {
    //       include: { sourceVps: { select: { id: true, name: true } } },
    //     },
    //   },
    // });
    return owned;
    // return [
    //   ...owned,
    //   ...shared.map((s: any) => ({ ...s.image, _shared: true })),
    // ];
  }

  listMarketplaceImages() {
    return this.prisma.customImage.findMany({
      where: { isPublic: true, type: 'MARKETPLACE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteImage(imageId: string, userId: string) {
    const image = await this.prisma.customImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException();
    if (image.userId !== userId) throw new ForbiddenException();
    await this.prisma.customImage.delete({ where: { id: imageId } });
    return { ok: true };
  }

  async deployFromImage(imageId: string, userId: string, vpsName: string) {
    if (!vpsName?.trim()) throw new BadRequestException('vpsName required');
    const image = await this.assertImageAccess(imageId, userId);
    // TODO: clone Proxmox template instead of fresh provision
    return this.deployments.create(userId, {
      name: vpsName.trim(),
      type: 'DOCKER_IMAGE',
      source: image.storageUrl || `image:${image.id}`,
    });
  }

  async shareImage(imageId: string, userId: string, shareWithEmail: string) {
    const image = await this.prisma.customImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException();
    if (image.userId !== userId) throw new ForbiddenException();
    const target = await this.prisma.user.findUnique({
      where: { email: shareWithEmail.toLowerCase().trim() },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === userId)
      throw new BadRequestException('Cannot share with yourself');
    await this.prisma.customImageShare.upsert({
      where: {
        imageId_sharedWithEmail: {
          imageId,
          sharedWithEmail: target.id,
        },
      },
      update: { sharedAt: new Date() },
      create: {
        imageId,
        sharedWithEmail: target.id,
        sharedBy: userId,
      },
    });
    return { ok: true };
  }

  async makePublic(imageId: string, userId: string, isPublic: boolean) {
    const image = await this.prisma.customImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException();
    if (image.userId !== userId) throw new ForbiddenException();
    return this.prisma.customImage.update({
      where: { id: imageId },
      data: {
        isPublic,
        type: isPublic
          ? 'MARKETPLACE'
          : image.type === 'MARKETPLACE'
            ? 'CUSTOM'
            : image.type,
      },
    });
  }
}