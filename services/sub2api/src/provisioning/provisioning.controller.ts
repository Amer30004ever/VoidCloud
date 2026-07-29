import { Controller, Post, Param, UseGuards, Request, Body, Get } from '@nestjs/common';
import { SupabaseProvisioningService } from './supabase-provisioning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('provisioning')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ProvisioningController {
  constructor(private readonly provisioningService: SupabaseProvisioningService) {}

  @Post('project/:projectId')
  @Roles('super_admin', 'admin')
  async provision(@Param('projectId') projectId: string, @Request() req) {
    const name = `voidcloud-${projectId}-${Date.now()}`;
    const project = await this.provisioningService.createProject(name);
    try {
      const healthy = await this.provisioningService.waitForHealthy(project.id);
      return {
        status: 'ready',
        project: {
          id: healthy.id,
          url: healthy.apiUrl,
          anonKey: healthy.anonKey,
          dbHost: healthy.dbHost,
          dbPort: healthy.dbPort,
          dbName: healthy.dbName,
        },
      };
    } catch (error) {
      await this.provisioningService.deleteProject(project.id);
      throw error;
    }
  }

  @Get('project/:projectId/status')
  @Roles('super_admin', 'admin')
  async status(@Param('projectId') projectId: string) {
    return this.provisioningService.getProject(projectId);
  }

  @Post('project/:projectId/delete')
  @Roles('super_admin', 'admin')
  async delete(@Param('projectId') projectId: string) {
    await this.provisioningService.deleteProject(projectId);
    return { success: true };
  }
}
