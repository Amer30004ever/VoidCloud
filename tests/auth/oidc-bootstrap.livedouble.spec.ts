/**
 * Live double: runs a REAL http server that speaks the Gitea / Portainer admin
 * APIs and invokes OidcBootstrapService against it over real fetch (no mocks).
 * Proves the service performs an actual OIDC client registration round-trip and
 * that the registration is readable back from the server afterwards.
 */
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { OidcBootstrapService } from '../../services/auth/src/oidc/oidc-bootstrap.service';

type Req = { method: string; url: string; body: any };

function startServer(handler: (req: Req, res: any) => void): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        handler({ method: req.method!, url: req.url!, body: raw ? JSON.parse(raw) : undefined }, res);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('OidcBootstrapService — live HTTP double', () => {
  const env = { ...process.env };
  let server: Server;
  afterEach(() => {
    process.env = { ...env };
    server?.close();
  });

  it('registers a real Gitea OIDC auth source and it is readable afterwards', async () => {
    const authSources: any[] = [];
    const seen: Req[] = [];
    const s = await startServer((req, res) => {
      seen.push(req);
      if (req.method === 'GET' && req.url === '/api/v1/user/applications/oauth2') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(authSources));
      }
      if (req.method === 'POST' && req.url === '/api/v1/user/applications/oauth2') {
        const created = {
          id: authSources.length + 1,
          name: req.body.name,
          client_id: `client-${authSources.length + 1}`,
          client_secret: 'minted-by-gitea',
          redirect_uris: req.body.redirect_uris,
        };
        authSources.push(created);
        res.writeHead(201, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(created));
      }
      res.writeHead(404).end('{}');
    });
    server = s.server;

    process.env.GITEA_URL = s.url;
    process.env.GITEA_ADMIN_TOKEN = 'tok-live';
    process.env.OIDC_GITEA_CLIENT_ID = 'gitea';
    process.env.OIDC_GITEA_CLIENT_SECRET = 'secret-live';
    process.env.OIDC_ISSUER = 'https://api.voidcloud.cc.cd';

    const svc = new OidcBootstrapService();
    const first = await svc.registerGitea();
    expect(first.status).toBe('success');
    expect(JSON.stringify(first.details)).not.toContain('minted-by-gitea');

    // The server really holds a registration now.
    const readBack = await fetch(`${s.url}/api/v1/user/applications/oauth2`).then((r) => r.json());
    expect(readBack).toHaveLength(1);
    expect(readBack[0]).toMatchObject({
      name: 'VoidCloud SSO',
      redirect_uris: ['https://api.voidcloud.cc.cd/oidc/callback/gitea'],
    });

    // Second run must be idempotent against the now-populated server.
    const second = await svc.bootstrapGitea();
    expect(second.status).toBe('skipped');
    expect(authSources).toHaveLength(1);

    // Record the exact wire path used, so drift from the k8s Job is visible.
    expect(seen.filter((r) => r.method === 'POST').map((r) => r.url)).toEqual([
      '/api/v1/user/applications/oauth2',
    ]);
  });

  it('writes real Portainer OAuth settings that persist on the server', async () => {
    let settings: any = { OAuthSettings: {} };
    const s = await startServer((req, res) => {
      if (req.method === 'GET' && req.url === '/api/settings') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(settings));
      }
      if (req.method === 'PUT' && req.url === '/api/settings') {
        settings = { ...settings, ...req.body };
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(settings));
      }
      res.writeHead(404).end('{}');
    });
    server = s.server;

    process.env.PORTAINER_URL = s.url;
    process.env.PORTAINER_ADMIN_TOKEN = 'ptok';
    process.env.OIDC_PORTAINER_CLIENT_ID = 'portainer';
    process.env.OIDC_PORTAINER_CLIENT_SECRET = 'psecret';
    process.env.OIDC_ISSUER = 'https://api.voidcloud.cc.cd';

    const svc = new OidcBootstrapService();
    const result = await svc.bootstrapPortainer();
    expect(result.status).toBe('success');

    const readBack = await fetch(`${s.url}/api/settings`).then((r) => r.json());
    expect(JSON.stringify(readBack)).toContain('portainer');
    expect(JSON.stringify(readBack)).toContain('https://api.voidcloud.cc.cd');
  });
});
