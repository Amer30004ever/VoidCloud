/**
 * OIDC authorization-code ROUND TRIP verification.
 *
 * Runs the real OidcProviderService on a local HTTP server, plays the part of
 * the Gitea and Portainer clients, resolves the interaction exactly the way
 * OidcInteractionController does (login + consent grant), exchanges the code
 * at /token and inspects the resulting id_token / userinfo claims.
 *
 * This lives outside Jest because `oidc-provider` v9 is ESM-only and the unit
 * suite runs in CommonJS. Run it with:
 *
 *   pnpm verify:oidc          (node --import tsx scripts/verify-oidc-roundtrip.ts)
 *
 * Everything VoidCloud owns is real here; only the Gitea/Portainer HTTP
 * endpoints are simulated, so the remaining cluster-only unknown is whether
 * those products are configured with the same client id/secret/redirect URI
 * that `oidc-bootstrap` writes.
 */
import assert from 'node:assert/strict';
import { createServer, Server } from 'node:http';

const USER = {
  id: 'user-1',
  email: 'admin@voidcloud.com',
  name: 'Super Admin',
  isActive: true,
  role: 'SUPER_ADMIN',
};

const prisma: any = {
  user: {
    findUnique: async ({ where }: any) => (where.id === USER.id ? USER : null),
  },
};

const checks: Array<{ name: string; ok: boolean; err?: string }> = [];
async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (e: any) {
    checks.push({ name, ok: false, err: String(e?.message ?? e) });
    console.error(`  FAIL  ${name}\n        ${String(e?.message ?? e).split('\n')[0]}`);
  }
}

/** Minimal cookie jar so the provider session survives the redirect chain. */
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

const decode = (jwt: string) =>
  JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));

