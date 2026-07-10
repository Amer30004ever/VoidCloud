#!/usr/bin/env node
/**
 * Void Cloud RBAC static analyzer.
 *
 * Walks every *.controller.ts under services/ and reports any HTTP handler
 * (@Get/@Post/@Put/@Patch/@Delete/@All/@Options/@Head) that is NOT protected by:
 *   - @Public()  (explicit public route, e.g. /auth/login), or
 *   - @Roles(...) at method or class level.
 *
 * Baseline mode:
 *   A snapshot of currently-unguarded routes is committed at
 *   scripts/rbac-baseline.json. The scanner fails ONLY when a NEW unguarded
 *   route appears that isn't in the baseline. This lets us block regressions
 *   today while the existing controllers are cleaned up service-by-service.
 *
 *   Regenerate the baseline (after intentionally guarding routes):
 *     node scripts/scan-controller-auth.mjs --write-baseline
 *
 * Strict mode (fail on ANY unguarded route, no baseline):
 *   RBAC_STRICT=1 node scripts/scan-controller-auth.mjs
 *
 * Exits non-zero (fails CI) when regressions or strict-mode violations exist.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));
const SERVICES = join(ROOT, 'services');
const BASELINE = join(ROOT, 'scripts', 'rbac-baseline.json');
const HTTP_DECORATORS = /@(Get|Post|Put|Patch|Delete|All|Options|Head)\s*\(/;
const ALLOWLIST_FILES = new Set(['health.controller.ts']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.turbo') continue;
      walk(p, out);
    } else if (entry.endsWith('.controller.ts')) {
      out.push(p);
    }
  }
  return out;
}

function analyze(file) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const controllerHasRoles = /@Roles\s*\(/.test(src);
  const isHealth = ALLOWLIST_FILES.has(file.split(sep).pop());
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    if (!HTTP_DECORATORS.test(lines[i])) continue;
    let hasGuard = controllerHasRoles;
    let hasPublic = false;
    for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
      const l = lines[j].trim();
      if (l === '' || l === '}') break;
      if (/@Roles\s*\(/.test(l)) hasGuard = true;
      if (/@Public\s*\(\s*\)/.test(l)) hasPublic = true;
    }
    if (!hasGuard && !hasPublic && !isHealth) {
      violations.push({
        file: file.replace(ROOT + sep, '').replaceAll(sep, '/'),
        line: i + 1,
        snippet: lines[i].trim(),
      });
    }
  }
  return violations;
}

const args = new Set(process.argv.slice(2));
const strict = process.env.RBAC_STRICT === '1' || args.has('--strict');
const writeBaseline = args.has('--write-baseline');

const files = walk(SERVICES);
const current = [];
for (const f of files) current.push(...analyze(f));

const key = (v) => `${v.file}:${v.snippet}`;
const currentKeys = new Set(current.map(key));

if (writeBaseline) {
  const payload = {
    generatedAt: new Date().toISOString(),
    entries: current
      .map((v) => ({ file: v.file, snippet: v.snippet }))
      .sort((a, b) => (a.file + a.snippet).localeCompare(b.file + b.snippet)),
  };
  writeFileSync(BASELINE, JSON.stringify(payload, null, 2) + '\n');
  console.log(`✅ Wrote baseline with ${payload.entries.length} entries → ${BASELINE.replace(ROOT + sep, '')}`);
  process.exit(0);
}

if (strict) {
  if (current.length) {
    console.error(`\n❌ RBAC scan (strict): ${current.length} unguarded route(s):\n`);
    for (const v of current) console.error(`  ${v.file}:${v.line}  ${v.snippet}`);
    process.exit(1);
  }
  console.log(`✅ RBAC scan (strict): all ${files.length} controllers pass.`);
  process.exit(0);
}

// Baseline mode
let baseline = { entries: [] };
if (existsSync(BASELINE)) {
  baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
}
const baselineKeys = new Set(baseline.entries.map((e) => `${e.file}:${e.snippet}`));

const regressions = current.filter((v) => !baselineKeys.has(key(v)));
const fixedInBaseline = baseline.entries.filter((e) => !currentKeys.has(`${e.file}:${e.snippet}`));

if (regressions.length) {
  console.error(`\n❌ RBAC scan: ${regressions.length} NEW unguarded route(s) not in baseline:\n`);
  for (const v of regressions) console.error(`  ${v.file}:${v.line}  ${v.snippet}`);
  console.error(
    `\nEach new route must be either @Public() or @Roles(Role.X, ...).\n` +
      `If a route is intentionally added to the baseline, re-run:\n` +
      `  node scripts/scan-controller-auth.mjs --write-baseline\n`,
  );
  process.exit(1);
}

console.log(
  `✅ RBAC scan: no regressions. ${current.length} route(s) still on the cleanup baseline; ${fixedInBaseline.length} previously-flagged route(s) now guarded.`,
);
if (fixedInBaseline.length) {
  console.log(`   Consider running --write-baseline to shrink it.`);
}
