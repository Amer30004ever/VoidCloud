import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'] as const;
type RecordType = (typeof RECORD_TYPES)[number];

export interface CreateDNSRecordDto {
  type: RecordType;
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}

function validateDomainName(d: string): string {
  const norm = d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (!DOMAIN_RE.test(norm))
    throw new BadRequestException('Invalid domain name');
  return norm;
}

function validateRecord(input: CreateDNSRecordDto) {
  if (!RECORD_TYPES.includes(input.type))
    throw new BadRequestException('Invalid record type');
  if (!input.name || input.name.length > 253)
    throw new BadRequestException('Invalid record name');
  if (!input.value || input.value.length > 4000)
    throw new BadRequestException('Invalid record value');
  if (input.ttl != null && (input.ttl < 60 || input.ttl > 604800))
    throw new BadRequestException('TTL must be 60-604800');
  if (
    input.type === 'MX' &&
    (input.priority == null || input.priority < 0 || input.priority > 65535)
  ) {
    throw new BadRequestException('MX records require priority 0-65535');
  }
  if (input.type === 'A' && !/^\d{1,3}(\.\d{1,3}){3}$/.test(input.value)) {
    throw new BadRequestException('Invalid IPv4 for A record');
  }
}

@Injectable()
export class DNSService {
  constructor(private prisma: PrismaService) {}

  private async assertVpsOwner(vpsId: string, userId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({
      where: { id: vpsId },
    });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  private async assertDomainOwner(domainId: string, userId: string) {
    const d = await this.prisma.domain.findUnique({ where: { id: domainId } });
    if (!d) throw new NotFoundException('Domain not found');
    if (d.userId !== userId) throw new ForbiddenException();
    return d;
  }

  async addDomain(
    vpsId: string,
    userId: string,
    domain: string,
    autoSSL: boolean,
  ) {
    const vps = await this.assertVpsOwner(vpsId, userId);
    const name = validateDomainName(domain);
    const existing = await this.prisma.domain.findUnique({
      where: { domain: name },
    });
    if (existing) throw new BadRequestException('Domain already registered');
    const verifyToken = `amercloud-verify=${randomBytes(16).toString('hex')}`;
    const created = await this.prisma.domain.create({
      data: { vpsId, userId, domain: name, autoSSL, verifyToken },
    });
    // Seed a default A record pointing to the VPS IP if known.
    if (vps.ipv4Address) {
      await this.prisma.dNSRecord.create({
        data: {
          domainId: created.id,
          type: 'A',
          name: '@',
          value: vps.ipv4Address,
          ttl: 3600,
        },
      });
    }
    return created;
  }

  listForVps(vpsId: string, userId: string) {
    return this.assertVpsOwner(vpsId, userId).then(() =>
      this.prisma.domain.findMany({
        where: { vpsId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { dnsRecords: true } } },
      }),
    );
  }

  async getVerificationInstructions(domainId: string, userId: string) {
    const d = await this.assertDomainOwner(domainId, userId);
    return {
      verified: !!d.verifiedAt,
      domain: d.domain,
      instructions: `Add a TXT record at _amercloud.${d.domain} with the value below to prove ownership.`,
      record: {
        type: 'TXT',
        name: `_amercloud.${d.domain}`,
        value: d.verifyToken,
      },
    };
  }

  async verifyDomain(domainId: string, userId: string) {
    const d = await this.assertDomainOwner(domainId, userId);
    // TODO: actually resolve TXT record via DNS lookup (DoH). For now, mark verified optimistically.
    const updated = await this.prisma.domain.update({
      where: { id: domainId },
      data: { verifiedAt: new Date() },
    });
    if (d.autoSSL) {
      await this.requestSSL(domainId, userId);
    }
    return { verified: true, domain: updated };
  }

  async requestSSL(domainId: string, userId: string) {
    const d = await this.assertDomainOwner(domainId, userId);
    if (!d.verifiedAt)
      throw new BadRequestException(
        'Domain must be verified before issuing SSL',
      );
    // TODO: call Let's Encrypt (ACME) and store certificate in secrets store.
    const now = new Date();
    const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return this.prisma.domain.update({
      where: { id: domainId },
      data: { sslIssuedAt: now, sslExpiresAt: expires, autoSSL: true },
    });
  }

  async deleteDomain(domainId: string, userId: string) {
    await this.assertDomainOwner(domainId, userId);
    // TODO: revoke SSL cert and detach from VPS proxy
    await this.prisma.domain.delete({ where: { id: domainId } });
    return { ok: true };
  }

  async addDNSRecord(
    domainId: string,
    userId: string,
    dto: CreateDNSRecordDto,
  ) {
    await this.assertDomainOwner(domainId, userId);
    validateRecord(dto);
    // TODO: push to upstream DNS provider
    return this.prisma.dNSRecord.create({
      data: {
        domainId,
        type: dto.type,
        name: dto.name.trim(),
        value: dto.value.trim(),
        ttl: dto.ttl ?? 3600,
        priority: dto.type === 'MX' ? (dto.priority ?? 10) : null,
      },
    });
  }

  async getDNSRecords(domainId: string, userId: string) {
    await this.assertDomainOwner(domainId, userId);
    return this.prisma.dNSRecord.findMany({
      where: { domainId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async deleteDNSRecord(recordId: string, userId: string) {
    const rec = await this.prisma.dNSRecord.findUnique({
      where: { id: recordId },
      include: { domain: true },
    });
    if (!rec) throw new NotFoundException('Record not found');
    if (rec.domain.userId !== userId) throw new ForbiddenException();
    await this.prisma.dNSRecord.delete({ where: { id: recordId } });
    return { ok: true };
  }
}
