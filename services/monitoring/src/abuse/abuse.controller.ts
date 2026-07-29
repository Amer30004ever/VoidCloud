import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AbuseService } from './abuse.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
type ReqWithIp = { headers: Record<string, string | string[] | undefined>; ip?: string };

/**
 * Abuse / AUP controller (Prompt 0.17).
 *
 *  - POST /abuse/report  → PUBLIC, unauthenticated intake (third-party reports).
 *  - everything else    → SUPER_ADMIN only (review, suspend networking, PTR).
 */
@Controller('abuse')
@ApiTags('Abuse')
@ApiBearerAuth()
export class AbuseController {
  constructor(private readonly abuse: AbuseService) {}

  @Public()
  @Post('report')
  async report(@Body() body: any, @Req() req: ReqWithIp) {
    const reporterIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? (req as any).ip
      ?? undefined;
    return this.abuse.submitReport(
      {
        reporterName: body.reporterName,
        reporterEmail: body.reporterEmail,
        targetIp: body.targetIp,
        targetDomain: body.targetDomain,
        targetVpsId: body.targetVpsId,
        category: body.category,
        reason: body.reason,
        evidence: body.evidence,
        reporterIp,
      },
      reporterIp,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get('reports')
  listReports(@Query('status') status?: string) {
    return this.abuse.listReports(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Put('reports/:id')
  resolveReport(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: { id: string; impersonatedBy?: string },
  ) {
    return this.abuse.resolveReport(id, body.status, user.id, user.impersonatedBy);
  }

  /** Run the outbound-abuse detector on demand (also scheduled server-side). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post('detect')
  detect(@Body() body: { windowMinutes?: number } = {}) {
    return this.abuse.detectOutboundAbuse(body.windowMinutes ?? 60);
  }

  /** Suspend a VPS's networking pending investigation (preserves evidence). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post('vps/:id/suspend-network')
  suspendNetwork(
    @Param('id') id: string,
    @Body() body: { reason?: string } = {},
    @CurrentUser() user: { id: string; impersonatedBy?: string },
  ) {
    return this.abuse.suspendNetworking(id, user.id, body.reason, user.impersonatedBy);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get('ptr')
  listPtr(@Query('status') status?: string) {
    return this.abuse.listPtrRequests(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @Post('ptr')
  requestPtr(@Body() body: { vpsId: string; hostname: string; ipAddress?: string }, @CurrentUser() user: { id: string }) {
    return this.abuse.requestPtr({
      userId: user.id,
      vpsId: body.vpsId,
      hostname: body.hostname,
      ipAddress: body.ipAddress,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Put('ptr/:id')
  reviewPtr(
    @Param('id') id: string,
    @Body() body: { status: string; adminNote?: string },
    @CurrentUser() user: { id: string; impersonatedBy?: string },
  ) {
    return this.abuse.fulfillPtr(id, body.status, body.adminNote, user.id, user.impersonatedBy);
  }
}
