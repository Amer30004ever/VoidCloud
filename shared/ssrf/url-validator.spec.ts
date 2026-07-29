import {
  validateWebhookUrl,
  isPrivateIp,
  SsrfValidationError,
  type DnsLookup,
} from './url-validator';

describe('validateWebhookUrl — SSRF protection', () => {
  const publicLookup: DnsLookup = async () => [{ address: '93.184.216.34', family: 4 }];

  it('rejects an internal Kubernetes service hostname at registration', async () => {
    await expect(
      validateWebhookUrl('https://postgres.voidcloud.svc.cluster.local/hook'),
    ).rejects.toThrow(SsrfValidationError);
  });

  it('rejects a URL that resolves to a private IP', async () => {
    const privateLookup: DnsLookup = async () => [{ address: '10.0.0.5', family: 4 }];
    await expect(
      validateWebhookUrl('https://evil.example.com/hook', { lookup: privateLookup }),
    ).rejects.toThrow(/private or internal IP/);
  });

  it('accepts a legitimate external HTTPS URL', async () => {
    const url = await validateWebhookUrl('https://hooks.example.com/voidcloud', {
      lookup: publicLookup,
    });
    expect(url).toBe('https://hooks.example.com/voidcloud');
  });

  it('rejects non-http(s) schemes', async () => {
    await expect(validateWebhookUrl('file:///etc/passwd')).rejects.toThrow(/http and https/);
    await expect(validateWebhookUrl('gopher://127.0.0.1/')).rejects.toThrow(/http and https/);
  });

  it('rejects URLs with embedded credentials', async () => {
    await expect(
      validateWebhookUrl('https://user:pass@hooks.example.com/hook', { lookup: publicLookup }),
    ).rejects.toThrow(/embedded credentials/);
  });

  it('catches DNS rebinding at delivery time when resolution changes', async () => {
    let call = 0;
    const rebindingLookup: DnsLookup = async () => {
      call++;
      if (call === 1) return [{ address: '93.184.216.34', family: 4 }];
      return [{ address: '192.168.1.50', family: 4 }];
    };

    await expect(
      validateWebhookUrl('https://rebind.example.com/hook', { lookup: rebindingLookup }),
    ).resolves.toBeDefined();

    await expect(
      validateWebhookUrl('https://rebind.example.com/hook', { lookup: rebindingLookup }),
    ).rejects.toThrow(/private or internal IP/);
  });
});

describe('isPrivateIp', () => {
  it('classifies RFC1918 and loopback ranges', () => {
    expect(isPrivateIp('10.1.2.3')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('192.168.0.1')).toBe(true);
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('169.254.1.1')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
  });
});
