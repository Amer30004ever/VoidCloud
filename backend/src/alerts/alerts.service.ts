import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KubernetesService } from '../kubernetes/kubernetes.service';
import { LogsService } from '../logs/logs.service';
import { AlertType, AlertSeverity } from '@prisma/client';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private alertCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private kubernetesService: KubernetesService,
    private logsService: LogsService,
  ) {
    this.startAlertMonitoring();
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(data: {
    name: string;
    type: AlertType;
    namespace?: string;
    severity?: AlertSeverity;
    threshold?: number;
    duration?: number;
    notifyEmail?: boolean;
    notifySlack?: boolean;
    webhookUrl?: string;
    description?: string;
  }) {
    return this.prisma.alertRule.create({
      data: {
        ...data,
        severity: data.severity || AlertSeverity.WARNING,
      },
    });
  }

  /**
   * Get all alert rules
   */
  async getAllAlertRules(enabled?: boolean) {
    const where = enabled !== undefined ? { enabled } : {};
    return this.prisma.alertRule.findMany({
      where,
      include: { alerts: true },
    });
  }

  /**
   * Get alert rule by ID
   */
  async getAlertRuleById(id: string) {
    return this.prisma.alertRule.findUnique({
      where: { id },
      include: { alerts: true },
    });
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(id: string, data: any) {
    return this.prisma.alertRule.update({
      where: { id },
      data,
      include: { alerts: true },
    });
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(id: string) {
    return this.prisma.alertRule.delete({
      where: { id },
    });
  }

  /**
   * Get all active alerts
   */
  async getActiveAlerts(namespace?: string) {
    const where: any = { status: 'FIRING' };
    if (namespace) where.namespace = namespace;

    return this.prisma.alert.findMany({
      where,
      include: { rule: true },
      orderBy: { firedAt: 'desc' },
    });
  }

  /**
   * Get all alerts (active and resolved)
   */
  async getAllAlerts(namespace?: string, limit: number = 100) {
    const where: any = {};
    if (namespace) where.namespace = namespace;

    return this.prisma.alert.findMany({
      where,
      include: { rule: true },
      orderBy: { firedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }

  /**
   * Fire an alert (create alert record)
   */
  private async fireAlert(
    ruleId: string,
    type: AlertType,
    severity: AlertSeverity,
    namespace: string,
    resourceName: string,
    resourceType: string,
    message: string,
    details?: any,
  ) {
    // Check if similar alert already exists and is firing
    const existing = await this.prisma.alert.findFirst({
      where: {
        ruleId,
        namespace,
        resourceName,
        resourceType,
        status: 'FIRING',
      },
    });

    if (existing) {
      this.logger.debug(
        `Alert already exists for ${resourceType}/${resourceName} in ${namespace}`,
      );
      return existing;
    }

    // Create new alert
    const alert = await this.prisma.alert.create({
      data: {
        ruleId,
        type,
        severity,
        namespace,
        resourceName,
        resourceType,
        message,
        details: details || {},
      },
      include: { rule: true },
    });

    this.logger.warn(
      `[${severity}] ${type}: ${resourceName} in ${namespace} - ${message}`,
    );

    // Send notifications
    await this.sendAlertNotifications(alert);

    return alert;
  }

  /**
   * Send notifications for alert
   */
  private async sendAlertNotifications(alert: any) {
    try {
      const rule = alert.rule;

      if (rule.notifyEmail) {
        // TODO: Send email notification
        this.logger.debug(`Email notification for alert ${alert.id}`);
      }

      if (rule.notifySlack) {
        // TODO: Send Slack notification
        this.logger.debug(`Slack notification for alert ${alert.id}`);
      }

      if (rule.webhookUrl) {
        // TODO: Send webhook notification
        this.logger.debug(`Webhook notification for alert ${alert.id}`);
      }

      // Mark as notification sent
      await this.prisma.alert.update({
        where: { id: alert.id },
        data: { notificationSent: true },
      });
    } catch (error) {
      this.logger.error(`Failed to send notifications: ${error.message}`);
    }
  }

  /**
   * Check for pod crashes
   */
  private async checkPodCrashes() {
    try {
      const pods = await this.kubernetesService.getPods();
      const rule = await this.prisma.alertRule.findFirst({
        where: { type: AlertType.POD_CRASH, enabled: true },
      });

      if (!rule) return;

      for (const pod of pods) {
        const namespace = pod.metadata?.namespace;
        const podName = pod.metadata?.name;
        const containerStatuses = pod.status?.containerStatuses || [];

        for (const status of containerStatuses) {
          if (
            status.state?.terminated &&
            status.state.terminated.reason === 'Error'
          ) {
            await this.fireAlert(
              rule.id,
              AlertType.POD_CRASH,
              rule.severity,
              namespace,
              podName,
              'Pod',
              `Pod crashed with reason: ${status.state.terminated.reason}`,
              {
                exitCode: status.state.terminated.exitCode,
                message: status.state.terminated.message,
              },
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error checking pod crashes: ${error.message}`);
    }
  }

  /**
   * Check for pod restarts
   */
  private async checkPodRestarts() {
    try {
      const pods = await this.kubernetesService.getPods();
      const rule = await this.prisma.alertRule.findFirst({
        where: { type: AlertType.POD_RESTART, enabled: true },
      });

      if (!rule) return;

      for (const pod of pods) {
        const namespace = pod.metadata?.namespace;
        const podName = pod.metadata?.name;
        const containerStatuses = pod.status?.containerStatuses || [];

        for (const status of containerStatuses) {
          if (status.restartCount > 0) {
            await this.fireAlert(
              rule.id,
              AlertType.POD_RESTART,
              rule.severity,
              namespace,
              podName,
              'Pod',
              `Pod restarted ${status.restartCount} times`,
              {
                restartCount: status.restartCount,
                lastState: status.lastState,
              },
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error checking pod restarts: ${error.message}`);
    }
  }

  /**
   * Check for pending pods
   */
  private async checkPendingPods() {
    try {
      const pods = await this.kubernetesService.getPods();
      const rule = await this.prisma.alertRule.findFirst({
        where: { type: AlertType.POD_PENDING, enabled: true },
      });

      if (!rule) return;

      for (const pod of pods) {
        const phase = pod.status?.phase;

        if (phase === 'Pending') {
          const namespace = pod.metadata?.namespace;
          const podName = pod.metadata?.name;

          // Check if pending for more than 5 minutes
          const createdAt = new Date(pod.metadata?.creationTimestamp);
          const pendingDuration =
            (Date.now() - createdAt.getTime()) / 1000 / 60;

          if (pendingDuration > 5) {
            await this.fireAlert(
              rule.id,
              AlertType.POD_PENDING,
              rule.severity,
              namespace,
              podName,
              'Pod',
              `Pod has been pending for ${Math.floor(pendingDuration)} minutes`,
              {
                conditions: pod.status?.conditions,
              },
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error checking pending pods: ${error.message}`);
    }
  }

  /**
   * Start monitoring for alerts
   */
  private startAlertMonitoring() {
    // Run checks every 30 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkPodCrashes();
      this.checkPodRestarts();
      this.checkPendingPods();
    }, 30000);

    this.logger.log('Alert monitoring started');
  }

  /**
   * Stop monitoring for alerts
   */
  onModuleDestroy() {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.logger.log('Alert monitoring stopped');
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(namespace?: string) {
    const activeAlerts = await this.getActiveAlerts(namespace);
    const allAlerts = await this.getAllAlerts(namespace, 1000);

    const statsByType = {};
    const statsBySeverity = {};

    allAlerts.forEach((alert) => {
      statsByType[alert.type] = (statsByType[alert.type] || 0) + 1;
      statsBySeverity[alert.severity] =
        (statsBySeverity[alert.severity] || 0) + 1;
    });

    return {
      totalAlerts: allAlerts.length,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: allAlerts.filter((a) => a.status === 'RESOLVED').length,
      statsByType,
      statsBySeverity,
    };
  }
}
