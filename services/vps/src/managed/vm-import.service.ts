import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateWebhookUrl } from '../../../../shared/ssrf/url-validator';

const ALLOWED_FORMATS = ['qcow2', 'vmdk', 'vhdx', 'raw', 'ova'];
const MAX_SIZE_BYTES = 512 * 1024 ** 3; // 512 GiB

/**
 * Tier 9 — BYO VM import (bring your own image).
 *
 * Accepts a remote disk image URL, validates it against SSRF rules, and tracks
 * download → convert → import progress until a VPS record exists.
 */
@Injectable()
export class VmImportService {
  private readonly logger = new Logger(VmImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  formats() {
    return ALLOWED_FORMATS;
  }

  async create(
    userId: string,
    input: {
      name: string;
      sourceUrl: string;
      sourceFormat?: string;
      checksum?: string;
      sizeBytes?: number;
      targetClusterId?: string;
      cpuCores?: number;
      memoryMb?: number;
      diskGb?: number;
    },
  ) {
    const name = (input.name || '').trim();
    if (name.length < 3) throw new BadRequestException('Name must be at least 3 characters');

    const format = (input.sourceFormat || 'qcow2').toLowerCase();
    if (!ALLOWED_FORMATS.includes(format)) {
      throw new BadRequestException(`Unsupported format. Allowed: ${ALLOWED_FORMATS.join(', ')}`);
    }

    // Block private/link-local targets — the importer fetches this URL server-side.
    try {
      await validateWebhookUrl(input.sourceUrl);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid source URL',
      );
    }

    const sizeBytes = Math.max(0, Math.floor(input.sizeBytes ?? 0));
    if (sizeBytes > MAX_SIZE_BYTES) {
      throw new BadRequestException('Image exceeds the 512 GiB import limit');
    }

    if (input.targetClusterId) {
      const cluster = await this.prisma.proxmoxCluster.findUnique({
        where: { id: input.targetClusterId },
      });
      if (!cluster) throw new BadRequestException('Target cluster not found');
    }

    const job = await this.prisma.vmImportJob.create({
      data: {
        userId,
        name,
        sourceType: 'URL',
        sourceUrl: input.sourceUrl,
        sourceFormat: format,
        checksum: input.checksum ?? null,
        sizeBytes: BigInt(sizeBytes),
        targetClusterId: input.targetClusterId ?? null,
        cpuCores: Math.min(Math.max(input.cpuCores ?? 2, 1), 32),
        memoryMb: Math.min(Math.max(input.memoryMb ?? 2048, 512), 131072),
        diskGb: Math.min(Math.max(input.diskGb ?? 40, 10), 2000),
      },
    });

    this.logger.log(`VM import job ${job.id} queued for user ${userId}`);
    return this.toPublic(job);
  }

  async list(userId: string) {
    const rows = await this.prisma.vmImportJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.toPublic(row));
  }

  private async owned(userId: string, id: string) {
    const job = await this.prisma.vmImportJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Import job not found');
    if (job.userId !== userId) throw new ForbiddenException('Not your import job');
    return job;
  }

  async get(userId: string, id: string) {
    return this.toPublic(await this.owned(userId, id));
  }

  /** Worker callback: advance the job through its lifecycle. */
  async updateProgress(
    id: string,
    patch: { status?: string; progress?: number; vpsId?: string; errorMessage?: string },
  ) {
    const progress =
      patch.progress === undefined ? undefined : Math.min(Math.max(Math.floor(patch.progress), 0), 100);
    const job = await this.prisma.vmImportJob.update({
      where: { id },
      data: {
        status: patch.status as any,
        progress,
        vpsId: patch.vpsId,
        errorMessage: patch.errorMessage?.slice(0, 500),
      },
    });
    return this.toPublic(job);
  }

  async cancel(userId: string, id: string) {
    const job = await this.owned(userId, id);
    if (job.status === 'COMPLETED') {
      throw new BadRequestException('Completed imports cannot be cancelled');
    }
    const updated = await this.prisma.vmImportJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', errorMessage: 'Cancelled by user' },
    });
    return this.toPublic(updated);
  }

  private toPublic(job: any) {
    return { ...job, sizeBytes: Number(job.sizeBytes ?? 0) };
  }
}