async function main() {
  // Reserve a port: issuer, redirect URIs and the interaction base URL must
  // all agree on the same origin.
  const probe = createServer();
  await new Promise<void>((r) => probe.listen(0, '127.0.0.1', () => r()));
  const port = (probe.address() as any).port;
  await new Promise<void>((r) => probe.close(() => r()));
  const origin = `http://127.0.0.1:${port}`;

  process.env.OIDC_ISSUER = origin;
  process.env.OIDC_INTERACTION_BASE_URL = origin;
  process.env.OIDC_COOKIE_KEY = 'verify-cookie-key';
  process.env.OIDC_GITEA_CLIENT_ID = 'gitea';
  process.env.OIDC_GITEA_CLIENT_SECRET = 'gitea-secret';
  process.env.OIDC_GITEA_REDIRECT_URI = `${origin}/gitea/user/oauth2/voidcloud/callback`;
  process.env.OIDC_PORTAINER_CLIENT_ID = 'portainer';
  process.env.OIDC_PORTAINER_CLIENT_SECRET = 'portainer-secret';
  process.env.OIDC_PORTAINER_REDIRECT_URI = `${origin}/portainer/api/oauth/callback`;

  const { OidcProviderService } = await import(
    '../services/auth/src/oidc/oidc-provider.service'
  );
  const service = new OidcProviderService(prisma);
  const callback = await service.getCallback();
  const provider: any = service.getProvider();
  assert.ok(provider, 'OIDC provider failed to initialize');

  const server: Server = createServer(async (req, res) => {
    const url = req.url ?? '/';
    if (/^\/auth\/oidc\/interaction\/[^/?]+/.test(url)) {
      // Stand-in for OidcInteractionController: approve login + consent.
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
    if (url.startsWith('/gitea/') || url.startsWith('/portainer/')) {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('landed');
      return;
    }
    callback!(req, res);
  });
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', () => r()));
  console.log(`OIDC round trip against ${origin}\n`);

  await check('discovery document is published', async () => {
    const doc: any = await (await fetch(`${origin}/.well-known/openid-configuration`)).json();
    assert.equal(doc.issuer, origin);
    assert.equal(doc.authorization_endpoint, `${origin}/auth`);
    assert.equal(doc.token_endpoint, `${origin}/token`);
    assert.ok(doc.response_types_supported.includes('code'));
    for (const s of ['openid', 'email', 'profile'])
      assert.ok(doc.scopes_supported.includes(s), `scope ${s} missing`);
  });

  await check('jwks exposes a public RS256 key and no private material', async () => {
    const jwks: any = await (await fetch(`${origin}/jwks`)).json();
    assert.equal(jwks.keys.length, 1);
    assert.equal(jwks.keys[0].alg, 'RS256');
    assert.equal(jwks.keys[0].d, undefined);
  });

  const roundTrip = async (client: string, secret: string, redirectUri: string) => {
    const jar = new Jar();
    const state = `state-${client}`;
    let url =
      `${origin}/auth?client_id=${client}&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('openid email profile')}&state=${state}`;
    let sawInteraction = false;
    let code: string | null = null;

    for (let hop = 0; hop < 10 && !code; hop++) {
      const res = await fetch(url, {
        redirect: 'manual',
        headers: jar.header() ? { cookie: jar.header() } : {},
      });
      jar.capture(res);
      const location = res.headers.get('location');
      if (!location) {
        assert.fail(`no redirect at hop ${hop}: ${res.status} ${(await res.text()).slice(0, 200)}`);
      }
      const next = new URL(location, origin);
      if (next.pathname.startsWith('/auth/oidc/interaction/')) sawInteraction = true;
      if (next.href.startsWith(redirectUri)) {
        assert.equal(next.searchParams.get('error'), null);
        assert.equal(next.searchParams.get('state'), state);
        code = next.searchParams.get('code');
        break;
      }
      url = next.href;
    }
    assert.ok(sawInteraction, 'authorization never went through the interaction screen');
    assert.ok(code, 'no authorization code returned');

    const tokenRes = await fetch(`${origin}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        authorization: 'Basic ' + Buffer.from(`${client}:${secret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: redirectUri,
      }).toString(),
    });
    assert.equal(tokenRes.status, 200, `token exchange failed: ${await tokenRes.text()}`);
    return tokenRes.json() as Promise<any>;
  };

  await check('Gitea client completes code exchange and receives claims', async () => {
    const tokens = await roundTrip('gitea', 'gitea-secret', process.env.OIDC_GITEA_REDIRECT_URI!);
    const claims = decode(tokens.id_token);
    assert.equal(claims.iss, origin);
    assert.equal(claims.aud, 'gitea');
    assert.equal(claims.sub, USER.id);

    const userinfo: any = await (
      await fetch(`${origin}/me`, {
        headers: { authorization: `Bearer ${tokens.access_token}` },
      })
    ).json();
    assert.equal(userinfo.email, USER.email);
    assert.equal(userinfo.preferred_username, USER.email);
    assert.equal(userinfo.name, USER.name);
  });

  await check('Portainer client completes code exchange', async () => {
    const tokens = await roundTrip(
      'portainer',
      'portainer-secret',
      process.env.OIDC_PORTAINER_REDIRECT_URI!,
    );
    assert.equal(decode(tokens.id_token).aud, 'portainer');
  });

  await check('unregistered redirect_uri is rejected', async () => {
    const res = await fetch(
      `${origin}/auth?client_id=gitea&response_type=code&scope=openid` +
        `&redirect_uri=${encodeURIComponent('https://attacker.example/callback')}`,
      { redirect: 'manual' },
    );
    assert.ok(res.status >= 400, `expected 4xx, got ${res.status}`);
    assert.match(await res.text(), /redirect_uri/i);
  });

  await check('wrong client secret is rejected at /token', async () => {
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
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'invalid_client');
  });

  await check('bogus bearer token cannot read userinfo', async () => {
    const res = await fetch(`${origin}/me`, {
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    assert.equal(res.status, 401);
  });

  await new Promise<void>((r) => server.close(() => r()));

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
