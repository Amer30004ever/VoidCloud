/** CI secrets preflight: missing / malformed values are reported by name. */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const load = () => import('../../scripts/check-required-secrets.mjs');

describe('check-required-secrets', () => {
  it('reports STAGING_DATABASE_URL as missing when unset', async () => {
    const { checkProfile } = await load();
    const p = checkProfile(['staging-drift'], {});
    expect(p.map((x: any) => x.name)).toEqual(['STAGING_DATABASE_URL']);
    expect(p[0].reason).toBe('is missing or empty');
  });
  it('rejects a non-postgres staging URL', async () => {
    const { checkProfile } = await load();
    expect(checkProfile(['staging-drift'], { STAGING_DATABASE_URL: 'mysql://x' })[0].reason).toMatch(/invalid/);
  });
  it('accepts a valid staging URL', async () => {
    const { checkProfile } = await load();
    expect(checkProfile(['staging-drift'], { STAGING_DATABASE_URL: 'postgresql://u:p@db:5432/app' })).toEqual([]);
  });
  it('reports both GITEA_URL and GITEA_ADMIN_TOKEN when missing', async () => {
    const { checkProfile } = await load();
    expect(checkProfile(['oidc'], {}).map((x: any) => x.name)).toEqual(['GITEA_URL', 'GITEA_ADMIN_TOKEN']);
  });
  it('rejects a GITEA_URL without a scheme', async () => {
    const { checkProfile } = await load();
    const p = checkProfile(['oidc'], { GITEA_URL: 'git.example.com', GITEA_ADMIN_TOKEN: 'a'.repeat(40) });
    expect(p.map((x: any) => x.name)).toEqual(['GITEA_URL']);
  });
});
