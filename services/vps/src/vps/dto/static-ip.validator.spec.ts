import { IsInProxmoxPoolConstraint } from './static-ip.validator';

describe('IsInProxmoxPoolConstraint', () => {
  const validator = new IsInProxmoxPoolConstraint();

  const setEnv = (pool: string, gateway: string, start?: string) => {
    process.env.PROXMOX_IP_POOL_CIDR = pool;
    process.env.PROXMOX_GATEWAY = gateway;
    if (start !== undefined) process.env.PROXMOX_IP_POOL_START = start;
    else delete process.env.PROXMOX_IP_POOL_START;
  };

  afterEach(() => {
    delete process.env.PROXMOX_IP_POOL_CIDR;
    delete process.env.PROXMOX_GATEWAY;
    delete process.env.PROXMOX_IP_POOL_START;
  });

  it('accepts a valid in-pool address above the allocation floor', () => {
    setEnv('10.51.100.0/24', '10.51.100.1', '50');
    expect(validator.validate('10.51.100.52')).toBe(true);
  });

  it('rejects an address outside the pool', () => {
    setEnv('10.51.100.0/24', '10.51.100.1', '50');
    expect(validator.validate('10.52.100.42')).toBe(false);
    expect(validator.validate('192.168.1.5')).toBe(false);
  });

  it('rejects the gateway address', () => {
    setEnv('10.51.100.0/24', '10.51.100.1', '50');
    expect(validator.validate('10.51.100.1')).toBe(false);
  });

  it('rejects the network and broadcast addresses', () => {
    setEnv('10.51.100.0/24', '10.51.100.1', '50');
    expect(validator.validate('10.51.100.0')).toBe(false);
    expect(validator.validate('10.51.100.255')).toBe(false);
  });

  it('rejects addresses below the allocation floor (reserved/infra)', () => {
    setEnv('10.51.100.0/24', '10.51.100.1', '50');
    expect(validator.validate('10.51.100.2')).toBe(false);
    expect(validator.validate('10.51.100.49')).toBe(false);
  });

  it('rejects malformed input', () => {
    setEnv('10.51.100.0/24', '10.51.100.1', '50');
    expect(validator.validate('not-an-ip')).toBe(false);
    expect(validator.validate('10.51.100.999')).toBe(false);
    expect(validator.validate('')).toBe(false);
    // @ts-expect-error - runtime guard against non-string input
    expect(validator.validate(undefined)).toBe(false);
  });
});
