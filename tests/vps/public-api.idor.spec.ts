/**
 * Tier 9.1 — Public API IDOR / scope enforcement, end-to-end through the
 * REAL VpsService (not a mocked service) behind the API-key guard chain.
 *
 * The existing controller spec mocks VpsService, so it only proves delegation.
 * This wires the ApiKeyGuard-stamped principal into the real ownership filter
 * and asserts a foreign key can neither read nor mutate another tenant's VPS.
 */
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: class {
    loadFromDefault() {}
    makeApiClient() {
      return {};
    }
  },
  AppsV1Api: class {},
  CoreV1Api: class {},
  NetworkingV1Api: class {},
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { VpsService } = require('../../services/vps/src/vps/vps.service') as typeof import('../../services/vps/src/vps/vps.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PublicApiController } = require('../../services/vps/src/public-api/public-api.controller') as typeof import('../../services/vps/src/public-api/public-api.controller');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ApiKeyGuard } = require('../../services/vps/src/guards/api-key.guard') as typeof import('../../services/vps/src/guards/api-key.guard');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ScopesGuard } = require('../../services/vps/src/guards/scope.guard') as typeof import('../../services/vps/src/guards/scope.guard');

const VPS_A = {
  id: 'vps-A',
  userId: 'user-A',
  tenantId: 'tenant-A',
  name: 'a',
  status: 'RUNNING',
  billingMode: 'SUBSCRIPTION',
  proxmoxVMID: 101,
  proxmoxNode: 'pve-01',
};

function build() {
  const prisma: any = {
    cloudDeployment: {
      findUnique: jest.fn().mockResolvedValue(VPS_A),
      findMany: jest.fn().mockResolvedValue([VPS_A]),
      update: jest.fn().mockResolvedValue(VPS_A),
      delete: jest.fn().mockResolvedValue(VPS_A),
      aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: 0 }),
      count: jest.fn().mockResolvedValue(1),
    },
    vpsQuota: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
  };
  const proxmox: any = {
    startContainer: jest.fn().mockResolvedValue({}),
    stopContainer: jest.fn().mockResolvedValue({}),
    destroyContainer: jest.fn().mockResolvedValue({}),
    getStatus: jest.fn().mockResolvedValue('running'),
  };
  const clusters: any = { schedule: jest.fn() };
  const credit: any = {
    canProvisionVps: jest.fn().mockResolvedValue({ allowed: true }),
    canStartPaygVps: jest.fn().mockResolvedValue(true),
  };
  const backups: any = { getBackups: jest.fn().mockResolvedValue([]), getSchedule: jest.fn() };
  const k8sApp: any = { deploy: jest.fn(), remove: jest.fn(), getStatus: jest.fn() };

  const vpsService = new VpsService(prisma, proxmox, clusters, credit, backups, k8sApp);
  const controller = new PublicApiController(vpsService as never);
  return { controller, prisma, proxmox };
}

/** Simulates the request object after ApiKeyGuard has stamped req.user. */
const reqFor = (userId: string, scopes: string[], role: Role = Role.USER) => ({
  user: {
    id: userId,
    email: `${userId}@test.com`,
    name: userId,
    role,
    apiKey: { id: `key-${userId}`, scopes },
    authMethod: 'api_key',
  },
});

const scopeCtx = (req: any, required: string[]) => {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(required);
  const guard = new ScopesGuard(reflector);
  const ctx = {
    getHandler: () => ({}),
    getClass: () => PublicApiController,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return () => guard.canActivate(ctx);
};

describe('Public API v1 — cross-tenant IDOR through the real VpsService', () => {
  const OWNER = reqFor('user-A', ['vps:read', 'vps:write', 'vps:delete']);
  const INTRUDER = reqFor('user-B', ['vps:read', 'vps:write', 'vps:delete']);

  it('list() only returns the API key owner\'s instances', async () => {
    const { controller, prisma } = build();
    await controller.list(INTRUDER as never);
    expect(prisma.cloudDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-B' } }),
    );
  });

  it('get() 404s a foreign VPS instead of leaking its existence', async () => {
    const { controller } = build();
    await expect(controller.get(VPS_A.id, INTRUDER as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('get() returns the record to the key owner', async () => {
    const { controller } = build();
    await expect(controller.get(VPS_A.id, OWNER as never)).resolves.toMatchObject({
      id: VPS_A.id,
    });
  });

  it.each([
    ['start', (c: any) => c.start(VPS_A.id, INTRUDER)],
    ['stop', (c: any) => c.stop(VPS_A.id, INTRUDER)],
    ['restart', (c: any) => c.restart(VPS_A.id, INTRUDER)],
    ['status', (c: any) => c.status(VPS_A.id, INTRUDER)],
    ['remove', (c: any) => c.remove(VPS_A.id, INTRUDER)],
  ])('%s() on a foreign id rejects with no DB or Proxmox side effects', async (_n, call) => {
    const { controller, prisma, proxmox } = build();
    await expect(call(controller)).rejects.toThrow('VPS not found');
    expect(prisma.cloudDeployment.update).not.toHaveBeenCalled();
    expect(prisma.cloudDeployment.delete).not.toHaveBeenCalled();
    expect(proxmox.startContainer).not.toHaveBeenCalled();
    expect(proxmox.stopContainer).not.toHaveBeenCalled();
    expect(proxmox.destroyContainer).not.toHaveBeenCalled();
  });

  it('a read-only key cannot reach the write or delete handlers at all', () => {
    const readOnly = reqFor('user-A', ['vps:read']);
    expect(scopeCtx(readOnly, ['vps:write'])).toThrow('Missing required scope: vps:write');
    expect(scopeCtx(readOnly, ['vps:delete'])).toThrow('Missing required scope: vps:delete');
    expect(scopeCtx(readOnly, ['vps:read'])()).toBe(true);
  });

  it('an expired key never reaches the controller', async () => {
    const prisma: any = {
      apiKey: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'key-1',
          userId: 'user-B',
          keyHash: 'hash',
          keyPrefix: 'vc_1234567890',
          expiresAt: new Date(Date.now() - 1000),
          user: { id: 'user-B', email: 'b@test.com', name: 'B', role: Role.USER },
        }),
        update: jest.fn(),
      },
    };
    const guard = new ApiKeyGuard(prisma as never);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer vc_1234567890' } }),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toThrow('API key expired');
  });

  it('a SUPER_ADMIN key is the only principal with an unscoped list', async () => {
    const { controller, prisma } = build();
    const admin = reqFor('root', ['vps:read'], Role.SUPER_ADMIN);
    await controller.list(admin as never);
    expect(prisma.cloudDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});
