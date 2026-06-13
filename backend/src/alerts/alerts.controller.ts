import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertsService } from './alerts.service';
import { AlertType, AlertSeverity } from '@prisma/client';

@ApiTags('Alerts')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private alertsService: AlertsService) {}

  /**
   * POST /alerts/rules
   * Create alert rule
   */
  @Post('rules')
  @ApiOperation({ summary: 'Create alert rule' })
  async createAlertRule(
    @Body()
    body: {
      name: string;
      type: AlertType;
      severity?: AlertSeverity;
      namespace?: string;
      threshold?: number;
      duration?: number;
      notifyEmail?: boolean;
      notifySlack?: boolean;
      webhookUrl?: string;
      description?: string;
    },
  ) {
    const rule = await this.alertsService.createAlertRule(body);
    return { success: true, rule };
  }

  /**
   * GET /alerts/rules
   * Get all alert rules
   */
  @Get('rules')
  @ApiOperation({ summary: 'Get all alert rules' })
  async getAlertRules(@Query('enabled') enabled?: string) {
    const enabledFilter = enabled ? enabled === 'true' : undefined;
    const rules = await this.alertsService.getAllAlertRules(enabledFilter);
    return { rules };
  }

  /**
   * GET /alerts/rules/:id
   * Get alert rule by ID
   */
  @Get('rules/:id')
  @ApiOperation({ summary: 'Get alert rule by ID' })
  async getAlertRule(@Param('id') id: string) {
    const rule = await this.alertsService.getAlertRuleById(id);
    return { rule };
  }

  /**
   * PUT /alerts/rules/:id
   * Update alert rule
   */
  @Put('rules/:id')
  @ApiOperation({ summary: 'Update alert rule' })
  async updateAlertRule(@Param('id') id: string, @Body() body: any) {
    const rule = await this.alertsService.updateAlertRule(id, body);
    return { success: true, rule };
  }

  /**
   * DELETE /alerts/rules/:id
   * Delete alert rule
   */
  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteAlertRule(@Param('id') id: string) {
    await this.alertsService.deleteAlertRule(id);
    return { success: true, message: 'Alert rule deleted' };
  }

  /**
   * GET /alerts/active?namespace=default
   * Get all active alerts
   */
  @Get('active')
  @ApiOperation({ summary: 'Get active alerts' })
  async getActiveAlerts(@Query('namespace') namespace?: string) {
    const alerts = await this.alertsService.getActiveAlerts(namespace);
    return {
      count: alerts.length,
      alerts,
    };
  }

  /**
   * GET /alerts
   * Get all alerts (active and resolved)
   */
  @Get()
  @ApiOperation({ summary: 'Get all alerts' })
  async getAllAlerts(
    @Query('namespace') namespace?: string,
    @Query('limit') limit?: string,
  ) {
    const alerts = await this.alertsService.getAllAlerts(
      namespace,
      limit ? parseInt(limit) : 100,
    );
    return {
      count: alerts.length,
      alerts,
    };
  }

  /**
   * GET /alerts/:id
   * Get alert by ID (implicitly gets details)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get alert by ID' })
  async getAlertById(@Param('id') id: string) {
    const alerts = await this.alertsService.getAllAlerts();
    const alert = alerts.find((a) => a.id === id);
    return { alert };
  }

  /**
   * PUT /alerts/:id/acknowledge
   * Acknowledge alert
   */
  @Put(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  async acknowledgeAlert(@Param('id') id: string) {
    const alert = await this.alertsService.acknowledgeAlert(id);
    return { success: true, alert };
  }

  /**
   * PUT /alerts/:id/resolve
   * Resolve alert
   */
  @Put(':id/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  async resolveAlert(@Param('id') id: string) {
    const alert = await this.alertsService.resolveAlert(id);
    return { success: true, alert };
  }

  /**
   * GET /alerts/stats
   * Get alert statistics
   */
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get alert statistics' })
  async getAlertStats(@Query('namespace') namespace?: string) {
    const stats = await this.alertsService.getAlertStats(namespace);
    return stats;
  }
}
