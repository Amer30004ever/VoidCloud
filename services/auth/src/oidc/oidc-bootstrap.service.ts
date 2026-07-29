import { Injectable, Logger } from '@nestjs/common';

interface BootstrapResult {
  status: 'success' | 'skipped' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class OidcBootstrapService {
  private readonly logger = new Logger(OidcBootstrapService.name);

  async bootstrapGitea(): Promise<BootstrapResult> {
    const giteaUrl = process.env.GITEA_URL;
    const giteaAdminToken = process.env.GITEA_ADMIN_TOKEN;
    const clientId = process.env.OIDC_GITEA_CLIENT_ID;
    const clientSecret = process.env.OIDC_GITEA_CLIENT_SECRET;

    if (!giteaUrl || !giteaAdminToken) {
      return { status: 'skipped', message: 'Gitea URL or admin token not configured' };
    }
    if (!clientId || !clientSecret) {
      return { status: 'skipped', message: 'OIDC_GITEA_CLIENT_ID or OIDC_GITEA_CLIENT_SECRET not configured' };
    }

    try {
      const listResponse = await fetch(`${giteaUrl}/api/v1/admin/auths`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${giteaAdminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (listResponse.ok) {
        const authSources = await listResponse.json();
        const existingOidc = authSources.find((source: any) => 
          source.provider === 'oauth2_generic' && 
          source.name === 'VoidCloud SSO'
        );
        if (existingOidc) {
          this.logger.log('Gitea OIDC already configured, skipping');
          return { status: 'skipped', message: 'Gitea OIDC already configured', details: { authSourceId: existingOidc.id } };
        }
      }

      const issuer = process.env.OIDC_ISSUER || 'https://api.voidcloud.cc.cd';
      const redirectUri = `${issuer}/oidc/callback/gitea`;

      const response = await fetch(`${giteaUrl}/api/v1/admin/auths/oauth2/gitea`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${giteaAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'VoidCloud SSO',
          provider: 'oauth2_generic',
          clientId,
          clientSecret,
          openidConnectAutoDiscoveryUrl: `${issuer}/oidc/.well-known/openid-configuration`,
          redirectUri,
          scopes: ['openid', 'profile', 'email'],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return { status: 'error', message: `Gitea OIDC setup failed: ${response.status} ${text}` };
      }

      const data = await response.json();
      this.logger.log('Gitea OIDC bootstrap completed');
      return { status: 'success', message: 'Gitea OIDC configured successfully', details: data };
    } catch (err) {
      this.logger.error(`Gitea OIDC bootstrap error: ${err}`);
      return { status: 'error', message: `Gitea OIDC bootstrap error: ${err}` };
    }
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
