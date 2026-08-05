import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SlaCreditService } from './sla-credit.service';

@Controller('sla-credits')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('SLA Credits')
@ApiBearerAuth()
export class SlaCreditController {
    constructor(private readonly slaCredits: SlaCreditService) { }

    @Get()
    @ApiOperation({ summary: 'List SLA credits issued to the current tenant' })
    async list(@Req() req: any, @Query('limit') limit?: string) {
        const parsed = limit ? parseInt(limit, 10) : 50;
        return this.slaCredits.listForUser(
            req.user.id,
            Number.isFinite(parsed) ? parsed : 50,
        );
    }

    @Post('run')
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Run the SLA credit sweep for a period — SUPER_ADMIN only' })
    async run(@Body() body: { periodStart?: string; periodEnd?: string }) {
        const period =
            body?.periodStart && body?.periodEnd
                ? {
                    periodStart: new Date(body.periodStart),
                    periodEnd: new Date(body.periodEnd),
                }
                : undefined;
        return this.slaCredits.runForPeriod(period);
    }
}
