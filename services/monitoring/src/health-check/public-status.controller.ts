import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { HealthCheckService } from './health-check.service';

/**
 * Unauthenticated status feed for the public /status page.
 *
 * Serves the cached snapshot produced by the 30s server-side probe loop —
 * it never triggers outbound pings, so public traffic cannot amplify probes.
 * The payload is sanitized (no internal hostnames, ports or raw error text).
 */
@Controller('monitoring/status')
@ApiTags('Public Status')
export class PublicStatusController {
  constructor(private readonly svc: HealthCheckService) {}

  @Public()
  @Get('services')
  @ApiOperation({ summary: 'Public per-service readiness snapshot' })
  @ApiResponse({ status: 200, description: 'Sanitized readiness of each platform component' })
  services() {
    return this.svc.getPublicStatus();
  }
}
