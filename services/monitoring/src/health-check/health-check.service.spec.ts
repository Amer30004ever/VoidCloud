/**
 * Verifies the multi-tab dedup claim documented in health-check.scheduler.ts:
 *
 *   "the frontend's GET /monitoring/services/health just reads the resulting
 *    cache, so N open admin tabs still produce 1 round of pings"
 *
 * We exercise:
 *   1. Steady-state: N concurrent GETs (via getLatestCached) after a warm cache
 *      trigger ZERO outbound probes.
 *   2. Concurrent force-checks / scheduler-tick races: the single-flight guard
 *      collapses them into one probe round (13 pings, not N*13).
 *   3. Cold start: multiple simultaneous probeAllAndPersist() calls before the
 *      first tick has populated the cache still fan out only ONE round of pings.
 */
import { HealthCheckService } from './health-check.service';

// Mock the http module BEFORE importing anything that uses it.
jest.mock('http', () => {
  const listeners: Record<string, Array<(...a: any[]) => void>> = {};
  const req = {
    on: jest.fn((evt: string, cb: (...a: any[]) => void) => {
      (listeners[evt] ||= []).push(cb);
      return req;
    }),
    end: jest.fn(),
    destroy: jest.fn(),
  };
  const request = jest.fn((_opts: any, cb: (res: any) => void) => {
    // Resolve on next tick so probes are actually concurrent.
    setImmediate(() => {
      cb({ statusCode: 200, resume: () => undefined });
    });
    return req;
  });
  return { request, __req: req };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const http = require('http');

function makePrisma() {
  return {
    serviceHealthLog: {
      create: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as any;
}

describe('HealthCheckService — multi-tab dedup', () => {
  beforeEach(() => {
    (http.request as jest.Mock).mockClear();
  });

  it('GET (getLatestCached) NEVER triggers outbound probes, no matter how many concurrent callers', async () => {
    const svc = new HealthCheckService(makePrisma());
    // Warm cache with one probe round (13 pings).
    await svc.probeAllAndPersist();
    const baseline = (http.request as jest.Mock).mock.calls.length;
    expect(baseline).toBe(13);

    // 10 concurrent "browser tabs" polling.
    await Promise.all(Array.from({ length: 10 }, () => svc.getLatestCached()));

    // No additional outbound pings.
    expect((http.request as jest.Mock).mock.calls.length).toBe(baseline);
  });

  it('concurrent probeAllAndPersist calls (scheduler tick + force-check race) collapse into ONE probe round', async () => {
    const svc = new HealthCheckService(makePrisma());
    await Promise.all([
      svc.probeAllAndPersist(),
      svc.probeAllAndPersist(),
      svc.probeAllAndPersist(),
    ]);
    // Exactly 13 (one round), not 39 (three rounds).
    expect((http.request as jest.Mock).mock.calls.length).toBe(13);
  });

  it('cold-start: 10 simultaneous probeAllAndPersist calls before any cache exists still fan out only 13 pings', async () => {
    const svc = new HealthCheckService(makePrisma());
    await Promise.all(Array.from({ length: 10 }, () => svc.probeAllAndPersist()));
    expect((http.request as jest.Mock).mock.calls.length).toBe(13);
  });

  it('subsequent probe rounds (after the first completes) DO run — dedup is per-in-flight, not permanent', async () => {
    const svc = new HealthCheckService(makePrisma());
    await svc.probeAllAndPersist();
    await svc.probeAllAndPersist();
    expect((http.request as jest.Mock).mock.calls.length).toBe(26);
  });
});
