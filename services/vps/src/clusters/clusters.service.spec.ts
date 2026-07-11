/**
 * Concurrency test for the Proxmox cluster scheduler.
 *
 * Fires N parallel schedule() calls against a cluster that only has capacity
 * for one VM and asserts that exactly one caller wins the reservation while
 * the rest return { chosen: null }. Because the scheduler runs inside a
 * Serializable transaction and writes a PendingAllocation before returning,
 * a second concurrent request either
 *   (a) sees the reservation and rejects itself, or
 *   (b) is rolled back by the DB with a serialization failure — in which
 *       case Prisma throws and no allocation row is created.
 *
 * The test uses an in-memory fake of the fields the service touches so it
 * does not require a running Postgres. The overcommit invariant is checked
 * directly: at most one PendingAllocation may exist for the single-capacity
 * cluster after all callers settle.
 */
import { ClustersService } from './clusters.service';

interface FakeCluster {
    id: string;
    name: string;
    status: string;
    cpuTotal: number;
    cpuUsed: number;
    ramTotal: bigint;
    ramUsed: bigint;
    diskTotal: bigint;
    diskUsed: bigint;
    vmCount: number;
    nodeCount: number;
    host: string;
    port: number;
    username: string;
    tokenId: string | null;
    tokenSecret: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface FakePending {
    id: string;
    clusterId: string;
    requestId: string;
    cpu: number;
    ramMB: number;
    diskGB: number;
    status: string;
    expiresAt: Date;
    createdAt: Date;
}

function makeFakePrisma(cluster: FakeCluster) {
    const pending: FakePending[] = [];
    // A coarse mutex simulating Serializable isolation on the pending table.
    // The real DB gives us this for free; the fake enforces it explicitly.
    let txLock: Promise<unknown> = Promise.resolve();

    const tx = {
        pendingAllocation: {
            updateMany: async ({ where, data }: any) => {
                let n = 0;
                for (const p of pending) {
                    if (
                        p.status === where.status &&
                        (where.expiresAt?.lt ? p.expiresAt < where.expiresAt.lt : true)
                    ) {
                        Object.assign(p, data);
                        n++;
                    }
                }
                return { count: n };
            },
            groupBy: async ({ where }: any) => {
                const active = pending.filter(
                    (p) => p.status === (where?.status ?? 'PENDING'),
                );
                const byCluster = new Map<string, { cpu: number; ram: number; disk: number }>();
                for (const p of active) {
                    const cur = byCluster.get(p.clusterId) ?? { cpu: 0, ram: 0, disk: 0 };
                    cur.cpu += p.cpu;
                    cur.ram += p.ramMB;
                    cur.disk += p.diskGB;
                    byCluster.set(p.clusterId, cur);
                }
                return Array.from(byCluster.entries()).map(([clusterId, v]) => ({
                    clusterId,
                    _sum: { cpu: v.cpu, ramMB: v.ram, diskGB: v.disk },
                }));
            },
            create: async ({ data }: any) => {
                if (pending.some((p) => p.requestId === data.requestId)) {
                    throw new Error('unique constraint: requestId');
                }
                const row: FakePending = {
                    id: `alloc-${pending.length + 1}`,
                    status: 'PENDING',
                    createdAt: new Date(),
                    ...data,
                };
                pending.push(row);
                return row;
            },
        },
        proxmoxCluster: {
            findMany: async ({ where }: any) => {
                if (where?.status && cluster.status !== where.status) return [];
                return [cluster];
            },
        },
    };

    const prisma = {
        pendingAllocation: tx.pendingAllocation,
        proxmoxCluster: tx.proxmoxCluster,
        $transaction: async (fn: (t: any) => Promise<unknown>) => {
            // Serialize transactions so overlapping schedulers see each other's
            // writes — matches Serializable semantics for this test.
            const run = txLock.then(() => fn(tx));
            txLock = run.catch(() => undefined);
            return run;
        },
    };

    return { prisma, pending };
}

describe('ClustersService.schedule — concurrency', () => {
    it('never double-allocates when many callers race for a single-slot cluster', async () => {
        const cluster: FakeCluster = {
            id: 'c1',
            name: 'edge-1',
            status: 'ACTIVE',
            cpuTotal: 2,
            cpuUsed: 0,
            ramTotal: BigInt(2048),
            ramUsed: BigInt(0),
            diskTotal: BigInt(40),
            diskUsed: BigInt(0),
            vmCount: 0,
            nodeCount: 1,
            host: '10.0.0.1',
            port: 8006,
            username: 'root@pam',
            tokenId: null,
            tokenSecret: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Run the concurrency scenario 25 times to catch any nondeterministic
        // scheduling bug.
        for (let iteration = 0; iteration < 25; iteration++) {
            const { prisma, pending } = makeFakePrisma({ ...cluster });
            const service = new ClustersService(prisma as any);

            // Each request wants everything the cluster has, so at most one
            // reservation should ever be granted.
            const req = { cpu: 2, ramMB: 2048, diskGB: 40 };
            const results = await Promise.all(
                Array.from({ length: 10 }, () => service.schedule(req)),
            );

            const winners = results.filter((r: any) => r.chosen !== null);
            const losers = results.filter((r: any) => r.chosen === null);

            expect(winners.length).toBe(1);
            expect(losers.length).toBe(9);
            expect(pending.filter((p) => p.status === 'PENDING').length).toBe(1);
        }
    });
});
