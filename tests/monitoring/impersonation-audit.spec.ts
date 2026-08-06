import { PlatformSecretsService } from '../../services/monitoring/src/secrets/platform-secrets.service';
import { withImpersonation } from '../../shared/audit/impersonation';

describe('impersonation propagation into audit details', () => {
  describe('withImpersonation helper', () => {
    it('adds impersonatedBy when the actor holds an impersonation token', () => {
      expect(withImpersonation({ a: 1 }, { id: 'u1', impersonatedBy: 'admin-9' })).toEqual({
        a: 1,
        impersonatedBy: 'admin-9',
      });
    });

    it('omits the key entirely for a normal actor', () => {
      expect(withImpersonation({ a: 1 }, { id: 'u1' })).toEqual({ a: 1 });
    });

    it('never mutates the input details', () => {
      const details = { a: 1 };
      withImpersonation(details, { id: 'u1', impersonatedBy: 'admin-9' });
      expect(details).toEqual({ a: 1 });
    });
  });

  describe('platform secrets audit rows', () => {
    const makePrisma = () => ({
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      platformSecret: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 's1', key: 'SMTP_PASS', value: 'x' }),
        delete: jest.fn().mockResolvedValue({}),
      },
    });

    it('records impersonatedBy on a secret reveal', async () => {
      const prisma = makePrisma();
      const svc = new PlatformSecretsService(prisma as never);
      try {
        await svc.getReveal('s1', { id: 'victim-1', impersonatedBy: 'admin-9' });
      } catch {
        /* decryption of the fake value may fail; the audit row is what matters */
      }
      const calls = prisma.auditLog.create.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const details = calls[0][0].data.details as Record<string, unknown>;
      expect(details.impersonatedBy).toBe('admin-9');
    });

    it('leaves impersonatedBy off when the super admin acts as themselves', async () => {
      const prisma = makePrisma();
      const svc = new PlatformSecretsService(prisma as never);
      await svc.list({ id: 'admin-9' });
      const calls = prisma.auditLog.create.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const details = (calls[0][0].data.details ?? {}) as Record<string, unknown>;
      expect(details.impersonatedBy).toBeUndefined();
    });
  });
});
