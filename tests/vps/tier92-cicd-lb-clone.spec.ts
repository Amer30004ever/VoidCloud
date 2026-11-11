/**
 * Tier 9.2 — per-VPS CI/CD webhooks, load balancers, staging clones.
 * Focus: signature enforcement, branch filtering, and cross-tenant isolation.
 */
import { createHmac } from 'crypto';
import { VpsCicdService } from '../../services/vps/src/cicd/vps-cicd.service';
import { verifyDeploySignature, branchFromRef } from '../../services/vps/src/cicd/cicd-signature';
import { LoadBalancerService, LOAD_BALANCER_MONTHLY_USD } from '../../services/vps/src/loadbalancer/load-balancer.service';
import { VpsCloneService } from '../../services/vps/src/vps/vps-clone.service';
import { encryptSecret } from '../../shared/crypto/crypto.util';

const A = { id: 'user-A', role: 'USER' };
const B = { id: 'user-B', role: 'USER' };
const SECRET = 'whsec-test';
const sign = (body: string) => 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');

function cicdPrisma(cfgOver: Record<string, unknown> = {}) {
  const cfg: any = {
    id: 'c1', vpsId: 'vps-A', userId: A.id, provider: 'GITHUB', autoDeploy: true, autoDeployBranch: 'main',
    prPreview: false, webhookToken: 'tok', webhookSecretCipher: encryptSecret(SECRET), ...cfgOver,
  };
  return {
    cfg,
    prisma: {
      cloudDeployment: {
        findUnique: jest.fn(async ({ where }: any) => (where.id === 'vps-A' ? { id: 'vps-A', userId: A.id } : null)),
        update: jest.fn(async () => ({})),
      },
      vpsCicdConfig: {
        findUnique: jest.fn(async ({ where }: any) => (where.webhookToken === 'tok' || where.vpsId === 'vps-A' ? cfg : null)),
        create: jest.fn(), update: jest.fn(async ({ data }: any) => ({ ...cfg, ...data })),
      },
      vpsDeployRun: { create: jest.fn(async ({ data }: any) => ({ id: 'run1', ...data })), findMany: jest.fn(async () => []) },
    } as any,
  };
}

describe('deploy webhook signature', () => {
  it('accepts a correct GitHub sha256 signature', () => {
    expect(verifyDeploySignature({ secret: SECRET, rawBody: '{}', signature: sign('{}') })).toBe(true);
  });
  it('rejects a signature over a different body', () => {
    expect(verifyDeploySignature({ secret: SECRET, rawBody: '{"a":1}', signature: sign('{}') })).toBe(false);
  });
  it('rejects a missing signature', () => {
    expect(verifyDeploySignature({ secret: SECRET, rawBody: '{}' })).toBe(false);
  });
  it('accepts a matching GitLab token and rejects a wrong one', () => {
    expect(verifyDeploySignature({ secret: SECRET, rawBody: '', gitlabToken: SECRET })).toBe(true);
    expect(verifyDeploySignature({ secret: SECRET, rawBody: '', gitlabToken: 'nope' })).toBe(false);
  });
  it('strips refs/heads/ from push refs', () => {
    expect(branchFromRef('refs/heads/main')).toBe('main');
  });
});

