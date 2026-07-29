import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { SlidingWindowRateLimiter } from './sliding-window';

const BLOCKED_IPS_KEY = 'ratelimit:blocked:ips';
const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_MAX_REQUESTS = 100;

function extractTenantIdFromJwt(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '=='.slice(0, (4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString());
    return decoded.tenantId ?? null;
  } catch {
    return null;
  }
}

export function createRateLimitMiddleware(redis: Redis, windowSeconds = DEFAULT_WINDOW_SECONDS, maxRequests = DEFAULT_MAX_REQUESTS) {
  const limiter = new SlidingWindowRateLimiter(redis, windowSeconds, maxRequests);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = (req.ip || req.connection.remoteAddress || 'unknown').toString();

      if (await redis.sismember(BLOCKED_IPS_KEY, ip)) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Your IP has been blocked due to suspicious activity.',
        });
      }

      const result = await limiter.isAllowed(`ip:${ip}`);

      if (!result.allowed) {
        await redis.zadd('ratelimit:abuse:ips', Date.now(), ip);
        await redis.expire('ratelimit:abuse:ips', 3600);

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
        });
      }

      const tenantId = extractTenantIdFromJwt(req.headers.authorization);
      if (tenantId) {
        const tenantKey = `ratelimit:sw:tenant:${tenantId}`;
        await redis.zadd(tenantKey, Date.now(), `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await redis.zremrangebyscore(tenantKey, '-inf', Date.now() - windowSeconds * 1000);
        await redis.expire(tenantKey, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

      next();
    } catch (err) {
      next(err);
    }
  };
}
