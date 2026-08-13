/**
 * Tier 6.5 — DB backup + restore drill coverage.
 *
 * The scripts are bash, so they're exercised for real with stubbed Postgres
 * binaries injected on PATH. This proves the flow (dump -> gzip -> retention,
 * and drill -> restore -> verify -> fail-loudly) rather than just file existence.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO = path.resolve(__dirname, '../..');
const BACKUP = path.join(REPO, 'database/scripts/backup.sh');
const DRILL = path.join(REPO, 'database/scripts/restore-drill.sh');

function toBashPath(p: string): string {
  if (process.platform !== 'win32') return p;
  return p.replace(/^([A-Za-z]):\\/, (_, d) => `/mnt/${d.toLowerCase()}/`).replace(/\\/g, '/');
}

const BACKUP_BASH = toBashPath(BACKUP);
const DRILL_BASH = toBashPath(DRILL);

let tmp: string;
let binDir: string;
let backupDir: string;

function stub(name: string, body: string) {
  const p = path.join(binDir, name);
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
}

function run(script: string, env: Record<string, string> = {}) {
  const bashScript = toBashPath(script);
  const bashBinDir = toBashPath(binDir);
  const bashBackupDir = toBashPath(backupDir);
  const inlineEnv = [
    `export PATH="${bashBinDir}:/usr/local/bin:/usr/bin:/bin"`,
    `export BACKUP_DIR="${bashBackupDir}"`,
    `export DB_HOST="${env.DB_HOST ?? 'localhost'}"`,
    `export DB_NAME="${env.DB_NAME ?? 'testdb'}"`,
    `export DB_USER="${env.DB_USER ?? 'tester'}"`,
    `export DB_PASS="${env.DB_PASS ?? 'secret'}"`,
    `export RETENTION_DAYS="${env.RETENTION_DAYS ?? '7'}"`,
  ].join('\n');
  const bashCmd = `${inlineEnv}\nbash "${bashScript}"`;
  return execFileSync('bash', ['-c', bashCmd], {
    encoding: 'utf8',
  });
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-backup-'));
  binDir = path.join(tmp, 'bin');
  backupDir = path.join(tmp, 'backups');
  fs.mkdirSync(binDir);
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('Tier 6.5 — backup.sh', () => {
  it('writes a gzipped dump into BACKUP_DIR', () => {
    stub('pg_dump', 'echo "-- fake dump for $*"');
    run(BACKUP);

    const files = fs.readdirSync(backupDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^voidcloud_backup_\d{14}\.sql\.gz$/);
    // Real gzip magic bytes — proves the pipeline actually compressed output.
    const head = fs.readFileSync(path.join(backupDir, files[0])).subarray(0, 2);
    expect([head[0], head[1]]).toEqual([0x1f, 0x8b]);
  });

  it('passes the configured connection params to pg_dump', () => {
    stub('pg_dump', `echo "$@" > "${toBashPath(tmp)}/args.txt"; echo "-- dump"`);
    run(BACKUP);

    const args = fs.readFileSync(path.join(tmp, 'args.txt'), 'utf8');
    expect(args).toContain('-h localhost');
    expect(args).toContain('-d testdb');
    expect(args).toContain('-U tester');
    expect(args).toContain('--no-owner');
  });

  it('prunes backups older than RETENTION_DAYS and keeps recent ones', () => {
    stub('pg_dump', 'echo "-- dump"');
    fs.mkdirSync(backupDir, { recursive: true });
    const stale = path.join(backupDir, 'voidcloud_backup_20000101000000.sql.gz');
    const fresh = path.join(backupDir, 'voidcloud_backup_20990101000000.sql.gz');
    fs.writeFileSync(stale, 'x');
    fs.writeFileSync(fresh, 'x');
    const old = new Date(Date.now() - 30 * 864e5);
    fs.utimesSync(stale, old, old);

    run(BACKUP_BASH, { RETENTION_DAYS: '7' });

    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.existsSync(fresh)).toBe(true);
  });

  it('fails loudly when pg_dump fails (set -o pipefail)', () => {
    stub('pg_dump', 'echo "connection refused" >&2; exit 1');
    expect(() => run(BACKUP_BASH)).toThrow();
  });
});

describe('Tier 6.5 — restore-drill.sh', () => {
  /**
   * Schema-completeness aware stub: `tables` is the list of table names the
   * restored database claims to contain.
   */
  function stubPostgresForDrill(tableCount: string, tables: string[] = []) {
    stub('dropdb', 'exit 0');
    stub('createdb', 'exit 0');
    stub(
      'psql',
      `if [[ "$*" == *"table_name FROM information_schema.tables"* ]]; then printf '%s\\n' ${tables
        .map((t) => `"${t}"`)
        .join(' ')}; ` +
        `elif [[ "$*" == *"information_schema.tables"* ]]; then echo "${tableCount}"; ` +
        `elif [[ "$*" == *"n_live_tup"* ]]; then echo "42"; else cat > /dev/null; fi`,
    );
  }

  function withManifest(tables: string[]): Record<string, string> {
    const p = path.join(tmp, 'expected-tables.txt');
    fs.writeFileSync(p, tables.join('\n') + '\n');
    return { EXPECTED_TABLES_FILE: toBashPath(p) };
  }

  it('exits non-zero when no backup file exists', () => {
    stubPostgresForDrill('10', ['users']);
    fs.mkdirSync(backupDir, { recursive: true });
    let err: any;
    try {
      run(DRILL, withManifest(['users']));
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(String(err.stderr)).toContain('No backup files found');
  });

  it('restores the latest backup and reports table/row counts', () => {
    stub('pg_dump', 'echo "-- dump"');
    run(BACKUP); // produce a real gzipped backup first
    stubPostgresForDrill('37', ['users', 'tenants', 'CrmLead']);

    const out = run(DRILL_BASH, withManifest(['users', 'tenants', 'CrmLead']));
    expect(out).toContain('Tables: 37');
    expect(out).toContain('Rows: 42');
    expect(out).toContain('Schema completeness verified');
    expect(out).toContain('Restore drill completed successfully');
  });

  it('fails the drill when the restored database has zero tables', () => {
    stub('pg_dump', 'echo "-- dump"');
    run(BACKUP);
    stubPostgresForDrill('0');

    let err: any;
    try {
      run(DRILL, withManifest(['users']));
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(String(err.stderr)).toContain('Restore verification failed');
  });

  it('fails when expected tables are missing even though the count is non-zero', () => {
    stub('pg_dump', 'echo "-- dump"');
    run(BACKUP);
    // Restored DB has plenty of tables, but the CRM tables are absent — exactly
    // the drift class that a pure count check cannot see.
    stubPostgresForDrill('124', ['users', 'tenants']);

    let err: any;
    try {
      run(DRILL_BASH, withManifest(['CrmLead', 'WhatsappMessage', 'tenants', 'users']));
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(String(err.stderr)).toContain('Schema completeness check failed');
    expect(String(err.stderr)).toContain('CrmLead');
    expect(String(err.stderr)).toContain('WhatsappMessage');
  });

  it('fails when the expected-tables manifest is missing', () => {
    stub('pg_dump', 'echo "-- dump"');
    run(BACKUP);
    stubPostgresForDrill('124', ['users']);

    let err: any;
    try {
      run(DRILL_BASH, { EXPECTED_TABLES_FILE: toBashPath(path.join(tmp, 'nope.txt')) });
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(String(err.stderr)).toContain('Expected-tables manifest not found');
  });

  it('ignores _prisma_migrations as an unexpected extra table', () => {
    stub('pg_dump', 'echo "-- dump"');
    run(BACKUP);
    stubPostgresForDrill('2', ['_prisma_migrations', 'users']);

    const out = run(DRILL_BASH, withManifest(['users']));
    expect(out).toContain('Unexpected tables: 0');
  });
});

