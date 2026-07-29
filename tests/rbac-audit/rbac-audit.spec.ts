import { auditAllControllers } from './rbac-audit';

describe('RBAC static audit (controllers must not silently regress)', () => {
  const findings = auditAllControllers();

  const deadDecorators = findings.filter((f) =>
    f.problem.includes('DEAD'),
  );
  const openMutating = findings.filter((f) =>
    f.problem.includes('wide open'),
  );

  function report(list: typeof findings) {
    return list
      .map((f) => `  ${f.file}:${f.line} ${f.httpVerb} ${f.problem}`)
      .join('\n');
  }

  it('has no @Roles() decorator that is silently dead (missing RolesGuard)', () => {
    if (deadDecorators.length) console.error('Dead @Roles decorators:\n' + report(deadDecorators));
    expect(deadDecorators).toHaveLength(0);
  });

  it('has no state-changing route left wide open (no guard, not @Public())', () => {
    if (openMutating.length) console.error('Open mutating routes:\n' + report(openMutating));
    expect(openMutating).toHaveLength(0);
  });
});
