import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { OidcProviderService } from './oidc-provider.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Login + consent screens for the embedded OIDC provider.
 *
 * The `oidc-provider` middleware is mounted at `/oidc` in `main.ts`. Interaction
 * routes deliberately live *outside* that mount (`/auth/oidc/interaction/...`)
 * so Nest — not the provider middleware — handles them. `oidc-provider` sends
 * users here via the `interactions.url` config, and we hand control back with
 * `interactionFinished`, which issues the authorization code that Gitea and
 * Portainer exchange on their own callback endpoints.
 */
/**
 * Every route here runs *before* the user has a platform session — the caller
 * is authenticated by the signed `_interaction` cookie that `oidc-provider`
 * issued for this specific `uid`, and `interactionDetails()` rejects anything
 * else. They are therefore intentionally @Public().
 */
@Public()
@Controller('auth/oidc/interaction')
export class OidcInteractionController {
  private readonly logger = new Logger(OidcInteractionController.name);

  constructor(
    private readonly oidc: OidcProviderService,
    private readonly prisma: PrismaService,
  ) {}

  private provider() {
    const provider = this.oidc.getProvider();
    if (!provider) {
      throw new BadRequestException('OIDC provider is not configured');
    }
    return provider as any;
  }

  /** Render the login (or consent) screen for an in-flight authorization. */
  @Get(':uid')
  async show(@Param('uid') uid: string, @Req() req: any, @Res() res: any) {
    const provider = this.provider();
    let details: any;
    try {
      details = await provider.interactionDetails(req, res);
    } catch {
      return res.status(400).send(errorPage('This login request expired. Please start again.'));
    }

    const clientId = details.params?.client_id ?? 'application';
    if (details.prompt?.name === 'consent') {
      return res.type('html').send(consentPage(uid, clientId, details.params?.scope ?? ''));
    }
    return res.type('html').send(loginPage(uid, clientId));
  }

  /** Verify platform credentials and complete the `login` prompt. */
  @Post(':uid/login')
  async login(
    @Param('uid') uid: string,
    @Body() body: { email?: string; password?: string },
    @Req() req: any,
    @Res() res: any,
  ) {
    const provider = this.provider();
    try {
      await provider.interactionDetails(req, res);
    } catch {
      return res.status(400).send(errorPage('This login request expired. Please start again.'));
    }

    const email = (body?.email ?? '').trim().toLowerCase();
    const password = body?.password ?? '';
    const user = email
      ? await this.prisma.user.findUnique({
          where: { email },
          select: { id: true, password: true, isActive: true },
        })
      : null;

    const ok = !!user && user.isActive && (await bcrypt.compare(password, user.password));
    if (!ok) {
      this.logger.warn(`OIDC interaction ${uid}: failed login attempt`);
      return res
        .status(401)
        .type('html')
        .send(loginPage(uid, 'application', 'Invalid email or password.'));
    }

    return provider.interactionFinished(
      req,
      res,
      { login: { accountId: user!.id, remember: false } },
      { mergeWithLastSubmission: false },
    );
  }

  /** Grant the requested scopes and finish the `consent` prompt. */
  @Post(':uid/confirm')
  async confirm(@Param('uid') uid: string, @Req() req: any, @Res() res: any) {
    const provider = this.provider();
    let details: any;
    try {
      details = await provider.interactionDetails(req, res);
    } catch {
      return res.status(400).send(errorPage('This login request expired. Please start again.'));
    }

    const { prompt, params, session } = details;
    let grant: any;
    if (details.grantId) {
      grant = await provider.Grant.find(details.grantId);
    } else {
      grant = new provider.Grant({ accountId: session?.accountId, clientId: params.client_id });
    }

    if (prompt?.details?.missingOIDCScope) {
      grant.addOIDCScope((prompt.details.missingOIDCScope as string[]).join(' '));
    }
    if (prompt?.details?.missingOIDCClaims) {
      grant.addOIDCClaims(prompt.details.missingOIDCClaims as string[]);
    }
    if (prompt?.details?.missingResourceScopes) {
      for (const [indicator, scopes] of Object.entries(
        prompt.details.missingResourceScopes as Record<string, string[]>,
      )) {
        grant.addResourceScope(indicator, scopes.join(' '));
      }
    }

    const grantId = await grant.save();
    this.logger.log(`OIDC interaction ${uid}: consent granted for ${params.client_id}`);
    return provider.interactionFinished(
      req,
      res,
      { consent: { grantId } },
      { mergeWithLastSubmission: true },
    );
  }

