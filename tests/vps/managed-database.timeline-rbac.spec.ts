/**
 * RBAC + audit for managed-database timeline reads.
 *
 * The timeline exposes infrastructure detail (vmid, node) and the raw
 * provisioning errorMessage, so it is treated as a sensitive read: it is
 * ownership-gated like every other managed route, and both the authorized read
 * and the refused cross-tenant attempt land in the audit log.
 */
import { ManagedDatabaseService } from '../../services/vps/src/managed/managed-database.service';

const A_ROW = {
  id: 'db-A',
  userId: 'user-A',
  name: 'orders',
  engine: 'POSTGRES',
  status: 'FAILED',
  errorMessage: 'CT 601 failed to start',
  provisionAttempts: 2,
  correlationId: 'prov_abc',
  nextRetryAt: null,
  deletedAt: null,
};

function build() {
  const prisma: any = {
    managedDatabase: {
      // Real ownership semantics: the userId filter is honoured.
      findFirst: jest.fn(async ({ where }: any) =>
        where.id === A_ROW.id && where.userId === A_ROW.userId ? { ...A_ROW } : null,
      ),
    },
    managedDatabaseEvent: {
      findMany: jest.fn(async () => [
        {
          id: 'e1',
          status: 'FAILED',
          step: 'Provisioning failed',
          message: 'CT 601 failed to start',
          detail: { vmid: 601, node: 'pve-1' },
          correlationId: 'prov_abc',
          createdAt: new Date(),
        },
      ]),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  const svc = new ManagedDatabaseService(prisma as any, { provision: jest.fn() } as any);
  return { prisma, svc };
}

describe('Managed database timeline — RBAC and audit', () => {
  it('the owner sees the timeline including errorMessage and correlationId', async () => {
    const { svc } = build();
    const out: any = await svc.events('user-A', 'db-A');
    expect(out.status).toBe('FAILED');
    expect(out.errorMessage).toBe('CT 601 failed to start');
    expect(out.correlationId).toBe('prov_abc');
    expect(out.events[0].correlationId).toBe('prov_abc');
  });

  it('an authorized read is written to the audit log as SUCCESS', async () => {
    const { svc, prisma } = build();
    await svc.events('user-A', 'db-A');
    const entry = prisma.auditLog.create.mock.calls[0][0].data;
    expect(entry).toMatchObject({
      userId: 'user-A',
      action: 'MANAGED_DB_EVENTS_READ',
      resource: 'managed_database',
      resourceId: 'db-A',
      status: 'SUCCESS',
    });
  });

  it("Tenant B cannot read Tenant A's timeline and leaks no errorMessage", async () => {
    const { svc } = build();
    await expect(svc.events('user-B', 'db-A')).rejects.toThrow('Database not found');
  });

  it('the refused cross-tenant read is audited as FAILED', async () => {
    const { svc, prisma } = build();
    await svc.events('user-B', 'db-A').catch(() => undefined);
    const entry = prisma.auditLog.create.mock.calls[0][0].data;
    expect(entry.status).toBe('FAILED');
    expect(entry.userId).toBe('user-B');
    expect(entry.resourceId).toBe('db-A');
  });

  it('a non-existent id and a foreign id are indistinguishable to the caller', async () => {
    const { svc } = build();
    const foreign = await svc.events('user-B', 'db-A').catch((e) => String(e.message));
    const missing = await svc.events('user-A', 'db-nope').catch((e) => String(e.message));
    expect(foreign).toBe(missing);
  });

  it('the SSE stream applies the same ownership gate', async () => {
    const { svc } = build();
    await expect(
      new Promise((resolve, reject) => {
        svc.eventStream('user-B', 'db-A').subscribe({ next: resolve, error: reject });
      }),
    ).rejects.toThrow('Database not found');
  });
});
