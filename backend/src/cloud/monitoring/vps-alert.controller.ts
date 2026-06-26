import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VpsAlertService, CreateAlertRuleDto } from './vps-alert.service';
import { Role } from '@prisma/client';

interface AuthedRequest {
  user: { id: string; role: Role; email: string };
}

@ApiTags('Cloud / Alerts')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('cloud/alerts')
export class VpsAlertController {
  constructor(private alerts: VpsAlertService) {}

  @Get()
  list(@Req() req: AuthedRequest, @Query('vpsId') vpsId?: string) {
    if (vpsId) return this.alerts.listForVps(req.user.id, vpsId);
    return this.alerts.listForUser(req.user.id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateAlertRuleDto) {
    return this.alerts.createRule(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: Partial<CreateAlertRuleDto>,
  ) {
    return this.alerts.updateRule(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.alerts.deleteRule(req.user.id, id);
  }

  @Get('vps/:vpsId/current')
  current(@Req() req: AuthedRequest, @Param('vpsId') vpsId: string) {
    return this.alerts.currentMetrics(req.user.id, vpsId);
  }

  @Post('run-checks')
  runChecks() {
    // Manual trigger for ops/debug; internal cron also runs every 5min.
    return this.alerts.runChecks();
  }
}
