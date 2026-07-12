import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../monitoring/guards/jwt-auth.guard';
import { RolesGuard } from '../monitoring/guards/roles.guard';
import { Roles } from '../monitoring/decorators/roles.decorator';
import { HealthCheckService } from './health-check.service';
import { HealthCheckScheduler } from './health-check.scheduler';

/**
 * GET /health   → cached snapshot from the last scheduled probe (no fresh pings).
 * POST /health/check-now → SUPER_ADMIN "force check" — runs a fresh probe round.
 * POST /health/rollup    → SUPER_ADMIN manual retention run for debugging.
 */
@Controller('monitoring/services')
export class HealthCheckController {
  constructor(
    private readonly svc: HealthCheckService,
    private readonly scheduler: HealthCheckScheduler,
  ) {}

  @Get('health')
  health() {
    return this.svc.getLatestCached();
  }

  @Post('health/check-now')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  forceCheck() {
    return this.svc.probeAllAndPersist();
  }

  @Post('health/rollup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  runRollup() {
    return this.scheduler.rollup();
  }
}
