import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM helpers for encrypting Proxmox API token secrets.
 * Key is derived from SESSION_SECRET (SHA-256). Storage format:
 *   "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
function key(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'voidcloud-dev-secret';
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return '';
  const parts = payload.split(':');
  if (parts.length !== 3) return '';
  const [ivHex, tagHex, encHex] = parts;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return '';
  }
}

/** Mask a token secret for API responses: keep first/last 4 chars. */
export function maskSecret(payload: string | null | undefined): string {
  const plain = decryptSecret(payload);
  if (!plain) return '';
  if (plain.length <= 8) return '••••';
  return `${plain.slice(0, 4)}••••${plain.slice(-4)}`;
}
