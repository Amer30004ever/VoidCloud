import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { HealthCheckService } from './health-check.service';
import { HealthCheckScheduler } from './health-check.scheduler';

/**
 * GET /health   → cached snapshot from the last scheduled probe (no fresh pings).
 * POST /health/check-now → SUPER_ADMIN "force check" — runs a fresh probe round.
 * POST /health/rollup    → SUPER_ADMIN manual retention run for debugging.
 */
@Controller('monitoring/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiTags('Health Checks')
@ApiBearerAuth()
export class HealthCheckController {
  constructor(
    private readonly svc: HealthCheckService,
    private readonly scheduler: HealthCheckScheduler,
  ) {}

  @Get('health')
  health() {
    return this.svc.getLatestCached();
  }

  @Get('health/history')
  history(@Query('hours') hours?: string) {
    const h = hours ? Number(hours) : 24;
    return this.svc.getHistory(h);
  }

  @Post('health/check-now')
  forceCheck() {
    return this.svc.probeAllAndPersist();
  }

  @Post('health/rollup')
  runRollup() {
    return this.scheduler.rollup();
  }
}
