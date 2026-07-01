import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('usage')
  usage() {
    return this.analytics.usage();
  }

  @Get('revenue')
  revenue() {
    return this.analytics.revenue();
  }

  @Get('forecast')
  forecast() {
    return this.analytics.forecast();
  }

  @Get('usage/vps')
  vpsUsage() {
    return this.analytics.vpsUsage();
  }

  @Get('usage/whatsapp')
  whatsappUsage() {
    return this.analytics.whatsappUsage();
  }

  @Get('export')
  export() {
    return this.analytics.exportCsv();
  }
}
