/**
 * OIDC login flow — interaction controller.
 *
 * Covers the pieces Gitea/Portainer depend on: the login prompt renders, bad
 * credentials never finish the interaction, good credentials finish it with the
 * platform account id, and consent creates a Grant carrying the requested
 * scopes/claims before handing control back to oidc-provider.
 */
import * as bcrypt from 'bcrypt';

// The controller only needs the provider *instance* (injected in tests), but it
// imports OidcProviderService, which pulls in the heavy oidc-provider package.
jest.mock('oidc-provider', () => ({ Provider: class {} }), { virtual: true });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  OidcInteractionController,
} = require('../../services/auth/src/oidc/oidc-interaction.controller');


type Res = {
  statusCode: number;
  body: string;
  status: (c: number) => Res;
  type: (t: string) => Res;
  send: (b: string) => Res;
};

function res(): Res {
  const r: any = { statusCode: 200, body: '' };
  r.status = (c: number) => ((r.statusCode = c), r);
  r.type = () => r;
  r.send = (b: string) => ((r.body = b), r);
  return r as Res;
}

function makeProvider(details: any) {
  const saved: any[] = [];
  class Grant {
    accountId: string;
    clientId: string;
    scopes: string[] = [];
    claims: string[] = [];
    constructor(props: any) {
      this.accountId = props.accountId;
      this.clientId = props.clientId;
      saved.push(this);
    }
    addOIDCScope(s: string) {
      this.scopes.push(...s.split(' '));
    }
    addOIDCClaims(c: string[]) {
      this.claims.push(...c);
    }
    addResourceScope() {}
    async save() {
      return 'grant-1';
    }
  }
  return {
    saved,
    interactionDetails: jest.fn().mockResolvedValue(details),
    interactionFinished: jest.fn().mockResolvedValue(undefined),
    Grant,
  };
}

function makeController(provider: any, user: any) {
  const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
  const oidc = { getProvider: () => provider };
  return {
    controller: new OidcInteractionController(oidc as any, prisma as any),
    prisma,
  };
}

describe('OidcInteractionController — login prompt', () => {
  const details = { prompt: { name: 'login' }, params: { client_id: 'gitea' }, uid: 'u1' };

  it('renders a login form naming the requesting client', async () => {
    const provider = makeProvider(details);
    const { controller } = makeController(provider, null);
    const r = res();
    await controller.show('u1', {} as any, r as any);
    expect(r.body).toContain('Sign in');
    expect(r.body).toContain('gitea');
    expect(r.body).toContain('/auth/oidc/interaction/u1/login');
  });

  it('shows an expiry message when the interaction is gone', async () => {
    const provider = makeProvider(details);
    provider.interactionDetails.mockRejectedValue(new Error('expired'));
    const { controller } = makeController(provider, null);
    const r = res();
    await controller.show('u1', {} as any, r as any);
    expect(r.statusCode).toBe(400);
    expect(r.body).toContain('expired');
  });
});

describe('OidcInteractionController — credential verification', () => {
  const details = { prompt: { name: 'login' }, params: { client_id: 'gitea' }, uid: 'u1' };

  it('rejects an unknown email without finishing the interaction', async () => {
    const provider = makeProvider(details);
    const { controller } = makeController(provider, null);
    const r = res();
    await controller.login('u1', { email: 'nobody@x.io', password: 'p' }, {} as any, r as any);
    expect(r.statusCode).toBe(401);
    expect(provider.interactionFinished).not.toHaveBeenCalled();
  });

  it('rejects a wrong password', async () => {
    const provider = makeProvider(details);
    const { controller } = makeController(provider, {
      id: 'user-1',
      isActive: true,
      password: await bcrypt.hash('correct', 4),
    });
    const r = res();
    await controller.login('u1', { email: 'a@b.io', password: 'wrong' }, {} as any, r as any);
    expect(r.statusCode).toBe(401);
    expect(provider.interactionFinished).not.toHaveBeenCalled();
  });

  it('rejects a deactivated account even with the right password', async () => {
    const provider = makeProvider(details);
    const { controller } = makeController(provider, {
      id: 'user-1',
      isActive: false,
      password: await bcrypt.hash('correct', 4),
    });
    const r = res();
    await controller.login('u1', { email: 'a@b.io', password: 'correct' }, {} as any, r as any);
    expect(r.statusCode).toBe(401);
    expect(provider.interactionFinished).not.toHaveBeenCalled();
  });

  it('finishes the interaction with the platform account id on success', async () => {
    const provider = makeProvider(details);
    const { controller, prisma } = makeController(provider, {
      id: 'user-1',
      isActive: true,
      password: await bcrypt.hash('correct', 4),
    });
    await controller.login(
      'u1',
      { email: '  A@B.io ', password: 'correct' },
      {} as any,
      res() as any,
    );
    // email is normalized before lookup
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'a@b.io' } }),
    );
    expect(provider.interactionFinished).toHaveBeenCalledWith(
      {},
      expect.anything(),
      { login: { accountId: 'user-1', remember: false } },
      { mergeWithLastSubmission: false },
    );
  });
});

describe('OidcInteractionController — consent', () => {
  it('grants the missing scopes and claims, then finishes with the grantId', async () => {
    const provider = makeProvider({
      prompt: {
        name: 'consent',
        details: {
          missingOIDCScope: ['openid', 'profile', 'email'],
          missingOIDCClaims: ['email_verified'],
        },
      },
      params: { client_id: 'portainer', scope: 'openid profile email' },
      session: { accountId: 'user-1' },
      uid: 'u2',
    });
    const { controller } = makeController(provider, null);
    await controller.confirm('u2', {} as any, res() as any);

    const grant = provider.saved[0];
    expect(grant.accountId).toBe('user-1');
    expect(grant.clientId).toBe('portainer');
    expect(grant.scopes).toEqual(['openid', 'profile', 'email']);
    expect(grant.claims).toEqual(['email_verified']);
    expect(provider.interactionFinished).toHaveBeenCalledWith(
      {},
      expect.anything(),
      { consent: { grantId: 'grant-1' } },
      { mergeWithLastSubmission: true },
    );
  });

  it('renders the consent screen listing requested scopes', async () => {
    const provider = makeProvider({
      prompt: { name: 'consent', details: {} },
      params: { client_id: 'portainer', scope: 'openid email' },
      uid: 'u2',
    });
    const { controller } = makeController(provider, null);
    const r = res();
    await controller.show('u2', {} as any, r as any);
    expect(r.body).toContain('Authorize access');
    expect(r.body).toContain('openid');
    expect(r.body).toContain('/auth/oidc/interaction/u2/abort');
  });

  it('aborts with access_denied', async () => {
    const provider = makeProvider({ prompt: { name: 'consent' }, params: {}, uid: 'u2' });
    const { controller } = makeController(provider, null);
    await controller.abort('u2', {} as any, res() as any);
    expect(provider.interactionFinished).toHaveBeenCalledWith(
      {},
      expect.anything(),
      expect.objectContaining({ error: 'access_denied' }),
      { mergeWithLastSubmission: false },
    );
  });
});

describe('OidcInteractionController — output safety', () => {
  it('escapes client-controlled values in rendered HTML', async () => {
    const provider = makeProvider({
      prompt: { name: 'login' },
      params: { client_id: '<script>alert(1)</script>' },
      uid: 'u3',
    });
    const { controller } = makeController(provider, null);
    const r = res();
    await controller.show('u3', {} as any, r as any);
    expect(r.body).not.toContain('<script>alert(1)</script>');
    expect(r.body).toContain('&lt;script&gt;');
  });
});
