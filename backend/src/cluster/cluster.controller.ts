import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ClusterService } from './cluster.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('Cluster')
@Controller('cluster')
@UseGuards(JwtAuthGuard)
export class ClusterController {
  constructor(private readonly clusterService: ClusterService) {}

  @Get('nodes')
  @ApiOperation({ summary: 'Get all cluster nodes with detailed metrics' })
  @ApiOkResponse({
    description: 'Returns cluster nodes with CPU, memory, disk metrics',
  })
  async getNodes() {
    return this.clusterService.getNodes();
  }

  @Get('nodes/:name')
  @ApiOperation({ summary: 'Get details for a specific node' })
  async getNodeDetails(@Param('name') name: string) {
    return this.clusterService.getNodeDetails(name);
  }

  @Get('pods/:node')
  @ApiOperation({ summary: 'Get pods running on a specific node' })
  async getNodePods(@Param('node') nodeName: string) {
    return this.clusterService.getNodePods(nodeName);
  }

  @Get('quotas')
  @ApiOperation({ summary: 'Get resource quotas for all namespaces' })
  async getQuotas() {
    return this.clusterService.getQuotas();
  }

  @Post('quotas')
  @ApiOperation({ summary: 'Create or update resource quota for a namespace' })
  async setQuota(@Body() quotaData: any) {
    return this.clusterService.setQuota(quotaData);
  }

  @Get('network-policies')
  @ApiOperation({ summary: 'Get all network policies' })
  async getNetworkPolicies() {
    return this.clusterService.getNetworkPolicies();
  }

  @Post('network-policies')
  @ApiOperation({ summary: 'Create network policy' })
  async createNetworkPolicy(@Body() policyData: any) {
    return this.clusterService.createNetworkPolicy(policyData);
  }

  @Get('storage-classes')
  @ApiOperation({ summary: 'Get all storage classes' })
  async getStorageClasses() {
    return this.clusterService.getStorageClasses();
  }

  @Get('persistent-volumes')
  @ApiOperation({ summary: 'Get all persistent volumes' })
  async getPersistentVolumes() {
    return this.clusterService.getPersistentVolumes();
  }

  @Get('persistent-volume-claims')
  @ApiOperation({ summary: 'Get all persistent volume claims' })
  async getPersistentVolumeClaims() {
    return this.clusterService.getPersistentVolumeClaims();
  }

  @Get('events')
  @ApiOperation({ summary: 'Get cluster events with filtering' })
  async getEvents(
    @Query('namespace') namespace?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clusterService.getEvents(
      namespace,
      type,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('helm-releases')
  @ApiOperation({ summary: 'Get all Helm releases' })
  async getHelmReleases() {
    return this.clusterService.getHelmReleases();
  }

  @Post('helm-releases')
  @ApiOperation({ summary: 'Install or upgrade Helm release' })
  async installHelmRelease(@Body() releaseData: any) {
    return this.clusterService.installHelmRelease(releaseData);
  }

  @Delete('helm-releases/:name')
  @ApiOperation({ summary: 'Uninstall Helm release' })
  async uninstallHelmRelease(
    @Param('name') name: string,
    @Query('namespace') namespace: string,
  ) {
    return this.clusterService.uninstallHelmRelease(name, namespace);
  }

  @Post('nodes/:name/drain')
  @ApiOperation({ summary: 'Drain a node for maintenance' })
  async drainNode(@Param('name') nodeName: string) {
    return this.clusterService.drainNode(nodeName);
  }

  @Post('nodes/:name/uncordon')
  @ApiOperation({ summary: 'Uncordon a node after maintenance' })
  async uncordonNode(@Param('name') nodeName: string) {
    return this.clusterService.uncordonNode(nodeName);
  }
}
