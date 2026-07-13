import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Redis-backed JWT revocation list.
 *
 * Two mechanisms:
 *   1. jti blocklist  → key `jwt:revoked:jti:<jti>` with TTL = remaining token life.
 *      Used for individual logout (revoke one token).
 *   2. per-user cutoff → key `jwt:revoked:user:<userId>` = epoch seconds.
 *      Any token with iat < cutoff is rejected. Used for password change /
 *      admin "revoke all sessions" (invalidates ALL outstanding tokens
 *      without needing to enumerate their jtis).
 *
 * Every service that verifies JWTs SHOULD call `isTokenRevoked({ jti, sub, iat })`
 * in its JwtStrategy.validate(). The shared/token-revocation helper wraps this
 * for other services that don't own the Redis client directly.
 */
@Injectable()
export class TokenRevocationService implements OnModuleDestroy {
  private readonly logger = new Logger(TokenRevocationService.name);
  private readonly redis: Redis;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    this.redis = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (e) => this.logger.warn(`redis error: ${e?.message ?? e}`));
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch {
      /* ignore */
    }
  }

  private jtiKey(jti: string) {
    return `jwt:revoked:jti:${jti}`;
  }
  private userKey(userId: string) {
    return `jwt:revoked:user:${userId}`;
  }

  /**
   * Revoke one specific token (logout).
   * `expSeconds` is the token's `exp` claim (unix seconds); TTL is set so
   * the entry expires with the token itself — no unbounded Redis growth.
   */
  async revokeToken(jti: string, expSeconds: number): Promise<void> {
    if (!jti) return;
    const ttl = Math.max(1, expSeconds - Math.floor(Date.now() / 1000));
    await this.redis.set(this.jtiKey(jti), '1', 'EX', ttl);
  }

  /**
   * Revoke ALL outstanding tokens for a user (password change, admin-forced).
   * Stores a cutoff timestamp; tokens issued at or before this cutoff are
   * rejected until every token issued <= cutoff has expired.
   * Retention: 7d (matches max JWT life), then cutoff auto-expires.
   */
  async revokeAllForUser(userId: string, ttlSeconds = 7 * 24 * 3600): Promise<void> {
    const nowSec = Math.floor(Date.now() / 1000);
    await this.redis.set(this.userKey(userId), String(nowSec), 'EX', ttlSeconds);
  }

  /**
   * Called from JwtStrategy.validate on every request.
   * Returns true if the token has been revoked (caller throws Unauthorized).
   */
  async isTokenRevoked(payload: { jti?: string; sub: string; iat?: number }): Promise<boolean> {
    const [jtiHit, cutoff] = await Promise.all([
      payload.jti ? this.redis.get(this.jtiKey(payload.jti)) : Promise.resolve(null),
      this.redis.get(this.userKey(payload.sub)),
    ]);
    if (jtiHit) return true;
    if (cutoff && payload.iat && payload.iat <= parseInt(cutoff, 10)) return true;
    return false;
  }
}
