import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AppDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  installCommand: string;
}

export const AVAILABLE_APPS: AppDefinition[] = [
  { id: 'nodejs', name: 'Node.js (LTS)', category: 'Runtime', description: 'JavaScript runtime', installCommand: 'curl -fsSL https://deb.nodesource.com/setup_lts.x | bash && apt-get install -y nodejs' },
  { id: 'docker', name: 'Docker', category: 'Runtime', description: 'Container engine', installCommand: 'curl -fsSL https://get.docker.com | sh' },
  { id: 'gitlab', name: 'GitLab CE', category: 'DevOps', description: 'Git hosting & CI/CD', installCommand: 'apt-get install -y gitlab-ce' },
  { id: 'jenkins', name: 'Jenkins', category: 'DevOps', description: 'CI/CD automation', installCommand: 'apt-get install -y jenkins' },
  { id: 'terraform', name: 'Terraform', category: 'DevOps', description: 'Infrastructure as code', installCommand: 'apt-get install -y terraform' },
  { id: 'python', name: 'Python 3', category: 'Runtime', description: 'Python interpreter', installCommand: 'apt-get install -y python3 python3-pip' },
  { id: 'mysql', name: 'MySQL 8.x', category: 'Database', description: 'Relational database', installCommand: 'apt-get install -y mysql-server' },
  { id: 'mongodb', name: 'MongoDB', category: 'Database', description: 'Document database', installCommand: 'apt-get install -y mongodb' },
  { id: 'postgresql', name: 'PostgreSQL 15', category: 'Database', description: 'Relational database', installCommand: 'apt-get install -y postgresql-15' },
  { id: 'redis', name: 'Redis', category: 'Database', description: 'In-memory key/value store', installCommand: 'apt-get install -y redis-server' },
  { id: 'nginx', name: 'Nginx', category: 'Web', description: 'Web/reverse proxy server', installCommand: 'apt-get install -y nginx' },
  { id: 'wordpress', name: 'WordPress', category: 'Web', description: 'CMS', installCommand: 'wp core download && wp core install' },
  { id: 'laravel', name: 'Laravel', category: 'Framework', description: 'PHP framework', installCommand: 'composer create-project laravel/laravel app' },
  { id: 'django', name: 'Django', category: 'Framework', description: 'Python framework', installCommand: 'pip3 install django' },
];

@Injectable()
export class VpsSnapshotService {
  constructor(private prisma: PrismaService) {}

  private async ensureOwnership(userId: string, vpsId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  async list(userId: string, vpsId: string) {
    await this.ensureOwnership(userId, vpsId);
    const snaps = await this.prisma.vPSSnapshot.findMany({ where: { vpsId }, orderBy: { createdAt: 'desc' } });
    return snaps.map((s) => ({ ...s, sizeBytes: s.sizeBytes.toString() }));
  }

  async create(userId: string, vpsId: string, name: string, description?: string) {
    await this.ensureOwnership(userId, vpsId);
    // Stub: Proxmox snapshot API call would go here.
    const snap = await this.prisma.vPSSnapshot.create({
      data: {
        vpsId, userId, name, description,
        status: 'READY',
        proxmoxSnapshotName: `snap_${Date.now()}`,
        sizeBytes: BigInt(Math.floor(Math.random() * 5_000_000_000)),
        completedAt: new Date(),
      },
    });
    return { ...snap, sizeBytes: snap.sizeBytes.toString() };
  }

  async restore(userId: string, snapshotId: string) {
    const snap = await this.prisma.vPSSnapshot.findUnique({ where: { id: snapshotId } });
    if (!snap) throw new NotFoundException();
    if (snap.userId !== userId) throw new ForbiddenException();
    // Stub: Proxmox rollback would go here.
    return { ok: true, restoredAt: new Date().toISOString() };
  }

  async remove(userId: string, snapshotId: string) {
    const snap = await this.prisma.vPSSnapshot.findUnique({ where: { id: snapshotId } });
    if (!snap) throw new NotFoundException();
    if (snap.userId !== userId) throw new ForbiddenException();
    await this.prisma.vPSSnapshot.delete({ where: { id: snapshotId } });
    return { ok: true };
  }
}

@Injectable()
export class VpsAppsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return AVAILABLE_APPS;
  }

  async install(userId: string, vpsId: string, appIds: string[]) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    const valid = appIds.filter((id) => AVAILABLE_APPS.find((a) => a.id === id));
    const merged = Array.from(new Set([...(vps.apps ?? []), ...valid]));
    const installedApps: Record<string, { status: string; installedAt: string }> = {
      ...((vps.installedApps as Record<string, { status: string; installedAt: string }>) ?? {}),
    };
    for (const id of valid) {
      installedApps[id] = { status: 'INSTALLED', installedAt: new Date().toISOString() };
    }
    const updated = await this.prisma.cloudDeployment.update({
      where: { id: vpsId },
      data: { apps: merged, installedApps },
    });
    return { apps: updated.apps, installedApps: updated.installedApps };
  }

  async status(userId: string, vpsId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException();
    if (vps.userId !== userId) throw new ForbiddenException();
    return { apps: vps.apps ?? [], installedApps: vps.installedApps ?? {} };
  }
}
