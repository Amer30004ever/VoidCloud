/**
 * Manual end-to-end driver for OidcBootstrapService.
 *
 * Requires REAL, reachable services (no mocks):
 *   GITEA_URL / GITEA_ADMIN_TOKEN            — a running Gitea with an admin token
 *   PORTAINER_URL / PORTAINER_ADMIN_TOKEN    — a running Portainer with an admin JWT/API key
 *   OIDC_GITEA_CLIENT_ID / _SECRET
 *   OIDC_PORTAINER_CLIENT_ID / _SECRET
 *   OIDC_ISSUER
 *
 * Run:  bun tests/manual/oidc-bootstrap.e2e.ts
 * Exits non-zero if any configured target fails to register.
 */
import { OidcBootstrapService } from '../../services/auth/src/oidc/oidc-bootstrap.service';

async function main() {
  const svc = new OidcBootstrapService();
  let failed = false;

  const gitea = await svc.bootstrapGitea();
  console.log('[gitea] ', JSON.stringify(gitea, null, 2));
  if (gitea.status === 'error') failed = true;

  // Read back the auth source from the live Gitea to prove persistence.
  if (gitea.status === 'success' && process.env.GITEA_URL) {
    const res = await fetch(`${process.env.GITEA_URL}/api/v1/admin/auths`, {
      headers: { Authorization: `Bearer ${process.env.GITEA_ADMIN_TOKEN}` },
    });
    const sources = (await res.json()) as Array<Record<string, unknown>>;
    const found = sources.find((s) => s['name'] === 'VoidCloud SSO');
    console.log('[gitea] readback:', found ? JSON.stringify(found) : 'NOT FOUND');
    if (!found) failed = true;
  }

  const portainer = await svc.bootstrapPortainer();
  console.log('[portainer] ', JSON.stringify(portainer, null, 2));
  if (portainer.status === 'error') failed = true;

  if (portainer.status === 'success' && process.env.PORTAINER_URL) {
    const res = await fetch(`${process.env.PORTAINER_URL}/api/settings`, {
      headers: { Authorization: `Bearer ${process.env.PORTAINER_ADMIN_TOKEN}` },
    });
    const settings = (await res.json()) as any;
    const oauth = settings?.OAuthSettings ?? {};
    console.log('[portainer] readback ClientID:', oauth.ClientID, 'AuthorizationURI:', oauth.AuthorizationURI);
    if (oauth.ClientID !== process.env.OIDC_PORTAINER_CLIENT_ID) failed = true;
  }

  process.exit(failed ? 1 : 0);
}

main();
