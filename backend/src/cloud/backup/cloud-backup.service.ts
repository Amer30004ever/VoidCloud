import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KubernetesService } from '../kubernetes/kubernetes.service';

@Injectable()
export class CloudBackupService {
  private readonly logger = new Logger(CloudBackupService.name);

  constructor(
    private prisma: PrismaService,
    private k8s: KubernetesService,
  ) {}

  async backup(deploymentId: string) {
    const dep = await this.prisma.cloudDeployment.findUnique({
      where: { id: deploymentId },
    });
    if (!dep) throw new NotFoundException();
    const path = `s3://${process.env.S3_BACKUP_BUCKET || 'amercloud-backups'}/${deploymentId}/${Date.now()}.yaml`;
    const record = await this.prisma.cloudBackup.create({
      data: { deploymentId, storagePath: path, status: 'in_progress' },
    });
    // TODO: dump manifests + PVCs to S3
    await this.prisma.cloudBackup.update({
      where: { id: record.id },
      data: { status: 'ready' },
    });
    return record;
  }

  list(deploymentId: string) {
    return this.prisma.cloudBackup.findMany({
      where: { deploymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async restore(backupId: string) {
    const b = await this.prisma.cloudBackup.findUnique({
      where: { id: backupId },
    });
    if (!b) throw new NotFoundException();
    this.logger.log(
      `Restoring deployment ${b.deploymentId} from ${b.storagePath}`,
    );
    return { ok: true };
  }
}
