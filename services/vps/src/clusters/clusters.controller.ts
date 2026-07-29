import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  ClustersService,
  ClusterInput,
  ScheduleRequest,
  Actor,
} from './clusters.service';

/**
 * Super-admin-only Proxmox cluster registry.
 * Endpoints under /clusters/*. Every mutating action and every
 * credential-reveal action is audit-logged inside ClustersService.
 */
@Controller('clusters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiTags('Clusters')
@ApiBearerAuth()
export class ClustersController {
  constructor(private readonly clusters: ClustersService) {}

  @Get()
  list() {
    return this.clusters.list();
  }

  @Post()
  create(@Body() body: ClusterInput, @CurrentUser() user: Actor) {
    return this.clusters.create(body, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<ClusterInput> & { status?: string },
    @CurrentUser() user: Actor,
  ) {
    return this.clusters.update(id, body, user);
  }

  /**
   * Delete a cluster. Blocked when active VMs reference it unless
   * `?force=true` is passed AND `confirmName` in the body matches the
   * cluster's name exactly. Prefer PUT /:id/disable for reversible removal.
   */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @Body() body: { confirmName?: string } | undefined,
    @CurrentUser() user: Actor,
  ) {
    return this.clusters.remove(id, user, {
      force: force === 'true' || force === '1',
      confirmName: body?.confirmName,
    });
  }

  /** Mark a cluster DISABLED — scheduler skips it, existing VMs untouched. */
  @Put(':id/disable')
  disable(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.clusters.setEnabled(id, false, user);
  }

  /** Re-enable a previously disabled cluster. */
  @Put(':id/enable')
  enable(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.clusters.setEnabled(id, true, user);
  }

  @Post(':id/test')
  test(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.clusters.testAndRefresh(id, user);
  }

  /** Reveal decrypted API credentials for debugging. Always audit-logged. */
  @Get(':id/credentials')
  reveal(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.clusters.revealCredentials(id, user);
  }

  @Post('schedule')
  schedule(@Body() body: ScheduleRequest, @CurrentUser() user: Actor) {
    return this.clusters.schedule(body, user);
  }
}
