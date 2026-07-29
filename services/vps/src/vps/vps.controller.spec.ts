import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../guards/roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { VpsController } from './vps.controller';

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

/**
 * RolesGuard behaviour test for VpsController — first 10 routes in the
 * VPS RBAC batch. Each route asserts both the declared @Roles metadata
 * and the guard behaviour on 200 (allowed role) / 403 (denied role) paths.
 */
describe('VpsController — RBAC (batch 1: 10 routes)', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const routes: Array<{ method: keyof VpsController; allow: Role[] }> = [
    { method: 'list',    allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'create',  allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'get',     allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'update',  allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'start',   allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'stop',    allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'restart', allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'remove',  allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'status',  allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    // snapshot is privileged: consumes cluster storage, admin-only per platform policy
    { method: 'snapshot', allow: [Role.ADMIN, Role.SUPER_ADMIN] },
  ];

  const mkCtx = (handler: unknown, user: { role: Role }): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => VpsController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  for (const { method, allow } of routes) {
    const handler = VpsController.prototype[method] as unknown as (...a: unknown[]) => unknown;
    const required = Reflect.getMetadata(ROLES_KEY, handler) as Role[] | undefined;

    it(`${String(method)} — declares @Roles(${allow.join(',')})`, () => {
      expect(required).toEqual(expect.arrayContaining(allow));
      expect(required?.length).toBe(allow.length);
    });

    it(`${String(method)} — 200 path: allowed role passes`, () => {
      const ctx = mkCtx(handler, { role: allow[0] });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    const allRoles: Role[] = [Role.USER, Role.ADMIN, Role.SUPER_ADMIN];
    const roleToDeny = allRoles.find((r) => !allow.includes(r));
    if (!roleToDeny) {
      it.skip(`${String(method)} — 403 path: n/a (route allows every role)`, () => {});
      continue;
    }
    it(`${String(method)} — 403 path: non-allowed role (${roleToDeny}) is rejected`, () => {
      const ctx = mkCtx(handler, { role: roleToDeny });
      expect(() => guard.canActivate(ctx)).toThrow(/Insufficient permissions/);
    });
  }
});
