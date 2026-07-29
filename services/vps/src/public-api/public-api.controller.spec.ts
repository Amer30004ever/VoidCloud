import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ScopesGuard } from '../guards/scope.guard';
import { SCOPES_KEY } from '../decorators/scopes.decorator';
import { PublicApiController } from '../public-api/public-api.controller';
import { VpsService } from '../vps/vps.service';
import { CloudDeploymentStatus, Role } from '@prisma/client';

jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromDefault: jest.fn(),
    makeApiClient: jest.fn().mockReturnValue({
      createNamespacedDeployment: jest.fn(),
      patchNamespacedDeployment: jest.fn(),
      deleteNamespacedDeployment: jest.fn(),
      readNamespacedDeployment: jest.fn(),
      createNamespacedService: jest.fn(),
      patchNamespacedService: jest.fn(),
      deleteNamespacedService: jest.fn(),
    }),
  })),
  CoreV1Api: jest.fn(),
  AppsV1Api: jest.fn(),
}));

describe('PublicApiController — API key auth + cross-tenant isolation', () => {
  let apiKeyGuard: ApiKeyGuard;
  let controller: PublicApiController;
  let vpsService: jest.Mocked<VpsService>;

  const mkPrisma = () => ({
    apiKey: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  });

  const OTHER_USERS_VPS = {
    id: 'vps-of-user-b',
    userId: 'user-B',
    proxmoxVMID: 100,
    proxmoxNode: 'pve-01',
    status: CloudDeploymentStatus.RUNNING,
    cpu: 1,
    memory: 1024,
    storage: 10240,
    name: 'tenant-b-vps',
    ipAddress: '10.0.0.5',
  };

  beforeEach(async () => {
    const prisma = mkPrisma();
    vpsService = {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      restart: jest.fn(),
      remove: jest.fn(),
      status: jest.fn(),
    } as any;

    apiKeyGuard = new ApiKeyGuard(prisma as any);
    controller = new PublicApiController(vpsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('ApiKeyGuard', () => {
    const mkCtx = (headers: Record<string, string | undefined> = {}): ExecutionContext => {
      const request: any = { headers };
      return {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
    };

    it('rejects a request with no Authorization header', async () => {
      await expect(apiKeyGuard.canActivate(mkCtx({ authorization: undefined }))).rejects.toThrow('Missing API key');
    });

    it('rejects a request with a non-Bearer Authorization header', async () => {
      await expect(apiKeyGuard.canActivate(mkCtx({ authorization: 'Basic abc' }))).rejects.toThrow('Missing API key');
    });

    it('rejects a request with an API key that has invalid format', async () => {
      await expect(apiKeyGuard.canActivate(mkCtx({ authorization: 'Bearer invalid_format' }))).rejects.toThrow('Invalid API key format');
    });

    it('rejects a request with an API key that does not exist in the database', async () => {
      const prisma = (apiKeyGuard as any).prisma;
      prisma.apiKey.findFirst.mockResolvedValue(null);
      await expect(apiKeyGuard.canActivate(mkCtx({ authorization: 'Bearer vc_nonexistent' }))).rejects.toThrow('Invalid API key');
    });

    it('rejects a request with an expired API key', async () => {
      const prisma = (apiKeyGuard as any).prisma;
      prisma.apiKey.findFirst.mockResolvedValue({
        id: 'key-1',
        userId: 'user-A',
        keyHash: 'hash',
        keyPrefix: 'vc_1234567890',
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-A', email: 'a@test.com', name: 'User A', role: Role.USER },
      });
      await expect(apiKeyGuard.canActivate(mkCtx({ authorization: 'Bearer vc_1234567890' }))).rejects.toThrow('API key expired');
    });

    it('allows a valid API key and stamps req.user with apiKey metadata', async () => {
      const prisma = (apiKeyGuard as any).prisma;
      prisma.apiKey.findFirst.mockResolvedValue({
        id: 'key-1',
        userId: 'user-A',
        keyHash: 'hash',
        keyPrefix: 'vc_1234567890',
        expiresAt: new Date(Date.now() + 100000),
        lastUsedAt: null,
        scopes: ['vps:read', 'vps:write'],
        user: { id: 'user-A', email: 'a@test.com', name: 'User A', role: Role.USER },
      });
      const request: any = { headers: { authorization: 'Bearer vc_1234567890' } };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
      const result = await apiKeyGuard.canActivate(ctx);
      expect(result).toBe(true);
      expect(request.user).toEqual({
        id: 'user-A',
        email: 'a@test.com',
        name: 'User A',
        role: Role.USER,
        apiKey: expect.objectContaining({ id: 'key-1', scopes: ['vps:read', 'vps:write'] }),
        authMethod: 'api_key',
      });
    });
  });

  describe('ScopesGuard', () => {
    const mkCtx = (scopes: string[] = [], required: string[] = []): ExecutionContext => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(required);
      const guard = new ScopesGuard(reflector);
      return {
        getHandler: () => ({}),
        getClass: () => PublicApiController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: scopes.length > 0 ? { apiKey: { scopes } } : undefined,
          }),
        }),
      } as unknown as ExecutionContext;
    };

    it('passes when no scopes are required', () => {
      expect(ScopesGuard.prototype.canActivate.call({ reflector: new Reflector() }, {
        getHandler: () => ({}),
        getClass: () => PublicApiController,
        switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
      } as any)).toBe(true);
    });

    it('passes when the user has the required scopes', () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['vps:read']);
      const guard = new ScopesGuard(reflector);
      const ctx = {
        getHandler: () => ({}),
        getClass: () => PublicApiController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { apiKey: { scopes: ['vps:read', 'vps:write'] } },
          }),
        }),
      } as any;
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects when the user lacks vps:write scope but the endpoint requires it', () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['vps:write']);
      const guard = new ScopesGuard(reflector);
      const ctx = {
        getHandler: () => ({}),
        getClass: () => PublicApiController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { apiKey: { scopes: ['vps:read'] } },
          }),
        }),
      } as any;
      expect(() => guard.canActivate(ctx)).toThrow('Missing required scope: vps:write');
    });

    it('rejects when the user lacks vps:delete scope but the endpoint requires it', () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['vps:delete']);
      const guard = new ScopesGuard(reflector);
      const ctx = {
        getHandler: () => ({}),
        getClass: () => PublicApiController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { apiKey: { scopes: ['vps:read'] } },
          }),
        }),
      } as any;
      expect(() => guard.canActivate(ctx)).toThrow('Missing required scope: vps:delete');
    });

    it('passes JWT-authed requests through (user without apiKey is not scope-checked)', () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['vps:write']);
      const guard = new ScopesGuard(reflector);
      const ctx = {
        getHandler: () => ({}),
        getClass: () => PublicApiController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: {},
          }),
        }),
      } as any;
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('PublicApiController — cross-tenant isolation (IDOR)', () => {
    const mkReq = (user: { id: string; role: Role }): any => ({
      user,
      params: { id: OTHER_USERS_VPS.id },
    });

    const ROUTES: Array<{
      name: string;
      call: (c: PublicApiController, req: any) => Promise<unknown>;
    }> = [
      { name: 'get', call: (c, req) => c.get(req.params.id, req) },
      { name: 'start', call: (c, req) => c.start(req.params.id, req) },
      { name: 'stop', call: (c, req) => c.stop(req.params.id, req) },
      { name: 'restart', call: (c, req) => c.restart(req.params.id, req) },
      { name: 'status', call: (c, req) => c.status(req.params.id, req) },
      { name: 'remove', call: (c, req) => c.remove(req.params.id, req) },
    ];

    for (const { name, call } of ROUTES) {
      it(`${name}: API key belonging to User A cannot reach User B's VPS`, async () => {
        vpsService[name as keyof VpsService] = jest.fn().mockRejectedValue(
          Object.assign(new Error('VPS not found'), { status: 404 }),
        ) as any;

        const userA = { id: 'user-A', role: Role.USER };
        const req = mkReq(userA);

        await expect(call(controller, req)).rejects.toThrow('VPS not found');
        expect(vpsService[name as keyof VpsService]).toHaveBeenCalledWith(OTHER_USERS_VPS.id, userA);
      });
    }
  });
});
