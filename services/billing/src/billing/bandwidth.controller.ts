import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';
import { BandwidthService } from './bandwidth.service';

@Controller('bandwidth')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Bandwidth')
@ApiBearerAuth()
export class BandwidthController {
  constructor(private readonly bandwidth: BandwidthService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Current-period bandwidth usage for the caller VPS fleet' })
  async usage(@Req() req: any) {
    return this.bandwidth.currentUsageForUser(req.user.id);
  }

  @Get('overages')
  @ApiOperation({ summary: 'Historical bandwidth overage charges for the caller' })
  async overages(@Req() req: any, @Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    return this.bandwidth.listOveragesForUser(
      req.user.id,
      Number.isFinite(parsed) ? parsed : 50,
    );
  }

  @Post('samples')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ingest a hypervisor NIC counter sample — SUPER_ADMIN only' })
  async ingest(
    @Body()
    body: { vpsId: string; rxBytes: string | number; txBytes: string | number; sampledAt?: string },
  ) {
    return this.bandwidth.recordSample(body.vpsId, {
      rxBytes: BigInt(body.rxBytes ?? 0),
      txBytes: BigInt(body.txBytes ?? 0),
      sampledAt: body.sampledAt ? new Date(body.sampledAt) : undefined,
    });
  }

  @Post('run')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Run the bandwidth overage sweep for a period — SUPER_ADMIN only' })
  async run(@Body() body: { periodStart?: string; periodEnd?: string }) {
    const period =
      body?.periodStart && body?.periodEnd
        ? { periodStart: new Date(body.periodStart), periodEnd: new Date(body.periodEnd) }
        : undefined;
    return this.bandwidth.runForPeriod(period);
  }
}
