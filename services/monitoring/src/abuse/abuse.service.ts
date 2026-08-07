import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AbuseCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { withImpersonation } from '../common/audit-impersonation';

export interface AbuseReportInput {
  reporterName?: string;
  reporterEmail?: string;
  targetIp?: string;
  targetDomain?: string;
  targetVpsId?: string;
  category?: string;
  reason: string;
  evidence?: string;
  reporterIp?: string;
}

export interface OutboundAbuseSignal {
  vpsId: string;
  userId: string;
  signature: string;
  score: number;
  detail: Record<string, unknown>;
}

/**
 * Abuse handling (Prompt 0.17).
 *
 * Two intake paths share one store:
 *  1. External abuse reports — submitted unauthenticated via POST /abuse/report
 *     by third parties (other providers, ISPs, researchers).
 *  2. Automated outbound-abuse detection — derived from UsageMetric samples
 *     (mass SMTP connections, sustained high outbound to many IPs, sustained
 *     100% CPU with no legitimate workload). Crossing a threshold raises an
 *     AbuseReport (source=automated) and notifies SUPER_ADMIN.
 *
 * On either path, a fast "suspend networking" action is available to SUPER_ADMIN
 * — it sets networkSuspendedAt + abuseStatus=SUSPENDED and flips the VPS to
 * SUSPENDED status (preserving the VM + evidence, unlike TERMINATED).
 */
