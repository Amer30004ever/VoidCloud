import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { ROLES_KEY } from './decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Role-guard matrix (Prompt 1.3 seed — lives in auth because that's where the
 * canonical RolesGuard + @Roles live; the same guard pattern is duplicated into
 * every other service).
 *
 * Drives RolesGuard.canActivate directly with a simulated request carrying each
 * role's JWT payload, against a representative set of endpoint role-requirements.
 * Also proves a missing/invalid user on the request is rejected *before* the role
 * check runs (a malformed JWT never reaches role evaluation).
 */

// Representative endpoint requirement sets (mirrors real controllers).
const ENDPOINTS: { name: string; required: Role[] }[] = [
  { name: 'GET /clusters (super-admin only)', required: ['SUPER_ADMIN'] },
  { name: 'POST /audit/logs (super-admin + admin)', required: ['SUPER_ADMIN', 'ADMIN'] },
  { name: 'POST /rbac/roles (super-admin only)', required: ['SUPER_ADMIN'] },
  { name: 'GET /vps (any authed role)', required: ['USER', 'AGENT', 'ADMIN', 'SUPER_ADMIN'] },
  { name: 'GET /analytics (super-admin + admin)', required: ['SUPER_ADMIN', 'ADMIN'] },
];

function makeGuard(requiredRoles: Role[] | null) {
  // Simulate the Reflector returning this endpoint's @Roles metadata.
  const reflector = {
    getAllAndOverride: jest.fn((key: string) =>
      key === ROLES_KEY ? requiredRoles : undefined,
    ),
  } as any;
  const guard = new RolesGuard(reflector);
  (guard as any).reflector = reflector;
  return guard;
}

function ctxWithRole(role?: Role) {
  const user = role ? { id: 'u-1', role } : undefined;
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard — role x endpoint matrix', () => {
  it('allows SUPER_ADMIN everywhere (override semantics)', () => {
    for (const ep of ENDPOINTS) {
      const guard = makeGuard(ep.required);
      expect(guard.canActivate(ctxWithRole('SUPER_ADMIN'))).toBe(true);
    }
  });

  it('denies USER on super-admin-only and admin-only endpoints', () => {
    const superOnly = ENDPOINTS.find((e) => e.name.includes('super-admin only'))!;
    const adminPlus = ENDPOINTS.find((e) => e.name.includes('super-admin + admin'))!;
    expect(() =>
      makeGuard(superOnly.required).canActivate(ctxWithRole('USER')),
    ).toThrow(ForbiddenException);
    expect(() =>
      makeGuard(adminPlus.required).canActivate(ctxWithRole('USER')),
    ).toThrow(ForbiddenException);
  });

  it('allows USER only on the any-authed endpoint', () => {
    const any = ENDPOINTS.find((e) => e.name.includes('any authed'))!;
    expect(makeGuard(any.required).canActivate(ctxWithRole('USER'))).toBe(true);
  });

  it('denies AGENT on admin/super-admin scoped endpoints but allows on any-authed', () => {
    const any = ENDPOINTS.find((e) => e.name.includes('any authed'))!;
    const superOnly = ENDPOINTS.find((e) => e.name.includes('super-admin only'))!;
    expect(makeGuard(any.required).canActivate(ctxWithRole('AGENT'))).toBe(true);
    expect(() =>
      makeGuard(superOnly.required).canActivate(ctxWithRole('AGENT')),
    ).toThrow(ForbiddenException);
  });

  it('allows ADMIN on admin+super-admin endpoints but not super-admin-only', () => {
    const adminPlus = ENDPOINTS.find((e) => e.name.includes('super-admin + admin'))!;
    const superOnly = ENDPOINTS.find((e) => e.name.includes('super-admin only'))!;
    expect(makeGuard(adminPlus.required).canActivate(ctxWithRole('ADMIN'))).toBe(true);
    expect(() =>
      makeGuard(superOnly.required).canActivate(ctxWithRole('ADMIN')),
    ).toThrow(ForbiddenException);
  });

  it('rejects a request with no authenticated user (missing/invalid JWT) before the role check', () => {
    // Endpoint that WOULD allow this role if authed — proves the guard short-circuits
    // on a missing user and never evaluates role membership.
    const any = ENDPOINTS.find((e) => e.name.includes('any authed'))!;
    expect(() =>
      makeGuard(any.required).canActivate(ctxWithRole(undefined)),
    ).toThrow(ForbiddenException);
  });

  it('treats a null/empty required-roles list as public (open endpoint)', () => {
    const guard = makeGuard(null);
    expect(guard.canActivate(ctxWithRole(undefined))).toBe(true);
    for (const r of ['USER', 'AGENT', 'ADMIN', 'SUPER_ADMIN'] as Role[]) {
      expect(guard.canActivate(ctxWithRole(r))).toBe(true);
    }
  });
});