  /** Abort the authorization; the client receives `access_denied`. */
  @Post(':uid/abort')
  async abort(@Param('uid') _uid: string, @Req() req: any, @Res() res: any) {
    const provider = this.provider();
    return provider.interactionFinished(
      req,
      res,
      {
        error: 'access_denied',
        error_description: 'End-user aborted the interaction',
      },
      { mergeWithLastSubmission: false },
    );
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

const SHELL = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} · Void Cloud</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#070b16;color:#e6edf7;font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.card{width:100%;max-width:380px;padding:32px;border-radius:16px;background:#0d1425;
border:1px solid #1e2a44;box-shadow:0 24px 60px rgba(0,0,0,.45)}
h1{margin:0 0 6px;font-size:20px;font-weight:600}
p.sub{margin:0 0 22px;color:#8ea0bf;font-size:13px}
label{display:block;margin:0 0 6px;font-size:12px;color:#8ea0bf}
input{width:100%;box-sizing:border-box;margin-bottom:16px;padding:10px 12px;border-radius:9px;
border:1px solid #24314e;background:#0a1122;color:#e6edf7;font-size:14px}
input:focus{outline:2px solid #3b82f6;outline-offset:1px}
button{width:100%;padding:11px;border:0;border-radius:9px;background:#2563eb;color:#fff;
font-size:14px;font-weight:600;cursor:pointer}
button:hover{background:#1d4ed8}
button.ghost{margin-top:10px;background:transparent;border:1px solid #24314e;color:#8ea0bf}
.err{margin:0 0 16px;padding:10px 12px;border-radius:9px;background:#3b1218;
border:1px solid #7f1d1d;color:#fca5a5;font-size:13px}
.scopes{margin:0 0 20px;padding:12px;border-radius:9px;background:#0a1122;
border:1px solid #24314e;font-size:13px;color:#c3d0e6}
</style></head><body><div class="card">${body}</div></body></html>`;

function loginPage(uid: string, clientId: string, error?: string): string {
  return SHELL(
    'Sign in',
    `<h1>Sign in</h1>
     <p class="sub">Continue to <strong>${escapeHtml(clientId)}</strong></p>
     ${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}
     <form method="post" action="/auth/oidc/interaction/${encodeURIComponent(uid)}/login">
       <label for="email">Email</label>
       <input id="email" name="email" type="email" autocomplete="username" required />
       <label for="password">Password</label>
       <input id="password" name="password" type="password" autocomplete="current-password" required />
       <button type="submit">Continue</button>
     </form>`,
  );
}

function consentPage(uid: string, clientId: string, scope: string): string {
  const items = scope
    .split(' ')
    .filter(Boolean)
    .map((s) => `<div>· ${escapeHtml(s)}</div>`)
    .join('');
  return SHELL(
    'Authorize',
    `<h1>Authorize access</h1>
     <p class="sub"><strong>${escapeHtml(clientId)}</strong> is requesting access to your Void Cloud account.</p>
     <div class="scopes">${items || 'Basic profile access'}</div>
     <form method="post" action="/auth/oidc/interaction/${encodeURIComponent(uid)}/confirm">
       <button type="submit">Allow</button>
     </form>
     <form method="post" action="/auth/oidc/interaction/${encodeURIComponent(uid)}/abort">
       <button class="ghost" type="submit">Cancel</button>
     </form>`,
  );
}

function errorPage(message: string): string {
  return SHELL('Error', `<h1>Something went wrong</h1><p class="sub">${escapeHtml(message)}</p>`);
}
