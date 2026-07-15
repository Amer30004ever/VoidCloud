// Self-test for scripts/scan-tenant-isolation.mjs. Runs under `node --test`.
// Ensures the scanner actually flags an unscoped Prisma call on a
// tenant-scoped model — otherwise a low finding count could hide blind spots.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCANNER = join(REPO_ROOT, 'scripts', 'scan-tenant-isolation.mjs');

function runScanner(rootDir, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [SCANNER, ...extraArgs],
    {
      env: { ...process.env, TENANT_SCAN_ROOT: rootDir, TENANT_SCAN_BASELINE: '/dev/null' },
      encoding: 'utf8',
    },
  );
}

test('scanner flags a deliberately unscoped crmContact.findMany', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tenant-scan-'));
  try {
    mkdirSync(join(dir, 'fake', 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'fake', 'src', 'bad.ts'),
      `export function bad(prisma:any){ return prisma.crmContact.findMany({ orderBy:{ createdAt:'desc' } }); }\n`,
    );
    const res = runScanner(dir);
    assert.match(res.stdout, /crmContact\.findMany/);
    assert.match(res.stdout, /1 NEW/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scanner ignores a properly userId-scoped call', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tenant-scan-'));
  try {
    mkdirSync(join(dir, 'fake', 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'fake', 'src', 'good.ts'),
      `export function ok(prisma:any,userId:string){ return prisma.crmContact.findMany({ where:{ userId } }); }\n`,
    );
    const res = runScanner(dir);
    assert.match(res.stdout, /0 NEW/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scanner --ci exits non-zero on new findings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tenant-scan-'));
  try {
    mkdirSync(join(dir, 'fake', 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'fake', 'src', 'bad.ts'),
      `export function bad(prisma:any){ return prisma.whatsappMessage.deleteMany({}); }\n`,
    );
    const res = runScanner(dir, ['--ci']);
    assert.notEqual(res.status, 0);
    assert.match(res.stdout + res.stderr, /whatsappMessage\.deleteMany/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
