/**
 * OIDC authorization-code ROUND TRIP.
 *
 * Until now the provider config and the interaction screens were only
 * inspected statically — nothing proved that a downstream client (Gitea,
 * Portainer) can actually complete `/auth -> interaction -> code -> /token`
 * and receive an id_token carrying the claims those products map onto their
 * accounts.
 *
 * This spec mounts the real OidcProviderService on a local HTTP server, plays
 * the part of the Gitea client, resolves the interaction the same way
 * OidcInteractionController does (login + consent grant), and decodes the
 * resulting id_token. Only the Gitea/Portainer pods themselves are simulated;
 * every VoidCloud-side moving part is real.
 */
import { createServer, Server } from 'node:http';
import { OidcProviderService } from '../../services/auth/src/oidc/oidc-provider.service';

const USER = {
  id: 'user-1',
  email: 'admin@voidcloud.com',
  name: 'Super Admin',
  isActive: true,
  role: 'SUPER_ADMIN',
};

const prisma: any = {
  user: {
    findUnique: jest.fn(async ({ where }: any) =>
      where.id === USER.id ? USER : null,
    ),
  },
};

/** Tiny cookie jar so the session survives across the redirect chain. */
class Jar {
  private jar = new Map<string, string>();
  capture(res: Response) {
    for (const c of (res.headers as any).getSetCookie?.() ?? []) {
      const [pair] = String(c).split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx);
      const value = pair.slice(idx + 1);
      if (value === '') this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }
  header() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

describe('OIDC authorization-code round trip (Gitea/Portainer clients)', () => {
  let server: Server;
  let origin: string;
  let service: OidcProviderService;
  let provider: any;
  const savedEnv = { ...process.env };

  beforeAll(async () => {
    // Reserve a port first: issuer, client redirect URIs and the interaction
    // base URL all have to agree on the same origin.
    const probe = createServer();
    await new Promise<void>((r) => probe.listen(0, '127.0.0.1', r));
    const port = (probe.address() as any).port;
    await new Promise<void>((r) => probe.close(() => r()));
    origin = `http://127.0.0.1:${port}`;

    process.env.OIDC_ISSUER = origin;
    process.env.OIDC_INTERACTION_BASE_URL = origin;
    process.env.OIDC_COOKIE_KEY = 'test-cookie-key';
    process.env.OIDC_GITEA_CLIENT_ID = 'gitea';
    process.env.OIDC_GITEA_CLIENT_SECRET = 'gitea-secret';
    process.env.OIDC_GITEA_REDIRECT_URI = `${origin}/gitea/user/oauth2/voidcloud/callback`;
    process.env.OIDC_PORTAINER_CLIENT_ID = 'portainer';
    process.env.OIDC_PORTAINER_CLIENT_SECRET = 'portainer-secret';
    process.env.OIDC_PORTAINER_REDIRECT_URI = `${origin}/portainer/api/oauth/callback`;

    service = new OidcProviderService(prisma);
    const callback = await service.getCallback();
    provider = service.getProvider();
    expect(provider).not.toBeNull();

    server = createServer(async (req, res) => {
      const url = req.url ?? '/';
      // Stand in for OidcInteractionController: approve login + consent.
      const m = url.match(/^\/auth\/oidc\/interaction\/([^/?]+)/);
      if (m) {
        try {
          const details = await provider.interactionDetails(req, res);
          const grant = new provider.Grant({
            accountId: USER.id,
            clientId: details.params.client_id,
          });
          grant.addOIDCScope('openid email profile');
          const grantId = await grant.save();
          await provider.interactionFinished(
            req,
            res,
            { login: { accountId: USER.id }, consent: { grantId } },
            { mergeWithLastSubmission: false },
          );
        } catch (e: any) {
          res.writeHead(500).end(String(e?.message ?? e));
        }
        return;
      }
      // The simulated Gitea/Portainer callback endpoints.
      if (url.startsWith('/gitea/') || url.startsWith('/portainer/')) {
        res.writeHead(200, { 'Content-Type': 'text/plain' }).end('landed');
        return;
      }
      callback!(req, res);
    });
    await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));
  }, 30000);

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    process.env = savedEnv;
  });

  it('publishes a usable discovery document', async () => {
    const res = await fetch(`${origin}/.well-known/openid-configuration`);
    expect(res.status).toBe(200);
    const doc: any = await res.json();
    expect(doc.issuer).toBe(origin);
    expect(doc.authorization_endpoint).toBe(`${origin}/auth`);
    expect(doc.token_endpoint).toBe(`${origin}/token`);
    expect(doc.jwks_uri).toBe(`${origin}/jwks`);
    expect(doc.scopes_supported).toEqual(expect.arrayContaining(['openid', 'email', 'profile']));
    expect(doc.response_types_supported).toContain('code');
  });

  it('serves a signing key set the client can verify tokens with', async () => {
    const jwks: any = await (await fetch(`${origin}/jwks`)).json();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' });
    // Private material must never be published.
    expect(jwks.keys[0].d).toBeUndefined();
  });

  const roundTrip = async (client: string, secret: string, redirectUri: string) => {
    const jar = new Jar();
    const state = `state-${client}`;
    let url =
      `${origin}/auth?client_id=${client}&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('openid email profile')}&state=${state}`;

    let interactionSeen = false;
    let code: string | null = null;

    for (let hop = 0; hop < 10 && !code; hop++) {
      const res: any = await fetch(url, {
        redirect: 'manual',
        headers: jar.header() ? { cookie: jar.header() } : {},
      });
      jar.capture(res);
      const location = res.headers.get('location');
      if (!location) {
        expect(res.status).toBe(200);
        break;
      }
      const next = new URL(location, origin);
      if (next.pathname.startsWith('/auth/oidc/interaction/')) interactionSeen = true;
      if (next.href.startsWith(redirectUri)) {
        expect(next.searchParams.get('state')).toBe(state);
        expect(next.searchParams.get('error')).toBeNull();
        code = next.searchParams.get('code');
        break;
      }
      url = next.href;
    }

    expect(interactionSeen).toBe(true);
    expect(code).toBeTruthy();

    const tokenRes = await fetch(`${origin}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        authorization:
          'Basic ' + Buffer.from(`${client}:${secret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: redirectUri,
      }).toString(),
    });
    expect(tokenRes.status).toBe(200);
    return tokenRes.json() as Promise<any>;
  };

  const decode = (jwt: string) =>
    JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));

  it('completes the full code exchange for the Gitea client', async () => {
    const tokens = await roundTrip(
      'gitea',
      'gitea-secret',
      process.env.OIDC_GITEA_REDIRECT_URI!,
    );
    expect(tokens.token_type.toLowerCase()).toBe('bearer');
    expect(tokens.id_token).toBeTruthy();

    const claims = decode(tokens.id_token);
    expect(claims.iss).toBe(origin);
    expect(claims.aud).toBe('gitea');
    expect(claims.sub).toBe(USER.id);

    const userinfo: any = await (
      await fetch(`${origin}/me`, {
        headers: { authorization: `Bearer ${tokens.access_token}` },
      })
    ).json();
    expect(userinfo.email).toBe(USER.email);
    expect(userinfo.preferred_username).toBe(USER.email);
    expect(userinfo.name).toBe(USER.name);
  }, 30000);

  it('completes the full code exchange for the Portainer client', async () => {
    const tokens = await roundTrip(
      'portainer',
      'portainer-secret',
      process.env.OIDC_PORTAINER_REDIRECT_URI!,
    );
    expect(decode(tokens.id_token).aud).toBe('portainer');
  }, 30000);

  it('refuses an unregistered redirect_uri', async () => {
    const res = await fetch(
      `${origin}/auth?client_id=gitea&response_type=code&scope=openid` +
        `&redirect_uri=${encodeURIComponent('https://attacker.example/callback')}`,
      { redirect: 'manual' },
    );
    const body = await res.text();
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(body).toMatch(/redirect_uri/i);
  });

  it('refuses a token exchange with the wrong client secret', async () => {
    const res = await fetch(`${origin}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        authorization: 'Basic ' + Buffer.from('gitea:wrong').toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'whatever',
        redirect_uri: process.env.OIDC_GITEA_REDIRECT_URI!,
      }).toString(),
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('invalid_client');
  });

  it('denies a deactivated account at the interaction step', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...USER, isActive: false });
    const res = await fetch(`${origin}/me`, {
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(res.status).toBe(401);
  });
});
