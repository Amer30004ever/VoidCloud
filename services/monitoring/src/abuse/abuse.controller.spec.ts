import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../guards/roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AbuseController } from './abuse.controller';

/**
 * AbuseController RBAC assertions (Prompt 0.17).
 *  - POST /abuse/report is PUBLIC (no @Roles) — third parties report unauthenticated.
 *  - All review/suspend/PTR-admin routes require SUPER_ADMIN.
 *  - PTR request (tenant self-service) allows USER/ADMIN/SUPER_ADMIN.
 */
describe('AbuseController — RBAC', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  function handler(name: keyof AbuseController) {
    return AbuseController.prototype[name] as unknown as (...a: unknown[]) => unknown;
  }
  function ctx(h: unknown, user: { role: Role }) {
    return ({
      getHandler: () => h,
      getClass: () => AbuseController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown) as ExecutionContext;
  }

  it('POST report declares no @Roles (public intake)', () => {
    const reqRoles = Reflect.getMetadata(ROLES_KEY, handler('report'));
    expect(reqRoles).toBeUndefined();
  });

  const adminRoutes: Array<{ method: keyof AbuseController; allow: Role[] }> = [
    { method: 'listReports', allow: [Role.SUPER_ADMIN] },
    { method: 'resolveReport', allow: [Role.SUPER_ADMIN] },
    { method: 'detect', allow: [Role.SUPER_ADMIN] },
    { method: 'suspendNetwork', allow: [Role.SUPER_ADMIN] },
    { method: 'listPtr', allow: [Role.SUPER_ADMIN] },
    { method: 'reviewPtr', allow: [Role.SUPER_ADMIN] },
  ];

  for (const { method, allow } of adminRoutes) {
    const h = handler(method);
    const required = Reflect.getMetadata(ROLES_KEY, h) as Role[] | undefined;
    it(`${String(method)} — declares @Roles(${allow.join(',')})`, () => {
      expect(required).toEqual(expect.arrayContaining(allow));
      expect(required?.length).toBe(allow.length);
    });
    it(`${String(method)} — SUPER_ADMIN passes`, () => {
      expect(guard.canActivate(ctx(h, { role: Role.SUPER_ADMIN }))).toBe(true);
    });
    it(`${String(method)} — USER is rejected (403)`, () => {
      expect(() => guard.canActivate(ctx(h, { role: Role.USER }))).toThrow(/Insufficient permissions/);
    });
  }

  // PTR request: tenant self-service, broader role set
  const ptrReqHandler = handler('requestPtr');
  const ptrReqRoles = Reflect.getMetadata(ROLES_KEY, ptrReqHandler) as Role[] | undefined;
  it('POST ptr request allows USER/ADMIN/SUPER_ADMIN', () => {
    expect(ptrReqRoles).toEqual(expect.arrayContaining([Role.USER, Role.ADMIN, Role.SUPER_ADMIN]));
  });
});
