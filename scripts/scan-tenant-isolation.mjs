#!/usr/bin/env node
/**
 * Tenant-isolation audit for Prisma calls in services/* /src.
 *
 * Data model note: in this codebase, most tenant-scoped tables are keyed by
 * `userId` (with the user's tenant looked up via UserTenant), not a raw
 * `tenantId` column. A query on a tenant-scoped model is considered SAFE if
 * ANY of these appear in the same call args:
 *
 *   - tenantId
 *   - userId
 *   - organizationId
 *   - id: (single-row lookup by primary key — assumed to be follow-on to an
 *     already-authorized fetch; still flagged in `--strict` mode)
 *
 * Flags unscoped `findMany`, `updateMany`, `deleteMany`, `count`, `aggregate`
 * on tenant-scoped models. `findFirst` / `findUnique` with `where.id` alone
 * pass in default mode but are listed in strict mode.
 *
 * Usage:
 *   node scripts/scan-tenant-isolation.mjs           # report, exit 0
 *   node scripts/scan-tenant-isolation.mjs --ci      # exit 1 if new violations
 *   node scripts/scan-tenant-isolation.mjs --strict  # include single-row lookups
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
// TENANT_SCAN_ROOT lets tests point the scanner at a fixture tree instead of
// the real services/ directory — see scripts/__tests__/scan-tenant-isolation.test.mjs.
const SERVICES_DIR = process.env.TENANT_SCAN_ROOT || join(ROOT, 'services');
const BASELINE_PATH = process.env.TENANT_SCAN_BASELINE || join(ROOT, 'scripts', 'tenant-isolation-baseline.json');

// Tenant-scoped Prisma models — mirror database/prisma/schema.prisma.
// Models with per-tenant data that MUST be filtered by tenantId/userId.
const TENANT_SCOPED_MODELS = new Set([
  'conversation', 'message',
  'whatsappContact', 'whatsappMessage', 'whatsappBroadcast',
  'crmLead', 'crmContact', 'crmCompany', 'crmDeal', 'crmTask', 'crmActivity',
  'cloudDeployment', 'vPSSnapshot', 'vpsSnapshot',
  'vpsAlertRule', 'vpsAlertNotification',
  'cloudBackup', 'backupSchedule', 'vpsSecuritySettings',
  'cloudInvoice', 'cloudPaymentMethod',
  'domain', 'dNSRecord', 'dnsRecord',
  'webhook', 'webhookEndpoint',
  'alertRule', 'alert',
  'ipBlockList',
]);

const RISKY_METHODS = new Set(['findMany', 'updateMany', 'deleteMany', 'count', 'aggregate', 'groupBy']);
const SAFE_KEYS = ['tenantId', 'userId', 'organizationId', 'ownerId', 'createdById'];

const strict = process.argv.includes('--strict');
const ci = process.argv.includes('--ci');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '__tests__') continue;
      walk(p, out);
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts') && !name.endsWith('.spec.ts')) {
      out.push(p);
    }
  }
  return out;
}

// Match `prisma.<model>.<method>(` or `this.prisma.<model>.<method>(`.
// Body extraction is balanced-brace up to the matching ')'.
const CALL_RE = /(?:this\.)?prisma\.(\w+)\.(\w+)\s*\(/g;

function extractCallArgs(src, startIdx) {
  // startIdx points at '(' — walk with brace/paren depth.
  let depth = 0;
  let i = startIdx;
  const n = src.length;
  for (; i < n; i++) {
    const c = src[i];
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (depth === 0 && c === ')') return src.slice(startIdx + 1, i);
    }
  }
  return src.slice(startIdx + 1);
}

const findings = [];
for (const file of walk(SERVICES_DIR)) {
  const src = readFileSync(file, 'utf8');
  CALL_RE.lastIndex = 0;
  let m;
  while ((m = CALL_RE.exec(src))) {
    const [, model, method] = m;
    if (!TENANT_SCOPED_MODELS.has(model)) continue;
    if (!RISKY_METHODS.has(method) && !(strict && (method === 'findFirst' || method === 'findUnique'))) continue;
    const openParenIdx = CALL_RE.lastIndex - 1;
    const args = extractCallArgs(src, openParenIdx);
    if (SAFE_KEYS.some((k) => new RegExp(`\\b${k}\\b`).test(args))) continue;
    const line = src.slice(0, m.index).split('\n').length;
    findings.push({
      file: relative(ROOT, file),
      line,
      model,
      method,
      snippet: (`prisma.${model}.${method}(` + args).slice(0, 200).replace(/\s+/g, ' '),
    });
  }
}

// Baseline: existing findings we haven't fixed yet.
let baseline = [];
if (existsSync(BASELINE_PATH)) {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).findings || [];
}
const baselineKeys = new Set(baseline.map((f) => `${f.file}:${f.line}:${f.model}.${f.method}`));
const newFindings = findings.filter((f) => !baselineKeys.has(`${f.file}:${f.line}:${f.model}.${f.method}`));

console.log(`Tenant-isolation audit — ${findings.length} total, ${newFindings.length} NEW vs. baseline.`);
if (newFindings.length) {
  console.log('\nNEW unscoped queries (must be fixed or baselined):\n');
  for (const f of newFindings) {
    console.log(`  ${f.file}:${f.line}  prisma.${f.model}.${f.method}(…)`);
    console.log(`     ${f.snippet}`);
  }
}
if (ci && newFindings.length) {
  console.error('\nCI FAIL: new unscoped tenant queries introduced. Add a WHERE tenantId/userId filter or update the baseline with justification.');
  process.exit(1);
}
// Report mode: full list.
if (!ci && findings.length) {
  console.log('\nFull findings:');
  for (const f of findings) {
    console.log(`  ${f.file}:${f.line}  ${f.model}.${f.method}`);
  }
}
