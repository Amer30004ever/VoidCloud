import { Injectable, Logger } from '@nestjs/common';

interface BootstrapResult {
  status: 'success' | 'skipped' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class OidcBootstrapService {
  private readonly logger = new Logger(OidcBootstrapService.name);

  /**
   * Registers Void Cloud as an OAuth2 application inside Gitea.
   *
   * Real Gitea (verified against 1.25.x) exposes NO REST API for login
   * (auth) sources — `/api/v1/admin/auths` returns 404. The only supported
   * API surface is `/api/v1/user/applications/oauth2`, which registers an
   * OAuth2 client so users can sign in to Void Cloud with their Gitea
   * account. The reverse direction (Gitea consuming Void Cloud as an OIDC
   * provider) is CLI-only; the command is returned in `details.cliCommand`
   * so an operator can run it inside the Gitea pod.
   */
  async bootstrapGitea(): Promise<BootstrapResult> {
    const giteaUrl = process.env.GITEA_URL?.replace(/\/+$/, '');
    const giteaAdminToken = process.env.GITEA_ADMIN_TOKEN;
    const clientId = process.env.OIDC_GITEA_CLIENT_ID;
    const clientSecret = process.env.OIDC_GITEA_CLIENT_SECRET;

    if (!giteaUrl || !giteaAdminToken) {
      return { status: 'skipped', message: 'Gitea URL or admin token not configured' };
    }
    if (!clientId || !clientSecret) {
      return { status: 'skipped', message: 'OIDC_GITEA_CLIENT_ID or OIDC_GITEA_CLIENT_SECRET not configured' };
    }

    const issuer = (process.env.OIDC_ISSUER || 'https://api.voidcloud.cc.cd').replace(/\/+$/, '');
    const redirectUri = `${issuer}/oidc/callback/gitea`;
    const appName = 'VoidCloud SSO';
    const headers = {
      Authorization: `token ${giteaAdminToken}`,
      'Content-Type': 'application/json',
    };
    const cliCommand =
      `gitea admin auth add-oauth --name "${appName}" --provider openidConnect ` +
      `--key "${clientId}" --secret "<OIDC_GITEA_CLIENT_SECRET>" ` +
      `--auto-discover-url "${issuer}/oidc/.well-known/openid-configuration" --scopes "openid profile email"`;

    try {
      const listResponse = await fetch(`${giteaUrl}/api/v1/user/applications/oauth2`, {
        method: 'GET',
        headers,
      });

      if (listResponse.status === 401 || listResponse.status === 403) {
        return {
          status: 'error',
          message: `Gitea OIDC setup failed: admin token rejected (${listResponse.status})`,
        };
      }

      if (listResponse.ok) {
        const apps = (await listResponse.json()) as Array<{ id: number; name: string }>;
        const existing = Array.isArray(apps) ? apps.find((app) => app.name === appName) : undefined;
        if (existing) {
          this.logger.log('Gitea OAuth2 application already registered, skipping');
          return {
            status: 'skipped',
            message: 'Gitea OIDC already configured',
            details: { applicationId: existing.id, cliCommand },
          };
        }
      }

      const response = await fetch(`${giteaUrl}/api/v1/user/applications/oauth2`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: appName,
          redirect_uris: [redirectUri],
          confidential_client: true,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return { status: 'error', message: `Gitea OIDC setup failed: ${response.status} ${text}` };
      }

      const data = (await response.json()) as Record<string, unknown>;
      // Gitea mints the client secret; never echo it back through result logs.
      const { client_secret: mintedSecret, ...safe } = data;
      this.logger.log('Gitea OIDC bootstrap completed');
      return {
        status: 'success',
        message: 'Gitea OIDC configured successfully',
        details: { ...safe, clientSecretIssued: Boolean(mintedSecret), redirectUri, cliCommand },
      };
    } catch (err) {
      this.logger.error(`Gitea OIDC bootstrap error: ${err}`);
      return { status: 'error', message: `Gitea OIDC bootstrap error: ${err}` };
    }
  }

  /** Alias kept for callers that speak in registration terms. */
  registerGitea(): Promise<BootstrapResult> {
    return this.bootstrapGitea();
  }


  async bootstrapPortainer(): Promise<BootstrapResult> {
    const portainerUrl = process.env.PORTAINER_URL;
    const portainerAdminToken = process.env.PORTAINER_ADMIN_TOKEN;
    const clientId = process.env.OIDC_PORTAINER_CLIENT_ID;
    const clientSecret = process.env.OIDC_PORTAINER_CLIENT_SECRET;

    if (!portainerUrl || !portainerAdminToken) {
      return { status: 'skipped', message: 'Portainer URL or admin token not configured' };
    }
    if (!clientId || !clientSecret) {
      return { status: 'skipped', message: 'OIDC_PORTAINER_CLIENT_ID or OIDC_PORTAINER_CLIENT_SECRET not configured' };
    }

    try {
      const issuer = process.env.OIDC_ISSUER || 'https://api.voidcloud.cc.cd';

      const response = await fetch(`${portainerUrl}/api/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${portainerAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          OAuthSettings: {
            ClientID: clientId,
            ClientSecret: clientSecret,
            AuthorizationURI: `${issuer}/oidc/auth`,
            TokenURI: `${issuer}/oidc/token`,
            UserInfoURI: `${issuer}/oidc/userinfo`,
            RedirectURI: `${issuer}/oidc/callback/portainer`,
            Scopes: 'openid,profile,email',
            UserIdentifier: 'preferred_username',
            OAuthAutoCreateUsers: true,
            DefaultTeamID: 0,
            SSO: false,
            LogoutURI: '',
            AuthStyle: 0,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return { status: 'error', message: `Portainer OIDC setup failed: ${response.status} ${text}` };
      }

      this.logger.log('Portainer OIDC bootstrap completed');
      return { status: 'success', message: 'Portainer OIDC configured successfully' };
    } catch (err) {
      this.logger.error(`Portainer OIDC bootstrap error: ${err}`);
      return { status: 'error', message: `Portainer OIDC bootstrap error: ${err}` };
    }
  }
}
