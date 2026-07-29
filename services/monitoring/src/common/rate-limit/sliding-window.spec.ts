import { SlidingWindowRateLimiter } from './sliding-window';

type FakeRedis = {
  zadd: jest.Mock;
  zremrangebyscore: jest.Mock;
  zcard: jest.Mock;
  expire: jest.Mock;
};

function createFakeRedis(): FakeRedis {
  return {
    zadd: jest.fn(),
    zremrangebyscore: jest.fn(),
    zcard: jest.fn(),
    expire: jest.fn(),
  };
}

describe('SlidingWindowRateLimiter', () => {
  let limiter: SlidingWindowRateLimiter;
  let redis: FakeRedis;

  beforeEach(() => {
    redis = createFakeRedis();
    limiter = new SlidingWindowRateLimiter(redis as any, 60, 3);
  });

  it('allows requests under the limit', async () => {
    redis.zcard.mockResolvedValue(1);
    const result = await limiter.isAllowed('ip:1.2.3.4');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests over the limit', async () => {
    redis.zcard.mockResolvedValue(4);
    const result = await limiter.isAllowed('ip:1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('prunes expired entries before counting', async () => {
    redis.zcard.mockResolvedValue(2);
    await limiter.isAllowed('ip:1.2.3.4');
    expect(redis.zremrangebyscore).toHaveBeenCalled();
    expect(redis.expire).toHaveBeenCalled();
  });
});
