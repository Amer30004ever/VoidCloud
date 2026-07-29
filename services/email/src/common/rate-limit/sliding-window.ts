import Redis from 'ioredis';

export interface SlidingWindowResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_MAX_REQUESTS = 100;

export class SlidingWindowRateLimiter {
  private redis: Redis;
  private windowSeconds: number;
  private maxRequests: number;

  constructor(redis: Redis, windowSeconds = DEFAULT_WINDOW_SECONDS, maxRequests = DEFAULT_MAX_REQUESTS) {
    this.redis = redis;
    this.windowSeconds = windowSeconds;
    this.maxRequests = maxRequests;
  }

  async isAllowed(key: string): Promise<SlidingWindowResult> {
    const now = Date.now();
    const windowStart = now - this.windowSeconds * 1000;
    const redisKey = `ratelimit:sw:${key}`;

    await this.redis.zadd(redisKey, now, `${now}-${Math.random().toString(36).slice(2)}`);
    await this.redis.zremrangebyscore(redisKey, '-inf', windowStart);
    const count = await this.redis.zcard(redisKey);
    await this.redis.expire(redisKey, this.windowSeconds);

    const remaining = Math.max(0, this.maxRequests - count);
    return {
      allowed: count <= this.maxRequests,
      remaining,
      resetAt: now + this.windowSeconds * 1000,
    };
  }
}
