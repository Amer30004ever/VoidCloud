import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ManagedK8sService } from './managed-k8s.service';

@Controller('managed/kubernetes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Managed Kubernetes')
@ApiBearerAuth()
export class ManagedK8sController {
  constructor(private readonly k8s: ManagedK8sService) {}

  @Get('versions')
  versions() {
    return this.k8s.versions();
  }

  @Get('clusters')
  @ApiOperation({ summary: 'List managed Kubernetes clusters' })
  list(@Req() req: any) {
    return this.k8s.list(req.user.id);
  }

  @Post('clusters')
  @ApiOperation({ summary: 'Create a managed Kubernetes cluster' })
  create(@Req() req: any, @Body() body: any) {
    return this.k8s.createCluster(req.user.id, body);
  }

  @Get('clusters/:id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.k8s.get(req.user.id, id);
  }

  @Get('clusters/:id/kubeconfig')
  @ApiOperation({ summary: 'Download the cluster kubeconfig (owner only)' })
  kubeconfig(@Req() req: any, @Param('id') id: string) {
    return this.k8s.kubeconfig(req.user.id, id);
  }

  @Post('clusters/:id/node-pools')
  addPool(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.k8s.addNodePool(req.user.id, id, body);
  }

  @Patch('clusters/:id/node-pools/:poolId')
  @ApiOperation({ summary: 'Scale a node pool' })
  scalePool(
    @Req() req: any,
    @Param('id') id: string,
    @Param('poolId') poolId: string,
    @Body() body: { nodeCount: number },
  ) {
    return this.k8s.scaleNodePool(req.user.id, id, poolId, body.nodeCount);
  }

  @Delete('clusters/:id/node-pools/:poolId')
  deletePool(@Req() req: any, @Param('id') id: string, @Param('poolId') poolId: string) {
    return this.k8s.deleteNodePool(req.user.id, id, poolId);
  }

  @Delete('clusters/:id')
  destroy(@Req() req: any, @Param('id') id: string) {
    return this.k8s.destroy(req.user.id, id);
  }
}
