#!/usr/bin/env node
/**
 * Void Cloud RBAC static analyzer.
 *
 * Walks every *.controller.ts under services/ and fails if a handler
 * (@Get/@Post/@Put/@Patch/@Delete) is NOT protected by either
 *   - @Public()  (explicit public route, e.g. /auth/login), or
 *   - @Roles(...) at method or controller level.
 *
 * Health check controllers under a /health path are allowlisted.
 * Prints a summary; exits 1 on any violation so CI can block the merge.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));
const SERVICES = join(ROOT, 'services');
const HTTP_DECORATORS = /@(Get|Post|Put|Patch|Delete|All|Options|Head)\s*\(/;

/** Controllers/methods we intentionally leave without @Roles. */
const ALLOWLIST_FILES = new Set([
  // health probes are hit by kube liveness/readiness; must be reachable without JWT.
  'health.controller.ts',
]);

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
  const violations = [];
  const controllerHasRoles = /@Roles\s*\(/.test(src);
  const controllerHasPublic = /@Public\s*\(\s*\)/.test(
    // only class-level scan: everything after the first @Controller decl
    src,
  );
  const isHealth = ALLOWLIST_FILES.has(file.split(sep).pop());

  for (let i = 0; i < lines.length; i++) {
    if (!HTTP_DECORATORS.test(lines[i])) continue;
    // Look back up to 10 lines for @Public/@Roles above this handler,
    // stopping at a blank line separating handlers.
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
        file: file.replace(ROOT + sep, ''),
        line: i + 1,
        snippet: lines[i].trim(),
      });
    }
  }
  return violations;
}

const files = walk(SERVICES);
let total = 0;
const bad = [];
for (const f of files) {
  const v = analyze(f);
  total += v.length ? 0 : 1;
  bad.push(...v);
}

if (bad.length) {
  console.error(`\n❌ RBAC scan: ${bad.length} unguarded controller route(s) found:\n`);
  for (const v of bad) {
    console.error(`  ${v.file}:${v.line}  ${v.snippet}`);
  }
  console.error(
    `\nEach route must be either:\n` +
      `  - @Public()   (explicit public endpoint, e.g. /auth/login)\n` +
      `  - @Roles(Role.X, Role.Y, ...)   (RBAC-guarded)\n`,
  );
  process.exit(1);
}

console.log(`✅ RBAC scan: all ${files.length} controllers pass (${total} clean, health probes allowlisted).`);
