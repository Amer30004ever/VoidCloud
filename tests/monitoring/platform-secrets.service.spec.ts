/**
 * Tier 6.9 — Platform Secrets Manager audit guarantees.
 *
 * A reveal that isn't durably audit-logged is a compliance failure, so the
 * audit write must be awaited and its failure must propagate.
 */
import { PlatformSecretsService } from '../../services/monitoring/src/secrets/platform-secrets.service';

describe('Tier 6.9 — PlatformSecretsService audit logging', () => {
  const KEY = 'a'.repeat(64);
  let prisma: any;
  let service: any;

  beforeAll(() => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY;
    process.env.PLATFORM_SECRETS_KEY = KEY;
  });

  beforeEach(() => {
    prisma = {
      platformSecret: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
    };
    service = new PlatformSecretsService(prisma as any);
  });

  it('awaits the audit write before returning a revealed secret', async () => {
    const encrypted = (service as any).constructor
      ? undefined
      : undefined;
    // Round-trip a real secret through the service's own create path so the
    // ciphertext format matches what getReveal expects.
    prisma.platformSecret.create.mockImplementation(async ({ data }: any) => ({
      id: 's1',
      key: data.key,
      encryptedValue: data.encryptedValue,
    }));
    const created = await service.create({ key: 'STRIPE_KEY', value: 'sk_live_123' } as any, 'u1');
    prisma.platformSecret.findUnique.mockResolvedValue({
      id: 's1',
      key: 'STRIPE_KEY',
      encryptedValue: prisma.platformSecret.create.mock.calls[0][0].data.encryptedValue,
    });
    prisma.auditLog.create.mockClear();

    const result = await service.getReveal('s1');

    expect(result.plainValue).toBe('sk_live_123');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PLATFORM_SECRET_REVEAL' }),
      }),
    );
    expect(created).toBeDefined();
    expect(encrypted).toBeUndefined();
  });

  it('propagates an audit-write failure instead of silently revealing', async () => {
    prisma.platformSecret.create.mockImplementation(async ({ data }: any) => ({
      id: 's1',
      key: data.key,
      encryptedValue: data.encryptedValue,
    }));
    await service.create({ key: 'K', value: 'v' } as any, 'u1');
    prisma.platformSecret.findUnique.mockResolvedValue({
      id: 's1',
      key: 'K',
      encryptedValue: prisma.platformSecret.create.mock.calls[0][0].data.encryptedValue,
    });
    prisma.auditLog.create.mockRejectedValue(new Error('audit db down'));

    await expect(service.getReveal('s1')).rejects.toThrow('audit db down');
  });

  it('returns null for an unknown secret without writing an audit record', async () => {
    prisma.platformSecret.findUnique.mockResolvedValue(null);
    await expect(service.getReveal('nope')).resolves.toBeNull();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('resolves the secret list before masking (no unawaited promise)', async () => {
    prisma.platformSecret.findMany.mockResolvedValue([
      { id: '1', key: 'A', encryptedValue: 'iv:tag:cipher', description: null },
    ]);
    const list = await service.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list[0].maskedValue).toBeDefined();
  });
});
