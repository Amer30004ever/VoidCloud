#!/usr/bin/env node
/**
 * Crash-loop regression guard (Prompt 0.18).
 *
 * Every VoidCloud microservice sets a global route prefix of `api/v1`, so its
 * liveness/readiness health endpoint is served at `/api/v1/health`. A probe
 * that targets a bare `/health` (or any other unprefixed path) gets a 404,
 * k8s kills the pod, and the service enters a restart crash-loop.
 *
 * whatsapp-service historically crash-looped 290 times because its probe used
 * `/health`. This script fails CI if ANY deployment probe path deviates from
 * the agreed `/api/v1/health` convention, so the mistake can't recur
 * silently.
 *
 * Usage:
 *   node scripts/check-probes.mjs           -> exit 1 on any violation
 *   node scripts/check-probes.mjs --list    -> print every probe it sees
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED = '/api/v1/health';
const PROBE_KINDS = ['livenessProbe', 'readinessProbe', 'startupProbe'];

// Services that legitimately serve health elsewhere (NOT crash-loops):
//  - frontend: Next.js app, no global api/v1 prefix, health at root.
//  - openwa: separate OpenWA gateway pod on :2785, health/docs at /api/docs.
//  - ollama: upstream third-party image; it has no NestJS prefix and exposes
//    readiness at /api/tags (the documented "is the model server up" endpoint).
const KNOWN_EXCEPTIONS = new Map([
  ['frontend', '/'],
  ['openwa', '/api/docs'],
  ['ollama', '/api/tags'],
]);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name === 'deployment.yaml') yield full;
  }
}

function probesInFile(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const out = [];
  let pendingKind = null;
  for (const raw of lines) {
    const kindMatch = raw.match(/^(\s*)(livenessProbe|readinessProbe|startupProbe):\s*$/);
    if (kindMatch) {
      pendingKind = kindMatch[2];
      continue;
    }
    if (pendingKind) {
      const pathMatch = raw.match(/^\s*path:\s*['"]?([^\s'"]+)['"]?\s*$/);
      if (pathMatch) {
        out.push({ kind: pendingKind, path: pathMatch[1] });
        pendingKind = null; // one path per probe block
      }
    }
  }
  return out;
}

const list = process.argv.includes('--list');
const violations = [];
const seen = [];

for (const file of walk(join(ROOT, 'kubernetes'))) {
  if (!existsSync(file)) continue;
  const probes = probesInFile(file);
  const svc = file.split(/[\\/]/).slice(-2, -1)[0] || file;
  const except = KNOWN_EXCEPTIONS.get(svc);
  for (const p of probes) {
    seen.push(`${svc} ${p.kind} -> ${p.path}`);
    if (except) {
      if (p.path !== except) {
        violations.push(
          `${file}: ${p.kind} path is "${p.path}" (expected "${except}" for ${svc})`,
        );
      }
      continue;
    }
    if (p.path !== EXPECTED) {
      violations.push(`${file}: ${p.kind} path is "${p.path}" (expected "${EXPECTED}")`);
    }
  }
}

if (list) {
  console.log('Health probes found:');
  for (const s of seen) console.log('  ', s);
}

if (violations.length) {
  console.error('\n❌ Deployment health-probe paths deviate from the agreed convention:');
  for (const v of violations) console.error('   -', v);
  console.error(
    `\nEvery service sets the global prefix "api/v1", so its health endpoint is ` +
      `"${EXPECTED}". A probe on a bare/unprefixed path returns 404, kills the ` +
      `pod, and crash-loops it (see Prompt 0.18 / whatsapp-service 290 restarts). ` +
      `Fix the probe path to "${EXPECTED}".`,
  );
  process.exit(1);
}

console.log(`✅ All ${seen.length} health probe(s) across deployments use ${EXPECTED}`);
process.exit(0);
