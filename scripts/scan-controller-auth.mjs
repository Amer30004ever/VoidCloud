#!/usr/bin/env node
/**
 * RBAC controller-auth scanner.
 *
 * Walks every services/<svc>/src/**\/*.controller.ts, parses each HTTP handler
 * (methods decorated with @Get/@Post/@Put/@Patch/@Delete), and reports which
 * ones are missing an @Roles(...) decorator on either the method OR the
 * enclosing controller class.
 *
 * Baseline mode:
 *   node scripts/scan-controller-auth.mjs            → fail on any NEW entries
 *   node scripts/scan-controller-auth.mjs --write    → refresh scripts/rbac-baseline.json
 *   node scripts/scan-controller-auth.mjs --list     → print current findings
 *
 * The baseline holds the historic set of undecorated routes. New findings
 * (routes added or route files touched after the baseline was written) MUST
 * either get an @Roles decoration or be explicitly re-baselined. Existing
 * baseline entries should be worked down in batches (see task tracker).
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, 'scripts', 'rbac-baseline.json');
const METHOD_DECORATORS = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'All'];

/** Recursively find every *.controller.ts under services/. */
function findControllers(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...findControllers(full));
    else if (full.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

function parseController(path) {
  const src = readFileSync(path, 'utf8');
  const rel = relative(ROOT, path);

  // Find class name and check for class-level @Roles.
  const classMatch = src.match(/@Controller\([^)]*\)\s*(?:@[\w.]+\([^)]*\)\s*)*export\s+class\s+(\w+)/);
  const controller = classMatch ? classMatch[1] : rel;

  // Class-level guards: look at the block of decorators immediately preceding
  // the `export class ...` line and check for @Roles(.
  const classDecoratorsBlock = src.slice(0, classMatch?.index ?? 0);
  const classHasRoles = /@Roles\s*\(/.test(
    // last ~500 chars of decorators cover the typical decorator stack
    classDecoratorsBlock.slice(-800),
  );

  const findings = [];

  // Walk every line looking for @Get(...) / @Post(...) etc. For each, look
  // back a few lines to see if @Roles(...) sits on the same method.
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*@(\w+)\s*\(/);
    if (!m || !METHOD_DECORATORS.includes(m[1])) continue;

    // Method name is on the next non-decorator/non-blank line.
    let j = i + 1;
    while (j < lines.length && (lines[j].trim().startsWith('@') || lines[j].trim() === '')) j++;
    const methodMatch = lines[j]?.match(/^\s*(?:async\s+)?(\w+)\s*\(/);
    const method = methodMatch ? methodMatch[1] : `line${i + 1}`;

    // Look backwards up to 6 lines for @Roles( on this same handler.
    let hasRoles = false;
    for (let k = i - 1; k >= Math.max(0, i - 6); k--) {
      const t = lines[k].trim();
      if (t === '' || t.startsWith('//')) continue;
      if (t.startsWith('@Roles(')) { hasRoles = true; break; }
      if (!t.startsWith('@')) break; // reached previous method's body
    }

    if (!hasRoles && !classHasRoles) {
      findings.push({
        file: rel,
        controller,
        method,
        httpVerb: m[1].toUpperCase(),
        line: i + 1,
      });
    }
  }

  return findings;
}

function key(f) {
  return `${f.file}::${f.controller}.${f.method}`;
}

function main() {
  const mode = process.argv[2] ?? 'check';
  const controllers = findControllers(join(ROOT, 'services'));
  const findings = controllers.flatMap(parseController);
  const findingKeys = new Set(findings.map(key));

  if (mode === '--list') {
    console.log(JSON.stringify(findings, null, 2));
    process.exit(0);
  }

  if (mode === '--write') {
    writeFileSync(BASELINE, JSON.stringify(findings, null, 2) + '\n');
    console.log(`Wrote baseline with ${findings.length} entries to ${relative(ROOT, BASELINE)}`);
    process.exit(0);
  }

  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : [];
  const baselineKeys = new Set(baseline.map(key));

  const introduced = findings.filter((f) => !baselineKeys.has(key(f)));
  const fixed = baseline.filter((f) => !findingKeys.has(key(f)));

  console.log(`RBAC scan: ${findings.length} undecorated routes total`);
  console.log(`  baseline: ${baseline.length}`);
  console.log(`  new (not in baseline): ${introduced.length}`);
  console.log(`  fixed since baseline:  ${fixed.length}`);

  if (fixed.length) {
    console.log('\nFixed since baseline (remove these from scripts/rbac-baseline.json):');
    for (const f of fixed) console.log(`  - ${key(f)}`);
  }
  if (introduced.length) {
    console.log('\nNEW undecorated routes (must add @Roles or explicitly baseline):');
    for (const f of introduced) console.log(`  - ${key(f)} (${f.httpVerb} at line ${f.line})`);
    process.exit(1);
  }
  process.exit(0);
}

main();
