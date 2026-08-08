import { Injectable, Logger } from '@nestjs/common';
import { Provider } from 'oidc-provider';
import { PrismaService } from '../prisma/prisma.service';

interface OidcClientConfig {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
}

@Injectable()
export class OidcProviderService {
  private readonly logger = new Logger(OidcProviderService.name);
  private provider: Provider | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Absolute base URL the interaction (login/consent) pages are served from. */
  private interactionBase(): string {
    return (
      process.env.OIDC_INTERACTION_BASE_URL ||
      process.env.OIDC_ISSUER ||
      'https://api.voidcloud.cc.cd'
    ).replace(/\/$/, '');
  }


  async initialize() {
    if (this.provider) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }
    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  private async doInitialize() {
    try {
      const { publicKey, privateKey } = await crypto.subtle.generateKey(
        { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        true,
        ['sign', 'verify'],
      );

      const publicJwk = await crypto.subtle.exportKey('jwk', publicKey);
      const privateJwk = await crypto.subtle.exportKey('jwk', privateKey);

      const issuer = process.env.OIDC_ISSUER || 'https://api.voidcloud.cc.cd';

      const clients: OidcClientConfig[] = [];

      if (process.env.OIDC_GITEA_CLIENT_ID) {
        clients.push({
          client_id: process.env.OIDC_GITEA_CLIENT_ID,
          client_secret: process.env.OIDC_GITEA_CLIENT_SECRET || '',
          redirect_uris: [
            process.env.OIDC_GITEA_REDIRECT_URI || 'http://gitea.voidcloud.svc.cluster.local:3000/user/settings/connections',
          ],
          grant_types: ['authorization_code'],
          response_types: ['code'],
        });
      }

      if (process.env.OIDC_PORTAINER_CLIENT_ID) {
        clients.push({
          client_id: process.env.OIDC_PORTAINER_CLIENT_ID,
          client_secret: process.env.OIDC_PORTAINER_CLIENT_SECRET || '',
          redirect_uris: [
            process.env.OIDC_PORTAINER_REDIRECT_URI || 'http://portainer.voidcloud.svc.cluster.local:9000/api/oauth/callback',
          ],
          grant_types: ['authorization_code'],
          response_types: ['code'],
        });
      }

      const prisma = this.prisma;
      const interactionBase = this.interactionBase();

      this.provider = new Provider(issuer, {
        clients,
        scopes: ['openid', 'profile', 'email'],
        claims: {
          openid: ['sub'],
          profile: ['name', 'preferred_username'],
          email: ['email', 'email_verified'],
        },
        /**
         * Login/consent screens are served by OidcInteractionController, which
         * lives outside the `/oidc` provider mount so the provider middleware
         * does not swallow the request.
         */
        interactions: {
          url(_ctx: any, interaction: any) {
            return `${interactionBase}/auth/oidc/interaction/${interaction.uid}`;
          },
        },
        /**
         * Resolve the platform user behind an authenticated session and expose
         * the standard OIDC claims Gitea/Portainer map onto their accounts.
         */
        async findAccount(_ctx: any, sub: string) {
          const user = await prisma.user.findUnique({
            where: { id: sub },
            select: { id: true, email: true, name: true, isActive: true, role: true },
          });
          if (!user || !user.isActive) return undefined;
          return {
            accountId: user.id,
            async claims() {
              return {
                sub: user.id,
                name: user.name,
                preferred_username: user.email,
                email: user.email,
                email_verified: true,
                groups: [user.role],
              };
            },
          };
        },
        features: {
          // Must stay off: the built-in dev interaction screens otherwise
          // override our interactions.url and swallow the login/consent flow.
          devInteractions: { enabled: false },
          registration: { enabled: false },
          revocation: { enabled: false },
          backchannelLogout: { enabled: false },
          deviceFlow: { enabled: false },
        },

        ttl: {
          AccessToken: 3600,
          RefreshToken: 86400,
          AuthorizationCode: 600,
          IdToken: 3600,
        },
        cookies: {
          keys: [process.env.OIDC_COOKIE_KEY || 'insecure-fallback-change-me'],
        },
        jwks: {
          keys: [
            {
              kty: publicJwk.kty,
              use: 'sig',
              alg: 'RS256',
              kid: 'voidcloud-oidc-key-1',
              n: publicJwk.n,
              e: publicJwk.e,
              d: privateJwk.d,
              p: privateJwk.p,
              q: privateJwk.q,
              dp: privateJwk.dp,
              dq: privateJwk.dq,
              qi: privateJwk.qi,
            },
          ],
        },
      });

      this.provider.on('server_error', (err: any) => {
        this.logger.error(`OIDC server error: ${err.message}`);
      });

      this.provider.on('authorization.error', (err: any) => {
        this.logger.warn(`OIDC auth error: ${err.message}`);
      });

      this.logger.log(`OIDC provider initialized at ${issuer}`);
    } catch (err) {
      this.logger.error(`Failed to initialize OIDC provider: ${err}`);
    }
  }

  getProvider(): Provider | null {
    return this.provider;
  }

  async getCallback() {
    if (!this.provider && !this.initPromise) {
      this.initPromise = this.doInitialize();
    }
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.provider) return null;
    return this.provider.callback();
  }
}
