import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Public()
  @Get('system/status')
  @ApiOperation({ summary: 'Get public system status' })
  async getSystemStatus() {
    return this.dashboardService.getSystemStatus();
  }

  @Public()
  @Get('namespaces/running')
  @ApiOperation({ summary: 'Get public running namespaces with pod counts' })
  async getRunningNamespaces() {
    return this.dashboardService.getRunningNamespaces();
  }

  @Public()
  @Get('dashboard/metrics')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  async getDashboardMetrics() {
    return this.dashboardService.getDashboardMetrics();
  }

  @Public()
  @Get('dashboard/realtime')
  @ApiOperation({ summary: 'Get realtime dashboard transport configuration' })
  getRealtimeConfig() {
    return this.dashboardService.getRealtimeConfig();
  }

  @Public()
  @Get('pods')
  @ApiOperation({ summary: 'Get pod status list' })
  async getPods() {
    return this.dashboardService.getPods();
  }

  @Public()
  @Get('services/status')
  @ApiOperation({ summary: 'Get services status list' })
  async getServiceStatus() {
    return this.dashboardService.getServiceStatus();
  }

  @Public()
  @Get('activity/recent')
  @ApiOperation({ summary: 'Get recent activity feed' })
  async getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }
}
