import { Body, Controller, Get, Post } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get('cluster/nodes')
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

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('metrics')
  metrics() {
    return this.monitoring.metrics();
  }

  @Get('alerts')
  alerts() {
    return this.monitoring.alerts();
  }

  @Post('alerts')
  createAlert(@Body() body: Record<string, unknown>) {
    return this.monitoring.createAlert(body);
  }
}
