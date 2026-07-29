import * as fs from 'fs';
import * as path from 'path';

/**
 * Static RBAC audit for VoidCloud microservice controllers.
 *
 * Run in CI (rbac-audit.spec.ts). It fails the build if either of these
 * regressions appears:
 *   1. A route declares @Roles(...) but no RolesGuard/RoleGuard is wired
 *      (class or method) — i.e. the decorator is DEAD and silently ignored.
 *   2. A state-changing route (POST/PUT/DELETE/PATCH) has NO auth guard
 *      at all and is not @Public() — i.e. it is wide open.
 *
 * Self-scoped GET endpoints (e.g. /auth/me, /users/me) that rely on
 * @JwtAuthGuard + @CurrentUser are intentionally allowed without @Roles.
 * Health probes (health.controller.ts) are skipped by design.
 */

const SERVICES_ROOT = path.resolve(__dirname, '../../services');

const MUTATING_VERBS = ['Post', 'Put', 'Delete', 'Patch'];
const ALL_VERBS = ['Get', 'Post', 'Put', 'Delete', 'Patch', 'Options', 'Head', 'All'];

// Any of these identifiers counts as "a guard is present on this element".
const ANY_GUARD = /@UseGuards\s*\([^)]*\b(?:JwtAuthGuard|AuthGuard|LocalAuthGuard|RolesGuard|RoleGuard|PermissionGuard)\b/;
// A role-enforcing guard specifically.
const ROLE_GUARD = /@UseGuards\s*\([^)]*\b(?:RolesGuard|RoleGuard|PermissionGuard)\b/;

export interface RouteFinding {
  file: string;
  line: number;
  httpVerb: string;
  problem: string;
}

function listControllerFiles(): string[] {
  const out: string[] = [];
  for (const svc of fs.readdirSync(SERVICES_ROOT)) {
    const src = path.join(SERVICES_ROOT, svc, 'src');
    if (!fs.existsSync(src)) continue;
    walk(src, out);
  }
  return out.sort();
}

function walk(dir: string, out: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.controller.ts')) out.push(full);
  }
}

function readLines(file: string): string[] {
  return fs.readFileSync(file, 'utf8').split('\n');
}

function hasDecorator(block: string, name: string): boolean {
  return new RegExp(`@${name}\\b`).test(block);
}

function getClassDecorators(lines: string[]): string {
  for (let i = 0; i < lines.length; i++) {
    if (/@Controller\s*\(/.test(lines[i])) {
      const block: string[] = [];
      for (let j = i; j < lines.length; j++) {
        block.push(lines[j]);
        if (/\bclass\s+\w+/.test(lines[j])) break;
      }
      return block.join('\n');
    }
  }
  return '';
}

function getMethodDecoratorBlock(lines: string[], methodLine: number): string {
  const block: string[] = [];
  let j = methodLine - 1;
  while (j >= 0 && /^\s*@/.test(lines[j])) {
    block.unshift(lines[j]);
    j--;
  }
  return block.join('\n');
}

function parseController(file: string): RouteFinding[] {
  const lines = readLines(file);
  const findings: RouteFinding[] = [];

  if (/health\.controller\.ts$/.test(file)) return findings;

  const classDec = getClassDecorators(lines);
  const classAnyGuard = ANY_GUARD.test(classDec);
  const classRoleGuard = ROLE_GUARD.test(classDec);
  const classIsPublic = hasDecorator(classDec, 'Public');
  const classHasRoles = hasDecorator(classDec, 'Roles');

  for (let i = 0; i < lines.length; i++) {
    const verb = ALL_VERBS.find((v) => hasDecorator(lines[i], v));
    if (!verb) continue;

    const block = getMethodDecoratorBlock(lines, i);
    const methodAnyGuard = ANY_GUARD.test(block);
    const methodRoleGuard = ROLE_GUARD.test(block);
    const isPublic = classIsPublic || hasDecorator(block, 'Public');
    const hasRoles = classHasRoles || hasDecorator(block, 'Roles');
    const anyGuard = classAnyGuard || methodAnyGuard;
    const roleGuard = classRoleGuard || methodRoleGuard;

    if (isPublic) continue;

    // 1) Dead @Roles: declared but no role-enforcing guard wired.
    if (hasRoles && !roleGuard) {
      findings.push({
        file: path.relative(SERVICES_ROOT, file),
        line: i + 1,
        httpVerb: verb.toUpperCase(),
        problem: '@Roles() declared but no RolesGuard/RoleGuard wired — decorator is DEAD',
      });
      continue;
    }

    // 2) Open state-changing route with no guard at all.
    if (MUTATING_VERBS.includes(verb) && !anyGuard && !hasRoles) {
      findings.push({
        file: path.relative(SERVICES_ROOT, file),
        line: i + 1,
        httpVerb: verb.toUpperCase(),
        problem: 'mutating route with NO auth guard and not @Public() — wide open',
      });
    }
  }

  return findings;
}

export function auditAllControllers(): RouteFinding[] {
  const findings: RouteFinding[] = [];
  for (const file of listControllerFiles()) {
    findings.push(...parseController(file));
  }
  return findings;
}
