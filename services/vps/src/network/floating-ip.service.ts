import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { expandIpv4Cidr, normalizeAddresses, detectIpVersion } from './floating-ip';

/**
 * Tier 9 — Floating IP pool management (IPv4 + IPv6).
 *
 * Allocation runs inside a Serializable transaction and re-checks the row's
 * status inside the transaction, so two concurrent allocations can never hand
 * the same address to two tenants.
 */
@Injectable()
export class FloatingIpService {
  private readonly logger = new Logger(FloatingIpService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Admin: import addresses into a pool, from a CIDR or an explicit list. */
  async importPool(input: {
    poolName?: string;
    cidr?: string;
    addresses?: string[];
    gateway?: string;
  }) {
    const poolName = input.poolName?.trim() || 'default';

    let entries: { address: string; ipVersion: 4 | 6 }[];
    try {
      entries = input.cidr
        ? normalizeAddresses(expandIpv4Cidr(input.cidr))
        : normalizeAddresses(input.addresses ?? []);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid pool definition',
      );
    }

    if (entries.length === 0) {
      throw new BadRequestException('No valid addresses supplied');
    }

    const result = await this.prisma.floatingIp.createMany({
      data: entries.map((entry) => ({
        address: entry.address,
        ipVersion: entry.ipVersion,
        cidr: input.cidr ?? null,
        gateway: input.gateway ?? null,
        poolName,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Imported ${result.count} floating IPs into pool "${poolName}"`);
    return { poolName, requested: entries.length, imported: result.count };
  }

  /** Admin: pool-level inventory counts. */
  async inventory() {
    const grouped = await this.prisma.floatingIp.groupBy({
      by: ['poolName', 'ipVersion', 'status'],
      _count: { _all: true },
    });
    return grouped.map((row) => ({
      poolName: row.poolName,
      ipVersion: row.ipVersion,
      status: row.status,
      count: row._count._all,
    }));
  }

  /** Tenant: floating IPs reserved by or assigned to this user. */
  async listForUser(userId: string) {
    return this.prisma.floatingIp.findMany({
      where: { userId },
      orderBy: [{ ipVersion: 'asc' }, { address: 'asc' }],
    });
  }

  /**
   * Reserve the next free address of the requested version for a user.
   * Serializable + in-transaction status re-check prevents double allocation.
   */
  async reserve(userId: string, opts: { ipVersion?: 4 | 6; poolName?: string } = {}) {
    const ipVersion = opts.ipVersion ?? 4;
    const poolName = opts.poolName ?? 'default';

    return this.prisma.$transaction(
      async (tx) => {
        const candidate = await tx.floatingIp.findFirst({
          where: { status: 'AVAILABLE', ipVersion, poolName, userId: null },
          orderBy: { address: 'asc' },
        });
        if (!candidate) {
          throw new ConflictException(
            `No available IPv${ipVersion} address in pool "${poolName}"`,
          );
        }

        const claimed = await tx.floatingIp.updateMany({
          where: { id: candidate.id, status: 'AVAILABLE' },
          data: { status: 'RESERVED', userId, reservedAt: new Date() },
        });
        if (claimed.count !== 1) {
          throw new ConflictException('Address was taken concurrently, retry');
        }

        return tx.floatingIp.findUniqueOrThrow({ where: { id: candidate.id } });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  /** Attach a reserved address to one of the caller's own VPS instances. */
  async assign(userId: string, floatingIpId: string, vpsId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({
      where: { id: vpsId },
      select: { id: true, userId: true },
    });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException('VPS does not belong to caller');

    const ip = await this.prisma.floatingIp.findUnique({ where: { id: floatingIpId } });
    if (!ip) throw new NotFoundException('Floating IP not found');
    if (ip.userId !== userId) {
      throw new ForbiddenException('Floating IP is not reserved by caller');
    }
    if (ip.status === 'ASSIGNED' && ip.vpsId && ip.vpsId !== vpsId) {
      throw new ConflictException('Floating IP is already attached to another VPS');
    }

    const updated = await this.prisma.floatingIp.update({
      where: { id: floatingIpId },
      data: { status: 'ASSIGNED', vpsId, assignedAt: new Date() },
    });

    // Mirror onto the VPS record so the dashboard and DNS tooling see it.
    if (ip.ipVersion === 6) {
      await this.prisma.cloudDeployment.update({
        where: { id: vpsId },
        data: { ipv6Address: updated.address },
      });
    }

    return updated;
  }

  /** Detach from the VPS but keep the reservation with the tenant. */
  async unassign(userId: string, floatingIpId: string) {
    const ip = await this.prisma.floatingIp.findUnique({ where: { id: floatingIpId } });
    if (!ip) throw new NotFoundException('Floating IP not found');
    if (ip.userId !== userId) throw new ForbiddenException('Floating IP is not reserved by caller');

    if (ip.ipVersion === 6 && ip.vpsId) {
      await this.prisma.cloudDeployment.updateMany({
        where: { id: ip.vpsId, ipv6Address: ip.address },
        data: { ipv6Address: null },
      });
    }

    return this.prisma.floatingIp.update({
      where: { id: floatingIpId },
      data: { status: 'RESERVED', vpsId: null, assignedAt: null },
    });
  }

  /** Return the address to the pool. */
  async release(userId: string, floatingIpId: string) {
    const ip = await this.prisma.floatingIp.findUnique({ where: { id: floatingIpId } });
    if (!ip) throw new NotFoundException('Floating IP not found');
    if (ip.userId !== userId) throw new ForbiddenException('Floating IP is not reserved by caller');

    if (ip.ipVersion === 6 && ip.vpsId) {
      await this.prisma.cloudDeployment.updateMany({
        where: { id: ip.vpsId, ipv6Address: ip.address },
        data: { ipv6Address: null },
      });
    }

    return this.prisma.floatingIp.update({
      where: { id: floatingIpId },
      data: {
        status: 'AVAILABLE',
        userId: null,
        vpsId: null,
        reservedAt: null,
        assignedAt: null,
      },
    });
  }

  /** Validation helper exposed for the controller/DTO layer. */
  validateAddress(address: string): 4 | 6 {
    const version = detectIpVersion(address);
    if (!version) throw new BadRequestException(`Invalid IP address: ${address}`);
    return version;
  }
}
