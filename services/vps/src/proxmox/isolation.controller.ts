import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsolationReconcilerService } from './isolation-reconciler.service';

/**
 * Super-admin-only visibility + repair for tenant VM network isolation
 * (Prompt 0.15). Read the report to answer whether any pre-existing VM
 * is still running without the isolation ruleset.
 */
@ApiTags('vps-isolation')
@ApiBearerAuth()
@Controller('vps/isolation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class IsolationController {
  constructor(private readonly reconciler: IsolationReconcilerService) {}

  @Get('report')
  @ApiOperation({ summary: 'Isolation compliance report for every tenant VM' })
  report() {
    return this.reconciler.report();
  }

  @Post('reconcile')
  @ApiOperation({ summary: 'Backfill the isolation ruleset onto legacy VMs' })
  reconcile(@Query('dryRun') dryRun?: string) {
    return this.reconciler.reconcile(dryRun === 'true');
  }
}
