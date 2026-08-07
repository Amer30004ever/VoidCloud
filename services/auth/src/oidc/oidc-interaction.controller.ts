import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { OidcProviderService } from './oidc-provider.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * OIDC interaction controller.
 *
 * oidc-provider delegates every login/consent prompt to
 * `/auth/oidc/interaction/:uid` (see `interactions.url` in
 * OidcProviderService). This controller renders those screens against the
 * platform's own user table and hands control back to the provider through
 * `interactionFinished`, so Gitea/Portainer get a normal authorization code.
 *
 * Every route is `@Public()` — the caller is not yet authenticated; the
 * `_interaction` cookie issued by oidc-provider is what binds the request.
 */
@Public()
@ApiExcludeController()
@Controller('oidc/interaction')
export class OidcInteractionController {
  constructor(
    private readonly oidc: OidcProviderService,
    private readonly prisma: PrismaService,
  ) {}

  /** Render the login or consent screen for an interaction. */
  @Get(':uid')
  async show(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const provider: any = this.oidc.getProvider();
    if (!provider) return sendPage(res, 503, errorPage('OIDC provider is not available.'));

    let details: any;
    try {
      details = await provider.interactionDetails(req, res);
    } catch {
      return sendPage(res, 400, errorPage('This sign-in request has expired. Please start again.'));
    }

    const clientId = String(details?.params?.client_id ?? 'unknown client');
    const promptName = details?.prompt?.name;

    if (promptName === 'login') {
      return sendPage(res, 200, loginPage(uid, clientId));
    }
    const scope = String(details?.params?.scope ?? 'openid');
    return sendPage(res, 200, consentPage(uid, clientId, scope));
  }

  /** Verify platform credentials and finish the login prompt. */
  @Post(':uid/login')
  async login(
    @Param('uid') uid: string,
    @Body() body: { email?: string; password?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const provider: any = this.oidc.getProvider();
    if (!provider) return sendPage(res, 503, errorPage('OIDC provider is not available.'));

    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const user: any = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;

    const ok =
      !!user &&
      user.isActive !== false &&
      !!user.password &&
      (await bcrypt.compare(password, user.password).catch(() => false));

    if (!ok) {
      return sendPage(res, 401, loginPage(uid, '', 'Invalid email or password.'));
    }

    return provider.interactionFinished(
      req,
      res,
      { login: { accountId: user.id, remember: false } },
      { mergeWithLastSubmission: false },
    );
  }

  /** Grant the requested scopes/claims and finish the consent prompt. */
  @Post(':uid/confirm')
  async confirm(@Param('uid') _uid: string, @Req() req: Request, @Res() res: Response) {
    const provider: any = this.oidc.getProvider();
    if (!provider) return sendPage(res, 503, errorPage('OIDC provider is not available.'));

    let details: any;
    try {
      details = await provider.interactionDetails(req, res);
    } catch {
      return sendPage(res, 400, errorPage('This sign-in request has expired. Please start again.'));
    }

    const accountId = details?.session?.accountId;
    const clientId = details?.params?.client_id;
    const missing = details?.prompt?.details ?? {};

    const grant = new provider.Grant({ accountId, clientId });
    if (missing.missingOIDCScope) grant.addOIDCScope(missing.missingOIDCScope.join(' '));
    if (missing.missingOIDCClaims) grant.addOIDCClaims(missing.missingOIDCClaims);
    if (missing.missingResourceScopes) {
      for (const [indicator, scopes] of Object.entries(missing.missingResourceScopes)) {
        grant.addResourceScope(indicator, (scopes as string[]).join(' '));
      }
    }
    const grantId = await grant.save();

    return provider.interactionFinished(
      req,
      res,
      { consent: { grantId } },
      { mergeWithLastSubmission: true },
    );
  }

  /** User declined — end the interaction with an OIDC access_denied error. */
  @Post(':uid/abort')
  async abort(@Param('uid') _uid: string, @Req() req: Request, @Res() res: Response) {
    const provider: any = this.oidc.getProvider();
    if (!provider) return sendPage(res, 503, errorPage('OIDC provider is not available.'));

    return provider.interactionFinished(
      req,
      res,
      {
        error: 'access_denied',
        error_description: 'End-user aborted the interaction.',
      },
      { mergeWithLastSubmission: false },
    );
  }
}

/** HTML-escape every client-controlled value before rendering. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sendPage(res: any, status: number, html: string) {
  return res.status(status).type('html').send(html);
}

const SHELL = (title: string, inner: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)} — VoidCloud</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070b18;color:#e2e8f0;
font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.card{width:min(420px,92vw);padding:32px;border-radius:16px;background:#0e1526;
border:1px solid #1e293b;box-shadow:0 20px 60px rgba(0,0,0,.5)}
h1{font-size:20px;margin:0 0 6px}p{color:#94a3b8;font-size:14px;margin:0 0 20px}
label{display:block;font-size:13px;margin:14px 0 6px;color:#cbd5e1}
input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;
border:1px solid #253149;background:#0a1120;color:#e2e8f0}
button{margin-top:20px;width:100%;padding:11px;border:0;border-radius:8px;cursor:pointer;
background:#2563eb;color:#fff;font-weight:600}
button.secondary{background:transparent;border:1px solid #253149;color:#94a3b8;margin-top:10px}
.err{background:#3f1d1d;border:1px solid #7f1d1d;color:#fecaca;padding:10px 12px;
border-radius:8px;font-size:13px;margin-bottom:14px}
ul{margin:0 0 4px;padding-left:18px;color:#cbd5e1;font-size:14px}
</style></head><body><div class="card">${inner}</div></body></html>`;

function loginPage(uid: string, clientId: string, error?: string) {
  return SHELL(
    'Sign in',
    `<h1>Sign in</h1>
<p>${clientId ? `<strong>${esc(clientId)}</strong> is requesting access to your VoidCloud account.` : 'Continue to your VoidCloud account.'}</p>
${error ? `<div class="err">${esc(error)}</div>` : ''}
<form method="post" action="/auth/oidc/interaction/${esc(uid)}/login">
<label for="email">Email</label>
<input id="email" name="email" type="email" autocomplete="username" required/>
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required/>
<button type="submit">Sign in</button>
</form>`,
  );
}

function consentPage(uid: string, clientId: string, scope: string) {
  const scopes = scope.split(/\s+/).filter(Boolean);
  return SHELL(
    'Authorize access',
    `<h1>Authorize access</h1>
<p><strong>${esc(clientId)}</strong> wants to access your VoidCloud account.</p>
<ul>${scopes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
<form method="post" action="/auth/oidc/interaction/${esc(uid)}/confirm">
<button type="submit">Allow</button></form>
<form method="post" action="/auth/oidc/interaction/${esc(uid)}/abort">
<button type="submit" class="secondary">Cancel</button></form>`,
  );
}

function errorPage(message: string) {
  return SHELL('Sign-in error', `<h1>Sign-in error</h1><p>${esc(message)}</p>`);
}
