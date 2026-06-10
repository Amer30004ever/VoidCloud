import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformService } from './platform.service';

@ApiTags('Platform')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('observability')
  @ApiOperation({ summary: 'Observability tool links' })
  getObservability() {
    return this.platformService.getObservabilityLinks();
  }

  @Get('gitops/status')
  @ApiOperation({ summary: 'GitOps sync status' })
  getGitOpsStatus() {
    return this.platformService.getGitOpsStatus();
  }

  @Post('gitops/sync')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Force GitOps sync' })
  forceSync(@CurrentUser() user: { id: string }) {
    return this.platformService.forceGitOpsSync(user.id);
  }

  @Get('topology')
  @ApiOperation({ summary: 'Service topology map' })
  getTopology() {
    return this.platformService.getTopology();
  }

  @Get('capacity')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Capacity planning forecast' })
  getCapacity() {
    return this.platformService.getCapacityForecast();
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Namespace/pod heatmap' })
  getHeatmap() {
    return this.platformService.getHeatmap();
  }

  @Get('clusters')
  @ApiOperation({ summary: 'List configured clusters' })
  getClusters() {
    return this.platformService.getClusters();
  }

  @Post('clusters')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Register cluster' })
  createCluster(@Body() body: {
    name: string;
    context: string;
    environment?: string;
    kubeconfigPath?: string;
    apiServer?: string;
    isDefault?: boolean;
  }) {
    return this.platformService.createCluster(body);
  }

  @Post('clusters/:id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Switch active cluster' })
  activateCluster(@Param('id') id: string) {
    return this.platformService.activateCluster(id);
  }

  @Get('metrics/snapshot')
  @ApiOperation({ summary: 'Live metrics snapshot' })
  getMetricsSnapshot() {
    return this.platformService.getLiveMetricsSnapshot();
  }
}