describe('VpsCicdService.handleWebhook', () => {
  it('queues a deploy for a signed push to the auto-deploy branch', async () => {
    const { prisma } = cicdPrisma();
    const body = JSON.stringify({ ref: 'refs/heads/main', after: 'abc123' });
    const r: any = await new VpsCicdService(prisma).handleWebhook('tok', body, { 'x-hub-signature-256': sign(body), 'x-github-event': 'push' });
    expect(r.accepted).toBe(true);
    expect(prisma.vpsDeployRun.create).toHaveBeenCalledTimes(1);
  });
  it('ignores pushes to other branches', async () => {
    const { prisma } = cicdPrisma();
    const body = JSON.stringify({ ref: 'refs/heads/feature' });
    const r: any = await new VpsCicdService(prisma).handleWebhook('tok', body, { 'x-hub-signature-256': sign(body) });
    expect(r.accepted).toBe(false);
    expect(prisma.vpsDeployRun.create).not.toHaveBeenCalled();
  });
  it('ignores PR events when PR previews are disabled', async () => {
    const { prisma } = cicdPrisma({ prPreview: false });
    const body = JSON.stringify({ number: 7 });
    const r: any = await new VpsCicdService(prisma).handleWebhook('tok', body, { 'x-hub-signature-256': sign(body), 'x-github-event': 'pull_request' });
    expect(r.accepted).toBe(false);
  });
  it('rejects a bad signature with 401 and creates nothing', async () => {
    const { prisma } = cicdPrisma();
    await expect(new VpsCicdService(prisma).handleWebhook('tok', '{}', { 'x-hub-signature-256': 'sha256=00' })).rejects.toThrow('Invalid webhook signature');
    expect(prisma.vpsDeployRun.create).not.toHaveBeenCalled();
  });
  it('rejects an unknown token with the same 401', async () => {
    const { prisma } = cicdPrisma();
    await expect(new VpsCicdService(prisma).handleWebhook('other', '{}', { 'x-hub-signature-256': sign('{}') })).rejects.toThrow('Invalid webhook signature');
  });
  it("tenant B cannot read tenant A's CI/CD config", async () => {
    const { prisma } = cicdPrisma();
    await expect(new VpsCicdService(prisma).get('vps-A', B)).rejects.toThrow('VPS not found');
  });
  it('never returns encrypted secrets from get()', async () => {
    const { prisma } = cicdPrisma();
    const out: any = await new VpsCicdService(prisma).get('vps-A', A);
    expect(out.webhookSecretCipher).toBeUndefined();
    expect(out.accessTokenCipher).toBeUndefined();
  });
});

describe('LoadBalancerService', () => {
  const vps = [{ id: 'vps-A1', userId: A.id }, { id: 'vps-A2', userId: A.id }, { id: 'vps-B1', userId: B.id }];
  const prisma: any = {
    cloudDeployment: { findMany: jest.fn(async ({ where }: any) => vps.filter((v) => where.id.in.includes(v.id) && v.userId === where.userId)) },
    loadBalancer: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => data) },
  };
  const svc = new LoadBalancerService(prisma);

  it('prices a load balancer at $5/month', () => {
    expect(LOAD_BALANCER_MONTHLY_USD).toBe(5);
  });
  it("refuses another tenant's VPS as a backend", async () => {
    await expect(svc.create({ name: 'web-lb', backendVpsIds: ['vps-A1', 'vps-B1'] }, A)).rejects.toThrow('backend VPS not found');
  });
  it('requires at least one backend', async () => {
    await expect(svc.create({ name: 'web-lb', backendVpsIds: [] }, A)).rejects.toThrow('at least one backend');
  });
  it('creates with own backends', async () => {
    const r: any = await svc.create({ name: 'web-lb', backendVpsIds: ['vps-A1', 'vps-A2'] }, A);
    expect(r.backends.create).toHaveLength(2);
    expect(r.monthlyUsd).toBe(5);
  });
});

describe('VpsCloneService', () => {
  const src = { id: 'vps-A', userId: A.id, name: 'api', cpu: 2, memory: 2048, storage: 20480, status: 'RUNNING', isStaging: false, envVars: { K: 'v' }, billingMode: 'SUBSCRIPTION', customDomains: ['prod.example.com'] };
  function build() {
    const prisma: any = {
      cloudDeployment: {
        findUnique: jest.fn(async ({ where }: any) => (where.id === 'vps-A' ? src : null)),
        update: jest.fn(async ({ data }: any) => ({ id: 'new', ...data })),
        count: jest.fn(async () => 0),
      },
    };
    const vpsSvc: any = { create: jest.fn(async (dto: any) => ({ id: 'new', ...dto })) };
    return { prisma, vpsSvc, svc: new VpsCloneService(prisma, vpsSvc) };
  }
  it('names a staging clone "<name>-staging" with the same plan', async () => {
    const { svc, vpsSvc } = build();
    await svc.clone('vps-A', {}, A);
    expect(vpsSvc.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'api-staging', cpu: 2, memory: 2048 }), A);
  });
  it('never copies production custom domains onto the clone', async () => {
    const { svc, prisma } = build();
    await svc.clone('vps-A', {}, A);
    expect(prisma.cloudDeployment.update.mock.calls[0][0].data.customDomains).toEqual([]);
  });
  it("tenant B cannot clone tenant A's VPS", async () => {
    const { svc, vpsSvc } = build();
    await expect(svc.clone('vps-A', {}, B)).rejects.toThrow('VPS not found');
    expect(vpsSvc.create).not.toHaveBeenCalled();
  });
});
