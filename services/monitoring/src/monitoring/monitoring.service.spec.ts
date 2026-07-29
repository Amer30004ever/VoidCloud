import { MonitoringService } from './monitoring.service';

jest.mock('../common/token-revocation', () => ({
    getRedis: jest.fn(),
}));

describe('MonitoringService', () => {
    let service: MonitoringService;
    let prisma: any;
    let redis: any;
    let getRedisMock: jest.MockedFunction<() => any>;

    beforeEach(() => {
        const tokenRevocation = require('../common/token-revocation');
        getRedisMock = tokenRevocation.getRedis as jest.MockedFunction<() => any>;

        prisma = {
            ipBlockList: {
                upsert: jest.fn(),
                deleteMany: jest.fn(),
                findMany: jest.fn(),
            },
            alert: {
                findMany: jest.fn(),
                create: jest.fn(),
            },
        };

        redis = {
            smembers: jest.fn().mockResolvedValue([]),
            srem: jest.fn().mockResolvedValue(1),
            sadd: jest.fn().mockResolvedValue(1),
            scanIterator: jest.fn(),
            zcard: jest.fn(),
        };

        getRedisMock.mockReturnValue(redis);
        service = new MonitoringService(prisma);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('blocks an IP in both Prisma and Redis', async () => {
        prisma.ipBlockList.upsert.mockResolvedValue({ ipAddress: '1.2.3.4' });

        const result = await service.blockIP('1.2.3.4', 'abuse', true, undefined);

        expect(prisma.ipBlockList.upsert).toHaveBeenCalledWith({
            where: { ipAddress: '1.2.3.4' },
            update: { reason: 'abuse', isPermanent: true, expiresAt: null, blockedBy: 'admin' },
            create: { ipAddress: '1.2.3.4', reason: 'abuse', blockedBy: 'admin', isPermanent: true, expiresAt: null },
        });
        expect(redis.sadd).toHaveBeenCalledWith('ratelimit:blocked:ips', '1.2.3.4');
        expect(result.ipAddress).toBe('1.2.3.4');
    });

    it('unblocks an IP in both Redis and Prisma', async () => {
        prisma.ipBlockList.deleteMany.mockResolvedValue({ count: 1 });

        await service.unblockIP('1.2.3.4');

        expect(redis.srem).toHaveBeenCalledWith('ratelimit:blocked:ips', '1.2.3.4');
        expect(prisma.ipBlockList.deleteMany).toHaveBeenCalledWith({ where: { ipAddress: '1.2.3.4' } });
    });

    it('collects rate limit stats with blocked IP flags', async () => {
        prisma.ipBlockList.findMany.mockResolvedValue([{ ipAddress: '1.2.3.4' }]);

        const ipScanIterator = async function* () {
            yield 'ratelimit:sw:ip:1.2.3.4';
        };
        const tenantScanIterator = async function* () {
            yield 'ratelimit:sw:tenant:tenant-1';
        };

        redis.scanIterator
            .mockImplementationOnce(() => ipScanIterator())
            .mockImplementationOnce(() => tenantScanIterator());

        redis.zcard.mockImplementation(async (key: string) => (key.includes('ratelimit:sw:ip:') ? 42 : 10));

        const stats = await service.getRateLimitStats();

        expect(stats.blockedIPs).toEqual(['1.2.3.4']);
        expect(stats.topIPs).toEqual([
            {
                ip: '1.2.3.4',
                requests: 42,
                blocked: true,
                country: null,
                tenantId: null,
            },
        ]);
        expect(stats.tenantRates).toEqual([{ tenantId: 'tenant-1', requestsPerMin: 10 }]);
        expect(stats.requestsPerMinute).toBe(42);
    });
});
