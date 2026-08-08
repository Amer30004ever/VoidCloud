import { AccountDeletionService } from '../../services/auth/src/deletion/account-deletion.service';

describe('account deletion audit — impersonation propagation', () => {
  const makePrisma = () => {
    const prisma: any = {
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'victim-1',
          email: 'victim@example.com',
          role: 'USER',
          // bcryptjs hash of "correct-horse"
          password: '$2a$04$8k1H0h1sRGGkG7WQ7GxGmuVN9WgTQ5tQ8sD3gJk0hZ8m0i0k1Xq1O',
        }),
      },
    };
    return prisma;
  };

  const build = () => {
    const prisma = makePrisma();
    const svc = new AccountDeletionService(prisma as never);
    // executeDeletion touches ~60 prisma models; the audit row is what we assert.
    (svc as any).executeDeletion = jest.fn().mockResolvedValue(undefined);
    return { prisma, svc };
  };

  it('records impersonatedBy on an admin-initiated deletion', async () => {
    const { prisma, svc } = build();
    await svc.adminDelete('admin-9', 'victim-1', 'abuse', {
      id: 'admin-9',
      impersonatedBy: 'root-1',
    });
    const details = prisma.auditLog.create.mock.calls[0][0].data.details;
    expect(details.impersonatedBy).toBe('root-1');
    expect(details.reason).toBe('abuse');
  });

  it('omits impersonatedBy for a normal admin actor', async () => {
    const { prisma, svc } = build();
    await svc.adminDelete('admin-9', 'victim-1', 'abuse', { id: 'admin-9' });
    const details = prisma.auditLog.create.mock.calls[0][0].data.details;
    expect(details.impersonatedBy).toBeUndefined();
  });

  it('omits impersonatedBy when no actor is supplied', async () => {
    const { prisma, svc } = build();
    await svc.adminDelete('admin-9', 'victim-1', 'abuse');
    const details = prisma.auditLog.create.mock.calls[0][0].data.details;
    expect(details.impersonatedBy).toBeUndefined();
  });

  it('requires a reason for admin deletion', async () => {
    const { svc } = build();
    await expect(svc.adminDelete('admin-9', 'victim-1')).rejects.toThrow();
  });
});
