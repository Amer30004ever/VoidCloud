import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface FirewallRuleInput {
  name: string;
  priority?: number;
  action: 'ALLOW' | 'DENY';
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'ANY';
  port?: string | null;
  sourceIP?: string | null;
  description?: string | null;
  enabled?: boolean;
}

const ACTIONS = ['ALLOW', 'DENY'];
const PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'ANY'];
const PORT_RE = /^(ANY|\d{1,5}(-\d{1,5})?)$/i;
// Allow IPv4, IPv4 CIDR, ANY. Keep it pragmatic.
const SOURCE_RE = /^(ANY|((\d{1,3}\.){3}\d{1,3})(\/\d{1,2})?)$/i;

const DEFAULT_RULES: FirewallRuleInput[] = [
  { name: 'Allow SSH',   priority: 10, action: 'ALLOW', protocol: 'TCP', port: '22',  sourceIP: 'ANY', description: 'SSH access' },
  { name: 'Allow HTTP',  priority: 20, action: 'ALLOW', protocol: 'TCP', port: '80',  sourceIP: 'ANY', description: 'HTTP traffic' },
  { name: 'Allow HTTPS', priority: 30, action: 'ALLOW', protocol: 'TCP', port: '443', sourceIP: 'ANY', description: 'HTTPS traffic' },
];

@Injectable()
export class FirewallService {
  constructor(private prisma: PrismaService) {}

  private validate(data: FirewallRuleInput) {
    if (!data.name?.trim() || data.name.length > 100) throw new BadRequestException('Invalid name');
    if (!ACTIONS.includes(data.action)) throw new BadRequestException('Invalid action');
    if (!PROTOCOLS.includes(data.protocol)) throw new BadRequestException('Invalid protocol');
    if (data.port && !PORT_RE.test(data.port)) throw new BadRequestException('Invalid port');
    if (data.sourceIP && !SOURCE_RE.test(data.sourceIP)) throw new BadRequestException('Invalid source IP / CIDR');
    if (data.protocol === 'ICMP' && data.port && data.port !== 'ANY') throw new BadRequestException('ICMP cannot have a port');
  }

  private async assertVps(vpsId: string, userId: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    return vps;
  }

  private async loadRule(ruleId: string, userId: string) {
    const rule = await this.prisma.firewallRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException();
    if (rule.userId !== userId) throw new ForbiddenException();
    return rule;
  }

  async getRules(vpsId: string, userId: string) {
    await this.assertVps(vpsId, userId);
    return this.prisma.firewallRule.findMany({
      where: { vpsId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createRule(vpsId: string, userId: string, data: FirewallRuleInput) {
    await this.assertVps(vpsId, userId);
    this.validate(data);
    // TODO: push rule to Proxmox firewall
    return this.prisma.firewallRule.create({
      data: {
        vpsId, userId,
        name: data.name.trim(),
        priority: data.priority ?? 100,
        action: data.action,
        protocol: data.protocol,
        port: data.port?.trim() || null,
        sourceIP: data.sourceIP?.trim() || null,
        description: data.description?.trim() || null,
        enabled: data.enabled ?? true,
      },
    });
  }

  async updateRule(ruleId: string, userId: string, data: Partial<FirewallRuleInput>) {
    const existing = await this.loadRule(ruleId, userId);
    const merged: FirewallRuleInput = {
      name: data.name ?? existing.name,
      action: (data.action ?? existing.action) as FirewallRuleInput['action'],
      protocol: (data.protocol ?? existing.protocol) as FirewallRuleInput['protocol'],
      port: data.port !== undefined ? data.port : existing.port,
      sourceIP: data.sourceIP !== undefined ? data.sourceIP : existing.sourceIP,
      description: data.description !== undefined ? data.description : existing.description,
      priority: data.priority ?? existing.priority,
      enabled: data.enabled ?? existing.enabled,
    };
    this.validate(merged);
    // TODO: update Proxmox firewall
    return this.prisma.firewallRule.update({ where: { id: ruleId }, data: merged });
  }

  async toggleRule(ruleId: string, userId: string) {
    const rule = await this.loadRule(ruleId, userId);
    return this.prisma.firewallRule.update({ where: { id: ruleId }, data: { enabled: !rule.enabled } });
  }

  async deleteRule(ruleId: string, userId: string) {
    await this.loadRule(ruleId, userId);
    // TODO: remove from Proxmox firewall
    await this.prisma.firewallRule.delete({ where: { id: ruleId } });
    return { ok: true };
  }

  async reorderRules(vpsId: string, userId: string, ruleIds: string[]) {
    await this.assertVps(vpsId, userId);
    const rules = await this.prisma.firewallRule.findMany({ where: { vpsId } });
    const ownIds = new Set(rules.map((r) => r.id));
    for (const id of ruleIds) if (!ownIds.has(id)) throw new BadRequestException('Rule does not belong to VPS');
    await this.prisma.$transaction(
      ruleIds.map((id, i) =>
        this.prisma.firewallRule.update({ where: { id }, data: { priority: (i + 1) * 10 } }),
      ),
    );
    return this.getRules(vpsId, userId);
  }

  getDefaultRules() {
    return DEFAULT_RULES;
  }

  async resetToDefault(vpsId: string, userId: string) {
    await this.assertVps(vpsId, userId);
    await this.prisma.firewallRule.deleteMany({ where: { vpsId } });
    await this.prisma.$transaction(
      DEFAULT_RULES.map((r) =>
        this.prisma.firewallRule.create({
          data: {
            vpsId, userId,
            name: r.name, priority: r.priority ?? 100, action: r.action, protocol: r.protocol,
            port: r.port ?? null, sourceIP: r.sourceIP ?? null, description: r.description ?? null, enabled: true,
          },
        }),
      ),
    );
    return this.getRules(vpsId, userId);
  }
}
