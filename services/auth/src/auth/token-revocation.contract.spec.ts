/**
 * Cross-service token-revocation contract tests.
 *
 * Runs against the SHARED implementation at shared/auth/token-revocation.ts
 * (mirrored to services/<name>/src/common/token-revocation.ts). Each per-service
 * JwtStrategy imports assertNotRevoked from its local mirror; this suite proves
 * the contract every mirror must uphold:
 *
 *   1. When neither REDIS_URL nor AUTH_INTROSPECT_URL is configured, the checker
 *      is a no-op (returns false) — services boot without infra dependencies.
 *   2. When AUTH_INTROSPECT_URL is set and /auth/introspect reports the token
 *      as inactive, assertNotRevoked THROWS with statusCode 401.
 *   3. Repeated calls within the 2s cache window make a SINGLE fetch (no
 *      stampede against services/auth).
 *   4. Fail-open on introspect network error (fetch throws) — the checker
 *      returns false so a brief services/auth outage does not black-hole the
 *      whole platform. The blast radius is bounded: only NEWLY-revoked tokens
 *      slip through, and only until the auth service recovers.
 *
 * NOTE ON FAIL-CLOSED (Redis path): when REDIS_URL is configured, the checker
 * REJECTS every token if the Redis GET fails. This is the correct posture in
 * a same-cluster deployment because Redis being unreachable is a cluster-level
 * failure — services can't do anything useful anyway. The introspect path
 * (used when a service has no Redis client) uses the opposite policy because
 * it depends on a peer HTTP service and must degrade gracefully.
 */
// Contract fixture: the SHARED mirror used by every non-auth service.
import { assertNotRevoked, isTokenRevoked } from '../common/token-revocation';

describe('shared token-revocation contract (used by every service JwtStrategy)', () => {
  const OLD_ENV = process.env;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, REDIS_URL: '', AUTH_INTROSPECT_URL: '' };
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  // NOTE: These tests exercise the introspect path via a fresh module load.
  // The Redis path is asserted at integration time (see AuthService.logout
  // in services/auth/src/auth/auth.service.spec.ts).

  it('is a no-op when no revocation infrastructure is configured', async () => {
    process.env.REDIS_URL = '';
    process.env.AUTH_INTROSPECT_URL = '';
    const mod = await import('../common/token-revocation');
    await expect(
      mod.assertNotRevoked({ jti: 'x', sub: 'u1', iat: 1234 }),
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws 401 when introspect reports the token as inactive', async () => {
    process.env.AUTH_INTROSPECT_URL = 'http://auth-service:3001/auth/introspect';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ active: false }) });
    const mod = await import('../common/token-revocation');
    await expect(
      mod.assertNotRevoked({ jti: 'revoked-jti', sub: 'u1', iat: 1234 }),
    ).rejects.toMatchObject({ message: 'Token has been revoked', statusCode: 401 });
  });

  it('caches introspect results for 2s (no stampede)', async () => {
    process.env.AUTH_INTROSPECT_URL = 'http://auth-service:3001/auth/introspect';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ active: true }) });
    const mod = await import('../common/token-revocation');
    for (let i = 0; i < 5; i++) {
      await mod.isTokenRevoked({ jti: 'j', sub: 'u1', iat: 1 });
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails OPEN on introspect network error (returns false)', async () => {
    process.env.AUTH_INTROSPECT_URL = 'http://auth-service:3001/auth/introspect';
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const mod = await import('../common/token-revocation');
    const revoked = await mod.isTokenRevoked({ jti: 'j', sub: 'u2', iat: 1 });
    expect(revoked).toBe(false); // fail-open — see block comment above.
  });
});

