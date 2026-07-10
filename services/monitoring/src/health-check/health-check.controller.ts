import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { HealthCheckService } from './health-check.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

/**
 * Real-time probe of all 13 microservices for the Super Admin health dashboard.
 * Poll from the frontend every 30s. SUPER_ADMIN only — exposes internal
 * service topology and status.
 */
@Controller('monitoring/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class HealthCheckController {
  constructor(private readonly svc: HealthCheckService) {}

  @Get('health')
  health() {
    return this.svc.probeAll();
  }
}
