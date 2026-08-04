import { Injectable, Logger } from '@nestjs/common';
import { ProxmoxService } from './proxmox.service';
import {
  classifyVm,
  summarize,
  type IsolationFinding,
  type IsolationReport,
  type ReconcileOutcome,
  type ReconcileResult,
} from './isolation-reconciler';

/**
 * Prompt 0.15 — scans every existing Proxmox container and reports/repairs the
 * ones that predate (or drifted from) the tenant isolation ruleset.
 *
 * Answering "did VMs exist before the firewall fix?" is exactly
 * `report().preExistingVmsFound`, and `reconcile()` migrates them.
 */
@Injectable()
export class IsolationReconcilerService {
  private readonly logger = new Logger(IsolationReconcilerService.name);

  constructor(private readonly proxmox: ProxmoxService) {}

  private async scan(): Promise<IsolationFinding[]> {
    const expected = this.proxmox.expectedFirewallRaw();
    const containers = await this.proxmox.listAllContainers();
    const findings: IsolationFinding[] = [];
    for (const c of containers) {
      const state = await this.proxmox
        .getVmFirewallState(c.node, c.vmid)
        .catch(() => ({ enabled: false, raw: null }));
      findings.push(
        classifyVm(
          {
            node: c.node,
            vmid: c.vmid,
            name: c.name,
            enabled: state.enabled,
            raw: state.raw,
          },
          expected,
        ),
      );
    }
    return findings;
  }

  /** Read-only compliance report. Safe to call on a live host. */
  async report(): Promise<IsolationReport> {
    const findings = await this.scan();
    return summarize(findings, this.proxmox.isLiveHost());
  }

  /**
   * Push the expected ruleset to every non-compliant VM.
   * `dryRun` returns the plan without touching the host.
   */
  async reconcile(dryRun = false): Promise<ReconcileResult> {
    const findings = await this.scan();
    const base = summarize(findings, this.proxmox.isLiveHost());
    const outcomes: ReconcileOutcome[] = [];

    for (const f of findings.filter((x) => x.needsMigration)) {
      if (dryRun) {
        outcomes.push({
          vmid: f.vmid,
          node: f.node,
          from: f.state,
          applied: false,
        });
        continue;
      }
      try {
        await this.proxmox.applyIsolationFirewall(f.node, f.vmid);
        outcomes.push({
          vmid: f.vmid,
          node: f.node,
          from: f.state,
          applied: true,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Isolation backfill failed for vmid=${f.vmid}: ${message}`,
        );
        outcomes.push({
          vmid: f.vmid,
          node: f.node,
          from: f.state,
          applied: false,
          error: message,
        });
      }
    }

    return {
      ...base,
      dryRun,
      outcomes,
      migrated: outcomes.filter((o) => o.applied).length,
      failed: outcomes.filter((o) => !o.applied && o.error).length,
    };
  }
}
