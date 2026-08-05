import {
  detectIpVersion,
  expandIpv4Cidr,
  normalizeAddresses,
} from '../../services/vps/src/network/floating-ip';

describe('Tier 9 — floating IP pool (pure logic)', () => {
  describe('detectIpVersion', () => {
    it('detects IPv4', () => {
      expect(detectIpVersion('10.51.100.10')).toBe(4);
      expect(detectIpVersion('0.0.0.0')).toBe(4);
    });

    it('detects IPv6', () => {
      expect(detectIpVersion('2001:db8::1')).toBe(6);
      expect(detectIpVersion('fe80::1')).toBe(6);
    });

    it('rejects malformed addresses', () => {
      expect(detectIpVersion('10.51.100.999')).toBeNull();
      expect(detectIpVersion('not-an-ip')).toBeNull();
      expect(detectIpVersion('2001::db8::1')).toBeNull();
      expect(detectIpVersion('')).toBeNull();
    });
  });

  describe('expandIpv4Cidr', () => {
    it('excludes network and broadcast addresses', () => {
      const addresses = expandIpv4Cidr('192.0.2.0/29');
      expect(addresses).toEqual([
        '192.0.2.1',
        '192.0.2.2',
        '192.0.2.3',
        '192.0.2.4',
        '192.0.2.5',
        '192.0.2.6',
      ]);
    });

    it('keeps both addresses of a /31 point-to-point link', () => {
      expect(expandIpv4Cidr('192.0.2.0/31')).toEqual(['192.0.2.0', '192.0.2.1']);
    });

    it('normalizes a non-aligned base address to its network', () => {
      expect(expandIpv4Cidr('192.0.2.5/30')).toEqual(['192.0.2.5', '192.0.2.6']);
    });

    it('refuses oversized imports', () => {
      expect(() => expandIpv4Cidr('10.0.0.0/8')).toThrow(/import limit/);
    });

    it('rejects invalid CIDRs', () => {
      expect(() => expandIpv4Cidr('nope/24')).toThrow(/Invalid IPv4 CIDR/);
      expect(() => expandIpv4Cidr('192.0.2.0/64')).toThrow(/Invalid IPv4 CIDR/);
    });
  });

  describe('normalizeAddresses', () => {
    it('lowercases, trims and de-duplicates', () => {
      const result = normalizeAddresses([' 2001:DB8::1 ', '2001:db8::1', '192.0.2.1']);
      expect(result).toEqual([
        { address: '2001:db8::1', ipVersion: 6 },
        { address: '192.0.2.1', ipVersion: 4 },
      ]);
    });

    it('throws on any invalid entry rather than silently dropping it', () => {
      expect(() => normalizeAddresses(['192.0.2.1', 'garbage'])).toThrow(/Invalid IP address/);
    });
  });
});
