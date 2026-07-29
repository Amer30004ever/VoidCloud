/**
 * Cross-service JWT revocation checker.
 *
 * Every microservice's JwtStrategy.validate() should call `assertNotRevoked()`
 * after signature/expiry verification. Two integration modes:
 *
 *   1. `REDIS_URL` set — direct Redis lookup (same keys as auth-service's
 *      TokenRevocationService). Zero extra latency, no auth-service round-trip.
 *
 *   2. `AUTH_INTROSPECT_URL` set (e.g. http://auth-service:3001/auth/introspect)
 *      — POST { jti, sub, iat }, expect `{ active: boolean }`. Fallback for
 *      services that don't run alongside a Redis client. Cached in memory for
 *      2s to avoid a per-request round-trip storm.
 *
 * Fail-CLOSED on Redis errors (reject the token). Fail-OPEN on introspect
 * timeouts (log + accept) so a transient auth-service outage doesn't take
 * down the whole platform — revocation ordering guarantees are still
 * eventually consistent within seconds.
 */
import Redis from 'ioredis';

let redis: Redis | null = null;
export function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2, enableOfflineQueue: false });
  redis.on('error', () => undefined);
  return redis;
}

const introspectCache = new Map<string, { active: boolean; expiresAt: number }>();
const INTROSPECT_TTL_MS = 2000;

export async function isTokenRevoked(payload: {
  jti?: string;
  sub: string;
  iat?: number;
}): Promise<boolean> {
  const r = getRedis();
  if (r) {
    try {
      const [jtiHit, cutoff] = await Promise.all([
        payload.jti ? r.get(`jwt:revoked:jti:${payload.jti}`) : Promise.resolve(null),
        r.get(`jwt:revoked:user:${payload.sub}`),
      ]);
      if (jtiHit) return true;
      if (cutoff && payload.iat && payload.iat <= parseInt(cutoff, 10)) return true;
      return false;
    } catch {
      // Fail closed: if we can't check, reject.
      return true;
    }
  }

  const introspectUrl = process.env.AUTH_INTROSPECT_URL;
  if (!introspectUrl) return false; // no revocation infra configured; log at boot elsewhere.

  const cacheKey = `${payload.sub}|${payload.jti ?? ''}|${payload.iat ?? ''}`;
  const cached = introspectCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return !cached.active;

  try {
    const res = await fetch(introspectUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { active: boolean };
    introspectCache.set(cacheKey, { active: body.active, expiresAt: Date.now() + INTROSPECT_TTL_MS });
    return !body.active;
  } catch {
    // Fail open on introspect network error — better than a platform outage.
    return false;
  }
}

export async function assertNotRevoked(payload: {
  jti?: string;
  sub: string;
  iat?: number;
}): Promise<void> {
  if (await isTokenRevoked(payload)) {
    const err = new Error('Token has been revoked');
    (err as any).statusCode = 401;
    throw err;
  }
}
