import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SecurityService } from './security.service';

@ApiTags('Security')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  constructor(private readonly securityService: SecurityService) {}

  // Vulnerability Scanner Endpoints
  @Post('vulnerabilities/scan/image')
  @ApiOperation({ summary: 'Scan Docker image for vulnerabilities' })
  async scanImage(@Body() body: { imageName: string; tag?: string }) {
    return this.securityService.scanImage(body.imageName, body.tag);
  }

  @Post('vulnerabilities/scan/deployment')
  @ApiOperation({ summary: 'Scan deployment for vulnerabilities' })
  async scanDeployment(
    @Body() body: { namespace: string; deploymentName: string },
  ) {
    return this.securityService.scanDeployment(
      body.namespace,
      body.deploymentName,
    );
  }

  @Get('vulnerabilities/history')
  @ApiOperation({ summary: 'Get vulnerability scan history' })
  async getScanHistory(@Query('limit') limit?: string) {
    return this.securityService.getScanHistory(
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('vulnerabilities/scan/:id')
  @ApiOperation({ summary: 'Get scan details by ID' })
  async getScanDetails(@Param('id') id: string) {
    return this.securityService.getScanDetails(id);
  }

  @Get('vulnerabilities/stats')
  @ApiOperation({ summary: 'Get vulnerability statistics' })
  async getVulnerabilityStats() {
    return this.securityService.getVulnerabilityStats();
  }

  @Get('secrets')
  @ApiOperation({ summary: 'List application secrets' })
  async getSecrets(
    @CurrentUser() user: { id: string },
    @Query('namespace') namespace?: string,
  ) {
    return this.securityService.getAppSecrets(user.id, namespace);
  }

  @Post('secrets')
  @ApiOperation({ summary: 'Create application secret' })
  async createSecret(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      name: string;
      value: string;
      namespace?: string;
      expiresAt?: string;
    },
  ) {
    return this.securityService.createAppSecret({ ...body, userId: user.id });
  }

  @Get('secrets/:id/reveal')
  @ApiOperation({ summary: 'Reveal secret value' })
  async revealSecret(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.securityService.revealAppSecret(id, user.id);
  }

  @Delete('secrets/:id')
  @ApiOperation({ summary: 'Delete application secret' })
  async deleteSecret(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.securityService.deleteAppSecret(id, user.id);
  }
}
