import {
  loadIsolationConfig,
  buildNet0,
  buildFirewallRaw,
  vlanForTenant,
  isBlockedDestination,
  ipInCidr,
  ipToLong,
  type IsolationConfig,
} from './vm-network-isolation';

const cfg: IsolationConfig = {
  bridge: 'vmbr0',
  poolCidr: '10.51.100.0/24',
  k8sInternalCidrs: ['10.42.0.0/16', '10.96.0.0/12', '172.16.0.0/12'],
  gateway: '10.51.100.1',
  vlanPerTenant: false,
};

describe('vm-network-isolation — tenant VM isolation (Prompt 0.15)', () => {
  describe('loadIsolationConfig defaults', () => {
    it('defaults K8s-internal CIDRs to common cluster ranges when unset', () => {
      const c = loadIsolationConfig({ PROXMOX_IP_POOL_CIDR: '10.51.100.0/24' });
      expect(c.k8sInternalCidrs.length).toBeGreaterThan(0);
      expect(c.k8sInternalCidrs).toContain('10.96.0.0/12');
    });

    it('honours an explicit PROXMOX_K8S_INTERNAL_CIDRS override', () => {
      const c = loadIsolationConfig({
        PROXMOX_IP_POOL_CIDR: '10.51.100.0/24',
        PROXMOX_K8S_INTERNAL_CIDRS: '192.168.5.0/24',
      });
      expect(c.k8sInternalCidrs).toEqual(['192.168.5.0/24']);
    });

    it('enables per-tenant VLAN only when explicitly true', () => {
      expect(loadIsolationConfig({}).vlanPerTenant).toBe(false);
      expect(loadIsolationConfig({ PROXMOX_VLAN_PER_TENANT: 'true' }).vlanPerTenant).toBe(true);
    });
  });

  describe('vlanForTenant', () => {
    it('is deterministic for the same tenant', () => {
      expect(vlanForTenant('tenant-abc')).toBe(vlanForTenant('tenant-abc'));
    });
    it('stays within usable VLAN range (2..4094)', () => {
      const v = vlanForTenant('some-tenant');
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(4094);
    });
  });

  describe('buildNet0', () => {
    it('omits VLAN tag by default', () => {
      const net0 = buildNet0(cfg, '10.51.100.55');
      expect(net0).toBe('name=eth0,bridge=vmbr0,ip=10.51.100.55/24,gw=10.51.100.1');
    });
    it('adds a tag when a VLAN is supplied', () => {
      const net0 = buildNet0(cfg, '10.51.100.55', { vlanTag: 1234 });
      expect(net0).toContain('tag=1234');
    });
  });

  describe('firewall blocks isolated destinations', () => {
    const raw = buildFirewallRaw(cfg);

    it('produces a ruleset that DROPs the tenant VM pool (east-west)', () => {
      expect(raw).toContain('-A OUTPUT -d 10.51.100.0/24 -j DROP');
      expect(raw).toContain('-A INPUT -s 10.51.100.0/24 -j DROP');
    });

    it('produces a ruleset that DROPs every K8s-internal CIDR', () => {
      for (const cidr of cfg.k8sInternalCidrs) {
        expect(raw).toContain(`-A OUTPUT -d ${cidr} -j DROP`);
        expect(raw).toContain(`-A INPUT -s ${cidr} -j DROP`);
      }
    });

    it('still allows the gateway so the VM can reach the internet', () => {
      expect(raw).toContain('-A OUTPUT -d 10.51.100.1 -j ACCEPT');
    });

    it('isBlockedDestination flags other tenant VMs as blocked', () => {
      expect(isBlockedDestination(cfg, '10.51.100.77')).toBe(true);
      expect(isBlockedDestination(cfg, '10.51.100.2')).toBe(true);
    });

    it('isBlockedDestination flags K8s-internal addresses as blocked', () => {
      expect(isBlockedDestination(cfg, '10.42.3.9')).toBe(true); // pod CIDR
      expect(isBlockedDestination(cfg, '10.96.0.10')).toBe(true); // service CIDR
      expect(isBlockedDestination(cfg, '172.16.4.4')).toBe(true); // cluster-internal
    });

    it('isBlockedDestination allows public internet destinations', () => {
      // Gateway lives inside the pool CIDR but is explicitly ACCEPTed by the
      // firewall's gateway rule, so it is still reachable at the ruleset level.
      expect(isBlockedDestination(cfg, '93.184.216.34')).toBe(false);
      expect(isBlockedDestination(cfg, '1.1.1.1')).toBe(false);
    });
  });

  describe('CIDR math', () => {
    it('ipToLong converts dotted quads', () => {
      expect(ipToLong('10.51.100.5')).toBe((10 << 24) + (51 << 16) + (100 << 8) + 5);
      expect(ipToLong('not-an-ip')).toBeNull();
    });
    it('ipInCidr respects mask', () => {
      expect(ipInCidr('10.51.100.77', '10.51.100.0/24')).toBe(true);
      expect(ipInCidr('10.51.101.77', '10.51.100.0/24')).toBe(false);
      expect(ipInCidr('10.42.5.5', '10.42.0.0/16')).toBe(true);
      expect(ipInCidr('10.96.0.1', '10.96.0.0/12')).toBe(true);
    });
  });
});
