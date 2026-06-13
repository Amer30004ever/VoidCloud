import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InfrastructureService } from './infrastructure.service';

@ApiTags('Infrastructure')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('infrastructure')
export class InfrastructureController {
  private readonly logger = new Logger(InfrastructureController.name);

  constructor(private infrastructureService: InfrastructureService) {}

  /**
   * GET /infrastructure/namespaces
   * Get all namespaces
   */
  @Get('namespaces')
  @ApiOperation({ summary: 'Get all namespaces' })
  async getNamespaces() {
    return this.infrastructureService.getAllNamespaces();
  }

  /**
   * GET /infrastructure/deployments?namespace=default
   * Get all deployments in a namespace
   */
  @Get('deployments')
  @ApiOperation({ summary: 'Get all deployments' })
  async getDeployments(@Query('namespace') namespace?: string) {
    return this.infrastructureService.getDeployments(namespace);
  }

  /**
   * POST /infrastructure/deployments
   * Deploy from Docker image
   */
  @Post('deployments')
  @ApiOperation({ summary: 'Deploy from Docker image' })
  async deployFromImage(
    @Body()
    deployRequest: {
      namespace: string;
      name: string;
      image: string;
      replicas?: number;
      port?: number;
      env?: Record<string, string>;
    },
  ) {
    return this.infrastructureService.deployFromImage(
      deployRequest.namespace,
      deployRequest.name,
      deployRequest.image,
      deployRequest.replicas || 1,
      deployRequest.port || 3000,
      deployRequest.env || {},
    );
  }

  /**
   * GET /infrastructure/deployments/:namespace/:name/yaml
   * Get deployment YAML
   */
  @Get('deployments/:namespace/:name/yaml')
  @ApiOperation({ summary: 'Get deployment YAML' })
  async getDeploymentYaml(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    return this.infrastructureService.getDeploymentYaml(namespace, name);
  }

  /**
   * PUT /infrastructure/deployments/:namespace/:name
   * Update deployment YAML or scale
   */
  @Put('deployments/:namespace/:name')
  @ApiOperation({ summary: 'Update deployment' })
  async updateDeployment(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @Body() updateRequest: { yaml?: any; replicas?: number },
  ) {
    if (updateRequest.replicas !== undefined) {
      return this.infrastructureService.scaleDeployment(
        namespace,
        name,
        updateRequest.replicas,
      );
    }
    return this.infrastructureService.updateDeploymentYaml(
      namespace,
      name,
      updateRequest.yaml,
    );
  }

  /**
   * DELETE /infrastructure/deployments/:namespace/:name
   * Delete deployment
   */
  @Delete('deployments/:namespace/:name')
  @ApiOperation({ summary: 'Delete deployment' })
  async deleteDeployment(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    return this.infrastructureService.deleteDeployment(namespace, name);
  }

  /**
   * GET /infrastructure/services?namespace=default
   * Get all services
   */
  @Get('services')
  @ApiOperation({ summary: 'Get all services' })
  async getServices(@Query('namespace') namespace?: string) {
    return this.infrastructureService.getServices(namespace);
  }

  /**
   * GET /infrastructure/configmaps?namespace=default
   * Get all configmaps
   */
  @Get('configmaps')
  @ApiOperation({ summary: 'Get all configmaps' })
  async getConfigMaps(@Query('namespace') namespace?: string) {
    return this.infrastructureService.getConfigMaps(namespace);
  }

  /**
   * PUT /infrastructure/configmaps/:namespace/:name
   * Update ConfigMap
   */
  @Put('configmaps/:namespace/:name')
  @ApiOperation({ summary: 'Update configmap' })
  async updateConfigMap(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @Body() data: Record<string, string>,
  ) {
    return this.infrastructureService.updateConfigMap(namespace, name, data);
  }

  /**
   * GET /infrastructure/secrets?namespace=default
   * Get all secrets (metadata only)
   */
  @Get('secrets')
  @ApiOperation({ summary: 'Get all secrets (metadata only)' })
  async getSecrets(@Query('namespace') namespace?: string) {
    return this.infrastructureService.getSecrets(namespace);
  }
}
