import { decryptSecret } from '../../../shared/crypto/crypto.util';

/**
 * Prompt 0.16 — payment credentials must come from the encrypted platform
 * secret vault (`PlatformSecret`, AES-256-GCM at rest, reveal-audited), not
 * from plaintext process env. Env is kept as a last-resort fallback for local
 * development only, and every env-sourced value is reported as `env` so the
 * readiness check can flag it.
 */

export type SecretSource = 'vault' | 'env' | 'missing';

export interface ResolvedSecret {
  key: string;
  value: string | null;
  source: SecretSource;
}

/** Minimal shape of the Prisma client this resolver needs. */
export interface SecretStore {
  platformSecret: {
    findMany(args: any): Promise<Array<{ key: string; encryptedValue: string }>>;
  };
}

export interface ResolveOptions {
  env?: NodeJS.ProcessEnv;
  /** Decryption hook — overridable in tests. */
  decrypt?: (cipher: string) => string;
}

/**
 * Resolve a set of secret keys, preferring the vault.
 * Never throws on a bad ciphertext: that key degrades to the env fallback.
 */
export async function resolveSecrets(
  store: SecretStore | null | undefined,
  keys: string[],
  options: ResolveOptions = {},
): Promise<Record<string, ResolvedSecret>> {
  const env = options.env ?? process.env;
  const decrypt = options.decrypt ?? decryptSecret;

  let vault: Record<string, string> = {};
  if (store) {
    try {
      const rows = await store.platformSecret.findMany({
        where: { key: { in: keys } },
        select: { key: true, encryptedValue: true },
      });
      for (const row of rows ?? []) {
        try {
          const plain = decrypt(row.encryptedValue);
          if (plain) vault[row.key] = plain;
        } catch {
          // Unreadable ciphertext — fall through to env for this key.
        }
      }
    } catch {
      vault = {};
    }
  }

  const out: Record<string, ResolvedSecret> = {};
  for (const key of keys) {
    if (vault[key]) {
      out[key] = { key, value: vault[key], source: 'vault' };
      continue;
    }
    const fromEnv = env[key];
    out[key] = fromEnv
      ? { key, value: fromEnv, source: 'env' }
      : { key, value: null, source: 'missing' };
  }
  return out;
}

export const PAYMOB_SECRET_KEYS = [
  'PAYMOB_API_KEY',
  'PAYMOB_INTEGRATION_ID',
  'PAYMOB_HMAC_SECRET',
  'PAYMOB_IFRAME_ID',
];

export interface GatewayReadiness {
  provider: string;
  configured: boolean;
  /** True when every credential came from the encrypted vault. */
  vaultBacked: boolean;
  missing: string[];
  envSourced: string[];
  warnings: string[];
}

/** Summarize whether a provider is usable and whether it is vault-backed. */
export function assessReadiness(
  provider: string,
  resolved: Record<string, ResolvedSecret>,
  requiredKeys: string[],
): GatewayReadiness {
  const missing = requiredKeys.filter((k) => !resolved[k]?.value);
  const envSourced = Object.values(resolved)
    .filter((r) => r.source === 'env' && r.value)
    .map((r) => r.key);
  const warnings: string[] = [];
  if (missing.length) {
    warnings.push(`${provider}: missing credentials ${missing.join(', ')}`);
  }
  if (envSourced.length) {
    warnings.push(
      `${provider}: ${envSourced.join(', ')} are read from process env — move them into the platform secret vault`,
    );
  }
  return {
    provider,
    configured: missing.length === 0,
    vaultBacked: missing.length === 0 && envSourced.length === 0,
    missing,
    envSourced,
    warnings,
  };
}
