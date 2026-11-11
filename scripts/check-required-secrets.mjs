#!/usr/bin/env node
/**
 * CI preflight: verifies that required secrets / env vars are present and
 * well-formed, and prints an actionable message for every problem.
 *
 * Usage:
 *   node scripts/check-required-secrets.mjs --profile staging-drift
 *   node scripts/check-required-secrets.mjs --profile oidc --optional
 *
 * --optional   report missing values as GitHub warnings and exit 0
 *              (for jobs that should skip, not fail, when unconfigured).
 * Never prints secret values — only names and the reason they failed.
 */

export const PROFILES = {
  'staging-drift': [
    {
      name: 'STAGING_DATABASE_URL',
      why: 'read-only drift check against the staging database',
      where: 'GitHub → Settings → Secrets and variables → Actions → STAGING_DATABASE_URL',
      validate: (v) => /^postgres(ql)?:\/\/[^\s]+@[^\s/]+(:\d+)?\/[^\s]+$/.test(v) || 'must look like postgresql://user:pass@host:5432/db',
    },
  ],
  oidc: [
    {
      name: 'GITEA_URL',
      why: 'OIDC bootstrap registers Void Cloud as an OAuth source in Gitea',
      where: 'GitHub Actions secret GITEA_URL (e.g. https://git.voidcloud.cc.cd)',
      validate: (v) => /^https?:\/\/[^\s/]+/.test(v) || 'must start with http:// or https://',
    },
    {
      name: 'GITEA_ADMIN_TOKEN',
      why: 'admin API token used by oidc-bootstrap to create the OAuth2 application',
      where: 'Gitea → Site Administration → user → Applications → Generate token (scope: write:admin), then save as GITEA_ADMIN_TOKEN',
      validate: (v) => v.length >= 20 || 'looks too short to be a Gitea token (expected 40 hex chars)',
    },
  ],
};

export function checkProfile(profileNames, env) {
  const problems = [];
  for (const p of profileNames) {
    const reqs = PROFILES[p];
    if (!reqs) { problems.push({ name: p, reason: `unknown profile "${p}" (known: ${Object.keys(PROFILES).join(', ')})` }); continue; }
    for (const r of reqs) {
      const raw = env[r.name];
      const v = typeof raw === 'string' ? raw.trim() : '';
      if (!v) { problems.push({ name: r.name, reason: 'is missing or empty', why: r.why, where: r.where }); continue; }
      const res = r.validate ? r.validate(v) : true;
      if (res !== true) problems.push({ name: r.name, reason: `is set but invalid: ${res}`, why: r.why, where: r.where });
    }
  }
  return problems;
}

function main() {
  const args = process.argv.slice(2);
  const profiles = [];
  for (let i = 0; i < args.length; i++) if (args[i] === '--profile') profiles.push(args[++i]);
  const optional = args.includes('--optional');
  if (!profiles.length) { console.error('usage: check-required-secrets.mjs --profile <name> [--profile <name>] [--optional]'); process.exit(2); }

  const problems = checkProfile(profiles, process.env);
  const gh = !!process.env.GITHUB_ACTIONS;
  if (!problems.length) { console.log(`✓ All required secrets present for: ${profiles.join(', ')}`); return; }

  const level = optional ? 'warning' : 'error';
  for (const p of problems) {
    const line = `${p.name} ${p.reason}.${p.why ? ` Needed for: ${p.why}.` : ''}${p.where ? ` Set it in: ${p.where}.` : ''}`;
    console.log(gh ? `::${level} title=Missing CI secret ${p.name}::${line}` : `✗ ${line}`);
  }
  console.log(`\n${problems.length} problem(s) for profile(s) ${profiles.join(', ')}.${optional ? ' Continuing (optional).' : ''}`);
  if (gh && process.env.GITHUB_OUTPUT) {
    // Downstream steps can `if: steps.<id>.outputs.ready == 'true'`.
    import('node:fs').then((fs) => fs.appendFileSync(process.env.GITHUB_OUTPUT, `ready=false\n`));
  }
  if (!optional) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