@Injectable()
export class AbuseService {
  private readonly logger = new Logger(AbuseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Log an external abuse report. Returns the persisted row. */
  async submitReport(input: AbuseReportInput, reporterIp?: string) {
    const category = this.normalizeCategory(input.category);
    const report = await this.prisma.abuseReport.create({
      data: {
        reporterName: input.reporterName,
        reporterEmail: input.reporterEmail,
        reporterIp: input.reporterIp ?? reporterIp,
        targetIp: input.targetIp,
        targetDomain: input.targetDomain,
        targetVpsId: input.targetVpsId,
        category,
        reason: input.reason,
        evidence: input.evidence,
        source: 'external',
        status: 'RECEIVED',
      },
    });
    this.logger.warn(`Abuse report received: ${report.id} (${category}) target=${input.targetIp ?? input.targetDomain ?? input.targetVpsId ?? 'unknown'}`);
    await this.notifySuperAdmins(report);
    return report;
  }

  listReports(status?: string) {
    return this.prisma.abuseReport.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async resolveReport(id: string, status: string, adminId?: string, impersonatedBy?: string) {
    const report = await this.prisma.abuseReport.update({
      where: { id },
      data: {
        status: status as any,
        resolvedAt: status === 'RESOLVED' || status === 'DISMISSED' || status === 'ACTION_TAKEN' ? new Date() : undefined,
      },
    });
    const details = withImpersonation({ status }, { impersonatedBy });
    await this.prisma.auditLog.create({
      data: {
        action: 'ABUSE_REPORT_RESOLVE',
        adminId: adminId,
        resource: `abuse_report:${id}`,
        details: details as any,
        status: 'SUCCESS',
      },
    });
    return report;
  }

  /**
   * Analyze recent UsageMetric samples for outbound-abuse signatures.
   * Returns the signals that crossed threshold and persists an automated
   * AbuseReport + SUPER_ADMIN notification for each.
   */
  async detectOutboundAbuse(windowMinutes = 60): Promise<OutboundAbuseSignal[]> {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const metrics = await this.prisma.usageMetric.findMany({
      where: { recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    });

    const signals = this.scoreSignals(metrics);
    for (const sig of signals) {
      const report = await this.prisma.abuseReport.create({
        data: {
          targetVpsId: sig.vpsId,
          category: this.categoryForSignature(sig.signature),
          reason: `Automated detection: ${sig.signature} (score ${sig.score})`,
          source: 'automated',
          detectedSignature: sig.signature,
          details: sig.detail as any,
          status: 'RECEIVED',
        },
      });
      this.logger.warn(`Automated abuse detected on VPS ${sig.vpsId}: ${sig.signature}`);
      await this.notifySuperAdmins(report);
    }
    return signals;
  }

  /**
   * Suspend a VPS's *networking* only — preserves the VM and its data/evidence
   * while cutting egress/ingress pending investigation. SUPER_ADMIN only.
   */
  async suspendNetworking(vpsId: string, adminId?: string, reason?: string, impersonatedBy?: string) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.status === 'TERMINATED' || vps.status === 'DELETED') {
      throw new NotFoundException('VPS is already terminated');
    }
    const updated = await this.prisma.cloudDeployment.update({
      where: { id: vpsId },
      data: {
        networkSuspendedAt: new Date(),
        abuseStatus: 'SUSPENDED',
        status: 'SUSPENDED',
        abuseFlags: {
          ...((vps.abuseFlags as object) ?? {}),
          networkSuspended: true,
          suspendedReason: reason ?? 'abuse investigation',
          suspendedAt: new Date().toISOString(),
        },
      },
    });
    const suspendDetails: Record<string, unknown> = { reason, ip: vps.ipv4Address };
    if (impersonatedBy) suspendDetails.impersonatedBy = impersonatedBy;
    await this.prisma.auditLog.create({
      data: {
        action: 'VPS_NETWORK_SUSPEND',
        adminId,
        resource: `vps:${vpsId}`,
        details: suspendDetails as any,
        status: 'SUCCESS',
      },
    });
    return updated;
  }

  async listPtrRequests(status?: string) {
    return this.prisma.ptrRecordRequest.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async requestPtr(input: { userId: string; vpsId: string; hostname: string; ipAddress?: string }) {
    return this.prisma.ptrRecordRequest.create({
      data: {
        userId: input.userId,
        vpsId: input.vpsId,
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        status: 'REQUESTED',
      },
    });
  }

  async fulfillPtr(id: string, status: string, adminNote?: string, adminId?: string, impersonatedBy?: string) {
    const req = await this.prisma.ptrRecordRequest.update({
      where: { id },
      data: {
        status: status as any,
        adminNote,
        fulfilledAt: status === 'FULFILLED' ? new Date() : undefined,
      },
    });
    const ptrDetails: Record<string, unknown> = { status, adminNote };
    if (impersonatedBy) ptrDetails.impersonatedBy = impersonatedBy;
    await this.prisma.auditLog.create({
      data: {
        action: 'PTR_REQUEST_REVIEW',
        adminId,
        resource: `ptr:${id}`,
        details: ptrDetails as any,
        status: 'SUCCESS',
      },
    });
    return req;
  }

  // ---- internals ----

  private normalizeCategory(c?: string): AbuseCategory {
    const v = String(c ?? 'OTHER').toUpperCase();
    const allowed = ['SPAM', 'MALWARE', 'PHISHING', 'DDOS', 'CRYPTO_MINING', 'COPYRIGHT', 'OTHER'];
    return (allowed.includes(v) ? v : 'OTHER') as AbuseCategory;
  }

  private categoryForSignature(sig: string): AbuseCategory {
    if (sig.includes('smtp') || sig.includes('spam')) return 'SPAM' as AbuseCategory;
    if (sig.includes('cpu') || sig.includes('mining')) return 'CRYPTO_MINING' as AbuseCategory;
    if (sig.includes('ddos')) return 'DDOS' as AbuseCategory;
    return 'OTHER' as AbuseCategory;
  }

  /**
   * Score UsageMetric samples for abuse signatures.
   * Thresholds (tunable):
   *  - mass_outbound_smtp: > 50 SMTP-connection samples (port 25/587) in window
   *  - mass_outbound_distinct_ips: > 100 distinct destination IPs in window
   *  - sustained_cpu_mining: CPU >= 95% across >= 10 consecutive samples
   */
  private scoreSignals(metrics: Array<{ vpsId: string; metricType: string; value: number; unit?: string | null }>): OutboundAbuseSignal[] {
    const byVps = new Map<string, typeof metrics>();
    for (const m of metrics) {
      const arr = byVps.get(m.vpsId) ?? [];
      arr.push(m);
      byVps.set(m.vpsId, arr);
    }

    const signals: OutboundAbuseSignal[] = [];
    for (const [vpsId, ms] of byVps) {
      const userId = (ms[0] as any)?.userId ?? 'unknown';

      const smtp = ms.filter((m) => m.metricType === 'outbound_smtp_connections');
      if (smtp.length > 50) {
        signals.push({
          vpsId,
          userId,
          signature: 'mass_outbound_smtp',
          score: smtp.length,
          detail: { connections: smtp.length },
        });
      }

      const dstIps = new Set(ms.filter((m) => m.metricType === 'outbound_distinct_ips').map((m) => m.value));
      if (dstIps.size > 100) {
        signals.push({
          vpsId,
          userId,
          signature: 'mass_outbound_distinct_ips',
          score: dstIps.size,
          detail: { distinctIps: dstIps.size },
        });
      }

      const cpu = ms.filter((m) => m.metricType === 'cpu_percent');
      const sustained = cpu.filter((m) => m.value >= 95).length;
      if (cpu.length >= 10 && sustained >= 10) {
        signals.push({
          vpsId,
          userId,
          signature: 'sustained_cpu_mining',
          score: sustained,
          detail: { cpuSamples: cpu.length, sustained95pct: sustained },
        });
      }
    }
    return signals;
  }

  /** Notify every SUPER_ADMIN via an in-app Notification + audit log. */
  private async notifySuperAdmins(report: { id: string; category?: string; targetIp?: string | null; targetDomain?: string | null; targetVpsId?: string | null }) {
    let supers: Array<{ id: string }> = [];
    try {
      supers = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
    } catch {
      supers = [];
    }
    const target = report.targetIp ?? report.targetDomain ?? report.targetVpsId ?? 'unknown';
    const title = `Abuse report: ${report.category ?? 'OTHER'} (${target})`;
    const message = `New abuse report ${report.id} targeting ${target}. Review in the abuse dashboard.`;
    // Standalone, fire-and-forget Slack alert (Prompt 0.17 follow-up).
    // Notifications/AuditLog alone require someone to be watching the
    // dashboard; abuse response is time-sensitive, so push to Slack too.
    // Intentionally minimal + self-contained — refactor into the shared
    // 6.3a alerting infra once that exists.
    this.sendSlackAbuseAlert(title, message, target, report.id).catch(() => {});

    for (const s of supers) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: s.id,
            title,
            message,
            type: 'error',
            category: 'abuse',
            link: '/voidcloud/admin/abuse',
            metadata: { reportId: report.id } as any,
          },
        });
      } catch (e) {
        this.logger.error(`Failed to notify SUPER_ADMIN ${s.id}: ${(e as Error).message}`);
      }
    }
    await this.prisma.auditLog
      .create({
        data: {
          action: 'ABUSE_REPORT_CREATED',
          resource: `abuse_report:${report.id}`,
          details: { category: report.category, target } as any,
          status: 'SUCCESS',
        },
      })
      .catch(() => {});
  }

  /**
   * Minimal standalone Slack alert for abuse events (Prompt 0.17 follow-up).
   * Direct webhook POST — no shared infra dependency. No-ops when
   * SLACK_WEBHOOK_URL is unset, and never throws into the caller (an alert
   * failure must not break abuse-report intake). Swap for 6.3a's alerting
   * service later without touching call sites.
   */
  private async sendSlackAbuseAlert(title: string, message: string, target: string, reportId: string) {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) return;
    const body = {
      text: `:rotating_light: ${title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${title}*\n${message}\nTarget: \`${target}\`\nReport: \`${reportId}\``,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Review in dashboard' },
              url: `${process.env.APP_URL ?? 'https://voidcloud.cc.cd'}/voidcloud/admin/abuse`,
            },
          ],
        },
      ],
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        this.logger.warn(`Slack abuse alert failed: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      this.logger.warn(`Slack abuse alert error: ${(e as Error).message}`);
    }
  }
}
