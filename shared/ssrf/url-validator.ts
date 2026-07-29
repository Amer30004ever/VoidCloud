/**
 * SSRF-safe outbound URL validation for tenant-supplied webhook URLs.
 *
 * Used at registration/update AND immediately before each delivery attempt
 * to mitigate DNS rebinding (TOCTOU between register-time and send-time).
 */
import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOST_SUFFIXES = ['.svc.cluster.local', '.cluster.local'];

const BLOCKED_LITERAL_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.internal',
]);

export class SsrfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfValidationError';
  }
}

export type DnsAddress = { address: string; family: number };
export type DnsLookup = (hostname: string) => Promise<DnsAddress[]>;

/** Returns true for RFC1918, loopback, link-local, and cloud metadata ranges. */
export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe80')) return true;
    return false;
  }
  return false;
}

export function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_LITERAL_HOSTS.has(h)) return true;
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    const bare = suffix.slice(1);
    if (h === bare || h.endsWith(suffix)) return true;
  }
  if (net.isIP(h)) return isPrivateIp(h);
  return false;
}

async function defaultLookup(hostname: string): Promise<DnsAddress[]> {
  try {
    return await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SsrfValidationError('DNS resolution failed');
  }
}

/**
 * Validate a tenant webhook URL. Resolves DNS and rejects private/internal targets.
 * Call again immediately before every outbound HTTP request (delivery time).
 */
export async function validateWebhookUrl(
  rawUrl: string,
  opts?: { lookup?: DnsLookup },
): Promise<string> {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new SsrfValidationError('URL is required');

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new SsrfValidationError('Invalid URL');
  }

  const scheme = parsed.protocol.toLowerCase();
  if (scheme !== 'https:' && scheme !== 'http:') {
    throw new SsrfValidationError('Only http and https URLs are allowed');
  }

  if (parsed.username || parsed.password) {
    throw new SsrfValidationError('URLs with embedded credentials are not allowed');
  }

  const hostname = parsed.hostname;
  if (!hostname) throw new SsrfValidationError('Invalid hostname');
  if (isBlockedHostname(hostname)) {
    throw new SsrfValidationError('Hostname is not allowed');
  }

  const lookup = opts?.lookup ?? defaultLookup;
  const records = await lookup(hostname);
  if (!records.length) {
    throw new SsrfValidationError('DNS resolution failed');
  }

  for (const rec of records) {
    if (isPrivateIp(rec.address)) {
      throw new SsrfValidationError('URL resolves to a private or internal IP address');
    }
  }

  return parsed.toString();
}
