import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@ApiTags('Monitoring')
@ApiBearerAuth()
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get('cluster/nodes')
  @ApiOperation({ summary: 'Get cluster nodes' })
  @ApiResponse({ status: 200, description: 'Cluster nodes' })
  nodes() {
    return this.monitoring.clusterNodes();
  }

  @Get('cluster/pods')
  pods() {
    return this.monitoring.clusterPods();
  }

  @Get('namespaces')
  namespaces() {
    return this.monitoring.namespaces();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return { status: 'ok' };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get monitoring metrics' })
  @ApiResponse({ status: 200, description: 'Metrics data' })
  metrics() {
    return this.monitoring.metrics();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get alerts' })
  @ApiResponse({ status: 200, description: 'Alerts list' })
  alerts() {
    return this.monitoring.alerts();
  }

  @Post('alerts')
  @Roles(Role.SUPER_ADMIN)
  createAlert(@Body() body: Record<string, unknown>) {
    return this.monitoring.createAlert(body);
  }

  @Get('rate-limits')
  @Roles(Role.SUPER_ADMIN)
  async rateLimits() {
    return this.monitoring.getRateLimitStats();
  }

  @Post('rate-limits/block')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Block an IP' })
  @ApiResponse({ status: 201, description: 'IP blocked' })
  async blockIP(@Body() body: { ip: string; reason?: string; isPermanent?: boolean; expiresAt?: string }) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    return this.monitoring.blockIP(body.ip, body.reason, body.isPermanent, expiresAt);
  }

  @Delete('rate-limits/block/:ip')
  @Roles(Role.SUPER_ADMIN)
  async unblockIP(@Param('ip') ip: string) {
    return this.monitoring.unblockIP(ip);
  }

  @Get('traces/:requestId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async trace(@Param('requestId') requestId: string) {
    return this.monitoring.trace(requestId);
  }
}
