/**
 * Tier 9 — Floating IP pool (IPv4 + IPv6).
 *
 * Pure address maths so pool import and validation are testable without a
 * database or a hypervisor.
 */

export type IpVersion = 4 | 6;

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function detectIpVersion(address: string): IpVersion | null {
  if (IPV4_RE.test(address)) {
    const octets = address.split('.').map(Number);
    return octets.every((o) => o >= 0 && o <= 255) ? 4 : null;
  }
  // Conservative IPv6 check: hex groups separated by ':', optional '::'.
  if (/^[0-9a-fA-F:]+$/.test(address) && address.includes(':')) {
    if ((address.match(/::/g) ?? []).length > 1) return null;
    const groups = address.split(':').filter((g) => g.length > 0);
    if (groups.length > 8) return null;
    if (groups.some((g) => g.length > 4)) return null;
    return 6;
  }
  return null;
}

function ipv4ToInt(address: string): number {
  return address
    .split('.')
    .reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

function intToIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

/** Expand an IPv4 CIDR into assignable host addresses (network + broadcast excluded). */
export function expandIpv4Cidr(cidr: string, max = 1024): string[] {
  const [base, prefixRaw] = cidr.split('/');
  const prefix = Number(prefixRaw);
  if (detectIpVersion(base ?? '') !== 4 || !Number.isInteger(prefix) || prefix < 8 || prefix > 32) {
    throw new Error(`Invalid IPv4 CIDR: ${cidr}`);
  }

  const size = 2 ** (32 - prefix);
  if (size > max + 2) {
    throw new Error(`CIDR ${cidr} expands to ${size} addresses, above the ${max} import limit`);
  }

  const network = ipv4ToInt(base!) & (size === 2 ** 32 ? 0 : (-1 << (32 - prefix)) >>> 0);
  const addresses: string[] = [];

  if (prefix >= 31) {
    // /31 and /32 have no network/broadcast reservation in point-to-point use.
    for (let i = 0; i < size; i += 1) addresses.push(intToIpv4(network + i));
    return addresses;
  }

  for (let i = 1; i < size - 1; i += 1) addresses.push(intToIpv4(network + i));
  return addresses;
}

/** Normalize a caller-supplied address list, rejecting malformed entries. */
export function normalizeAddresses(
  addresses: string[],
): { address: string; ipVersion: IpVersion }[] {
  const seen = new Set<string>();
  const result: { address: string; ipVersion: IpVersion }[] = [];

  for (const raw of addresses) {
    const address = raw.trim().toLowerCase();
    if (!address || seen.has(address)) continue;
    const ipVersion = detectIpVersion(address);
    if (!ipVersion) throw new Error(`Invalid IP address: ${raw}`);
    seen.add(address);
    result.push({ address, ipVersion });
  }

  return result;
}
