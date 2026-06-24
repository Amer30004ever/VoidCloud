/* eslint-disable @typescript-eslint/no-explicit-any */
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// In-memory stubs — replace with Prisma models in a follow-up migration.
const enterpriseStore = new Map<string, any>();
const teamStore = new Map<string, any[]>();
const apiKeyStore = new Map<string, any[]>();
const resellerStore = new Map<string, any>();

function defaultEnterprise(orgId: string) {
  return {
    orgId,
    plan: 'BUSINESS', // BUSINESS | ENTERPRISE
    soc2Enabled: false,
    hipaaEnabled: false,
    customSlaPercent: 99.9, // 99.9, 99.95, 99.99
    dedicatedSupport: false,
    supportResponseHours: 24,
    privateNetworking: false,
    vpcCidr: null as string | null,
    dedicatedHardware: false,
    customDomainLimit: 1,
    teamMemberLimit: 1,
    advancedMonitoring: false,
    customBranding: false,
    brandLogoUrl: null as string | null,
    brandPrimaryColor: null as string | null,
    updatedAt: new Date().toISOString(),
  };
}

@ApiTags('cloud-enterprise')
@UseGuards(JwtAuthGuard)
@Controller('cloud/enterprise')
export class CloudEnterpriseController {
  @Get()
  get() {
    const orgId = 'default';
    if (!enterpriseStore.has(orgId)) enterpriseStore.set(orgId, defaultEnterprise(orgId));
    return enterpriseStore.get(orgId);
  }

  @Put()
  update(@Body() body: any) {
    const orgId = 'default';
    const cur = enterpriseStore.get(orgId) ?? defaultEnterprise(orgId);
    // Auto-derive limits from plan
    let limits = {};
    if (body.plan === 'BUSINESS') {
      limits = { customDomainLimit: 10, teamMemberLimit: 10, supportResponseHours: 2, advancedMonitoring: true };
    } else if (body.plan === 'ENTERPRISE') {
      limits = {
        customDomainLimit: 100,
        teamMemberLimit: 100,
        supportResponseHours: 1,
        advancedMonitoring: true,
        dedicatedSupport: true,
      };
    }
    const next = { ...cur, ...limits, ...body, orgId, updatedAt: new Date().toISOString() };
    enterpriseStore.set(orgId, next);
    return next;
  }

  @Get('soc2/report')
  soc2Report() {
    return {
      reportId: randomBytes(8).toString('hex'),
      generatedAt: new Date().toISOString(),
      period: 'Last 90 days',
      controls: [
        { id: 'CC1.1', name: 'Control Environment', status: 'PASS' },
        { id: 'CC6.1', name: 'Logical Access', status: 'PASS' },
        { id: 'CC7.2', name: 'System Monitoring', status: 'PASS' },
        { id: 'CC8.1', name: 'Change Management', status: 'PASS' },
        { id: 'A1.2', name: 'Availability', status: 'PASS' },
      ],
      downloadUrl: '/cloud/enterprise/soc2/report/download',
      note: 'Demonstration report. Real SOC2 evidence requires audit engagement.',
    };
  }

  // ===== Team management =====
  @Get('team')
  team() {
    const orgId = 'default';
    return teamStore.get(orgId) ?? [];
  }

  @Post('team')
  addMember(@Body() body: { email: string; role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'BILLING' | 'VIEWER' }) {
    const orgId = 'default';
    const cur = teamStore.get(orgId) ?? [];
    const member = {
      id: randomBytes(8).toString('hex'),
      email: body.email,
      role: body.role,
      invitedAt: new Date().toISOString(),
      status: 'INVITED',
    };
    cur.push(member);
    teamStore.set(orgId, cur);
    return member;
  }

  @Delete('team/:id')
  removeMember(@Param('id') id: string) {
    const orgId = 'default';
    const cur = teamStore.get(orgId) ?? [];
    teamStore.set(orgId, cur.filter((m) => m.id !== id));
    return { ok: true };
  }

  // ===== Reseller program =====
  @Get('reseller')
  reseller() {
    const orgId = 'default';
    if (!resellerStore.has(orgId)) {
      resellerStore.set(orgId, {
        orgId,
        enabled: false,
        whitelabelDomain: null,
        brandName: null,
        markupPercent: 20,
        customPriceTiers: [],
        bulkProvisioningEnabled: false,
      });
    }
    return resellerStore.get(orgId);
  }

  @Put('reseller')
  updateReseller(@Body() body: any) {
    const orgId = 'default';
    const cur = resellerStore.get(orgId) ?? { orgId };
    const next = { ...cur, ...body, orgId, updatedAt: new Date().toISOString() };
    resellerStore.set(orgId, next);
    return next;
  }

  // ===== API keys for automation =====
  @Get('api-keys')
  apiKeys() {
    const orgId = 'default';
    return apiKeyStore.get(orgId) ?? [];
  }

  @Post('api-keys')
  createApiKey(@Body() body: { name: string; scopes?: string[] }) {
    const orgId = 'default';
    const cur = apiKeyStore.get(orgId) ?? [];
    const key = {
      id: randomBytes(8).toString('hex'),
      name: body.name,
      scopes: body.scopes ?? ['vps:read', 'vps:write'],
      token: `amer_${randomBytes(24).toString('hex')}`,
      createdAt: new Date().toISOString(),
      lastUsedAt: null as string | null,
    };
    cur.push(key);
    apiKeyStore.set(orgId, cur);
    return key;
  }

  @Delete('api-keys/:id')
  removeApiKey(@Param('id') id: string) {
    const orgId = 'default';
    const cur = apiKeyStore.get(orgId) ?? [];
    apiKeyStore.set(orgId, cur.filter((k) => k.id !== id));
    return { ok: true };
  }

  // ===== Bulk VPS provisioning =====
  @Post('bulk-provision')
  bulkProvision(@Body() body: { planId: string; count: number; namePrefix?: string }) {
    return {
      jobId: randomBytes(8).toString('hex'),
      planId: body.planId,
      count: body.count,
      namePrefix: body.namePrefix ?? 'bulk',
      status: 'QUEUED',
      message: `Queued ${body.count} VPS for provisioning. They will appear in your list shortly.`,
    };
  }
}
