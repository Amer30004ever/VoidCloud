import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ClustersService, ClusterInput, ScheduleRequest } from './clusters.service';

/**
 * Super-admin-only Proxmox cluster registry.
 * Endpoints under /clusters/*.
 */
@Controller('clusters')
@UseGuards(JwtAuthGuard)
export class ClustersController {
  constructor(private readonly clusters: ClustersService) {}

  private assertSuperAdmin(user: { role?: string }) {
    if (user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super admin only');
    }
  }

  @Get()
  list(@CurrentUser() user: { role: string }) {
    this.assertSuperAdmin(user);
    return this.clusters.list();
  }

  @Post()
  create(@Body() body: ClusterInput, @CurrentUser() user: { role: string }) {
    this.assertSuperAdmin(user);
    return this.clusters.create(body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<ClusterInput> & { status?: string },
    @CurrentUser() user: { role: string },
  ) {
    this.assertSuperAdmin(user);
    return this.clusters.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { role: string }) {
    this.assertSuperAdmin(user);
    return this.clusters.remove(id);
  }

  @Post(':id/test')
  test(@Param('id') id: string, @CurrentUser() user: { role: string }) {
    this.assertSuperAdmin(user);
    return this.clusters.testAndRefresh(id);
  }

  @Post('schedule')
  schedule(@Body() body: ScheduleRequest, @CurrentUser() user: { role: string }) {
    this.assertSuperAdmin(user);
    return this.clusters.schedule(body);
  }
}
