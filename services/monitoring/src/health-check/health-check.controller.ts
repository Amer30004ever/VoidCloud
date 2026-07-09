import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';

@Controller('monitoring/services')
export class HealthCheckController {
  constructor(private readonly svc: HealthCheckService) {}

  /** Real-time probe of all 13 microservices. Poll from Super Admin every 30s. */
  @Get('health')
  health() {
    return this.svc.probeAll();
  }
}
