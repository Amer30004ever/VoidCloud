import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../guards/roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { BillingController } from './billing.controller';

/**
 * RolesGuard behaviour test for BillingController.
 * Every route's @Roles decoration is asserted:
 *  - a user with an allowed role → guard returns true (200 path).
 *  - a user with a non-allowed role → guard throws ForbiddenException (403 path).
 */
describe('BillingController — RBAC', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const routes: Array<{ method: keyof BillingController; allow: Role[] }> = [
    { method: 'listSubscriptions',   allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'createSubscription',  allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'updateSubscription',  allow: [Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'listInvoices',        allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'getInvoice',          allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'processPayment',      allow: [Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'listPlans',           allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'createPlan',          allow: [Role.SUPER_ADMIN] },
    { method: 'updatePlan',          allow: [Role.SUPER_ADMIN] },
    { method: 'deletePlan',          allow: [Role.SUPER_ADMIN] },
    { method: 'createReferral',      allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'referralStats',       allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
    { method: 'requestPayout',       allow: [Role.USER, Role.ADMIN, Role.SUPER_ADMIN] },
  ];

  const mkCtx = (handler: unknown, user: { role: Role }): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => BillingController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  for (const { method, allow } of routes) {
    const handler = BillingController.prototype[method] as unknown as (...a: unknown[]) => unknown;
    const required = Reflect.getMetadata(ROLES_KEY, handler) as Role[] | undefined;

    it(`${String(method)} — declares @Roles(${allow.join(',')})`, () => {
      expect(required).toEqual(expect.arrayContaining(allow));
      expect(required?.length).toBe(allow.length);
    });

    it(`${String(method)} — 200 path: allowed role passes`, () => {
      const ctx = mkCtx(handler, { role: allow[0] });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    // Skip 403 assertion for routes that allow every role — there is no
    // remaining role to deny.
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
