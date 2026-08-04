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

let tmp: string;
let binDir: string;
let backupDir: string;

function stub(name: string, body: string) {
  const p = path.join(binDir, name);
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
}

function run(script: string, env: Record<string, string> = {}) {
  return execFileSync('bash', [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      BACKUP_DIR: backupDir,
      DB_HOST: 'localhost',
      DB_NAME: 'testdb',
      DB_USER: 'tester',
      DB_PASS: 'secret',
      ...env,
    },
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
    stub('pg_dump', `echo "$@" > "${tmp}/args.txt"; echo "-- dump"`);
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

    run(BACKUP, { RETENTION_DAYS: '7' });

    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.existsSync(fresh)).toBe(true);
  });

  it('fails loudly when pg_dump fails (set -o pipefail)', () => {
    stub('pg_dump', 'echo "connection refused" >&2; exit 1');
    expect(() => run(BACKUP)).toThrow();
  });
});

describe('Tier 6.5 — restore-drill.sh', () => {
  function stubPostgresForDrill(tableCount: string) {
    stub('dropdb', 'exit 0');
    stub('createdb', 'exit 0');
    stub(
      'psql',
      `if [[ "$*" == *"information_schema.tables"* ]]; then echo "${tableCount}"; ` +
        `elif [[ "$*" == *"n_live_tup"* ]]; then echo "42"; else cat > /dev/null; fi`,
    );
  }

  it('exits non-zero when no backup file exists', () => {
    stubPostgresForDrill('10');
    fs.mkdirSync(backupDir, { recursive: true });
    let err: any;
    try {
      run(DRILL);
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(String(err.stderr)).toContain('No backup files found');
  });

  it('restores the latest backup and reports table/row counts', () => {
    stub('pg_dump', 'echo "-- dump"');
    run(BACKUP); // produce a real gzipped backup first
    stubPostgresForDrill('37');

    const out = run(DRILL);
    expect(out).toContain('Tables: 37');
    expect(out).toContain('Rows: 42');
    expect(out).toContain('Restore drill completed successfully');
  });

  it('fails the drill when the restored database has zero tables', () => {
    stub('pg_dump', 'echo "-- dump"');
    run(BACKUP);
    stubPostgresForDrill('0');

    let err: any;
    try {
      run(DRILL);
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(String(err.stderr)).toContain('Restore verification failed');
  });
});
