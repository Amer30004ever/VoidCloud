/**
 * Tier 5.13a — automated OIDC bootstrap for Gitea and Portainer.
 * Proves the real service: skip-on-missing-config, idempotency, error
 * propagation, and the exact HTTP calls it makes (fetch is stubbed).
 */
import { OidcBootstrapService } from '../../services/auth/src/oidc/oidc-bootstrap.service';

const ENV_KEYS = [
  'GITEA_URL',
  'GITEA_ADMIN_TOKEN',
  'OIDC_GITEA_CLIENT_ID',
  'OIDC_GITEA_CLIENT_SECRET',
  'PORTAINER_URL',
  'PORTAINER_ADMIN_TOKEN',
  'OIDC_PORTAINER_CLIENT_ID',
  'OIDC_PORTAINER_CLIENT_SECRET',
  'OIDC_ISSUER',
];

const res = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

describe('OidcBootstrapService', () => {
  let service: OidcBootstrapService;
  let fetchMock: jest.Mock;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    service = new OidcBootstrapService();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    jest.clearAllMocks();
  });

  const configureGitea = () => {
    process.env.GITEA_URL = 'https://git.example.com';
    process.env.GITEA_ADMIN_TOKEN = 'gitea-token';
    process.env.OIDC_GITEA_CLIENT_ID = 'gitea-client';
    process.env.OIDC_GITEA_CLIENT_SECRET = 'gitea-secret';
    process.env.OIDC_ISSUER = 'https://issuer.example.com';
  };

  const configurePortainer = () => {
    process.env.PORTAINER_URL = 'https://portainer.example.com';
    process.env.PORTAINER_ADMIN_TOKEN = 'portainer-token';
    process.env.OIDC_PORTAINER_CLIENT_ID = 'portainer-client';
    process.env.OIDC_PORTAINER_CLIENT_SECRET = 'portainer-secret';
    process.env.OIDC_ISSUER = 'https://issuer.example.com';
  };

  describe('bootstrapGitea', () => {
    it('skips when the Gitea URL/token are not configured (no network call)', async () => {
      const r = await service.bootstrapGitea();
      expect(r.status).toBe('skipped');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('skips when OIDC client credentials are missing', async () => {
      process.env.GITEA_URL = 'https://git.example.com';
      process.env.GITEA_ADMIN_TOKEN = 'gitea-token';
      const r = await service.bootstrapGitea();
      expect(r.status).toBe('skipped');
      expect(r.message).toMatch(/OIDC_GITEA_CLIENT_ID/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('is idempotent: skips when the VoidCloud SSO application already exists', async () => {
      configureGitea();
      fetchMock.mockResolvedValueOnce(res([{ id: 7, name: 'VoidCloud SSO' }]));
      const r = await service.bootstrapGitea();
      expect(r.status).toBe('skipped');
      expect(r.details).toMatchObject({ applicationId: 7 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('registers the OAuth2 application on the real Gitea endpoint when absent', async () => {
      configureGitea();
      fetchMock
        .mockResolvedValueOnce(res([{ id: 1, name: 'Something else' }]))
        .mockResolvedValueOnce(res({ id: 42, client_id: 'abc', client_secret: 'shh' }, true, 201));

      const r = await service.bootstrapGitea();
      expect(r.status).toBe('success');
      expect(r.details).toMatchObject({ id: 42, client_id: 'abc', clientSecretIssued: true });
      // The minted secret must never be echoed back through the result.
      expect(JSON.stringify(r.details)).not.toContain('shh');

      const [createUrl, createInit] = fetchMock.mock.calls[1];
      expect(createUrl).toBe('https://git.example.com/api/v1/user/applications/oauth2');
      expect(createInit.method).toBe('POST');
      expect(createInit.headers.Authorization).toBe('token gitea-token');
      const body = JSON.parse(createInit.body);
      expect(body).toMatchObject({
        name: 'VoidCloud SSO',
        redirect_uris: ['https://issuer.example.com/oidc/callback/gitea'],
        confidential_client: true,
      });
    });

    it('surfaces a rejected admin token as an error', async () => {
      configureGitea();
      fetchMock.mockResolvedValueOnce(res('unauthorized', false, 401));
      const r = await service.bootstrapGitea();
      expect(r.status).toBe('error');
      expect(r.message).toMatch(/401/);
    });


    it('returns an error result (does not throw) when Gitea rejects the create', async () => {
      configureGitea();
      fetchMock
        .mockResolvedValueOnce(res([]))
        .mockResolvedValueOnce(res('forbidden', false, 403));
      const r = await service.bootstrapGitea();
      expect(r.status).toBe('error');
      expect(r.message).toMatch(/403/);
    });

    it('returns an error result when the network call throws', async () => {
      configureGitea();
      fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const r = await service.bootstrapGitea();
      expect(r.status).toBe('error');
      expect(r.message).toMatch(/ECONNREFUSED/);
    });
  });

  describe('bootstrapPortainer', () => {
    it('skips when Portainer is not configured', async () => {
      const r = await service.bootstrapPortainer();
      expect(r.status).toBe('skipped');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('skips when the OIDC client credentials are missing', async () => {
      process.env.PORTAINER_URL = 'https://portainer.example.com';
      process.env.PORTAINER_ADMIN_TOKEN = 'portainer-token';
      const r = await service.bootstrapPortainer();
      expect(r.status).toBe('skipped');
      expect(r.message).toMatch(/OIDC_PORTAINER_CLIENT_ID/);
    });

    it('PUTs full OAuth settings derived from the issuer', async () => {
      configurePortainer();
      fetchMock.mockResolvedValueOnce(res({}, true, 200));

      const r = await service.bootstrapPortainer();
      expect(r.status).toBe('success');

      const [putUrl, init] = fetchMock.mock.calls[0];
      expect(putUrl).toBe('https://portainer.example.com/api/settings');
      expect(init.method).toBe('PUT');
      expect(init.headers.Authorization).toBe('Bearer portainer-token');
      const settings = JSON.parse(init.body).OAuthSettings;
      expect(settings).toMatchObject({
        ClientID: 'portainer-client',
        ClientSecret: 'portainer-secret',
        AuthorizationURI: 'https://issuer.example.com/oidc/auth',
        TokenURI: 'https://issuer.example.com/oidc/token',
        UserInfoURI: 'https://issuer.example.com/oidc/userinfo',
        RedirectURI: 'https://issuer.example.com/oidc/callback/portainer',
        Scopes: 'openid,profile,email',
        OAuthAutoCreateUsers: true,
      });
    });

    it('surfaces a non-OK Portainer response as an error result', async () => {
      configurePortainer();
      fetchMock.mockResolvedValueOnce(res('bad token', false, 401));
      const r = await service.bootstrapPortainer();
      expect(r.status).toBe('error');
      expect(r.message).toMatch(/401/);
    });
  });
});
