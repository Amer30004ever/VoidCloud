import { Controller, Get, Post, Param, UseGuards, Request, Body } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateActivityDto } from './dto/create-activity.dto';

@Controller('activity')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('project/:projectId')
  @Roles('user', 'admin', 'agent', 'super_admin')
  findAll(@Param('projectId') projectId: string, @Request() req) {
    return this.activityService.findAll(projectId, req.user.id, req.user.role);
  }

  @Post('project/:projectId')
  @Roles('user', 'admin', 'agent', 'super_admin')
  create(@Param('projectId') projectId: string, @Request() req, @Body() dto: CreateActivityDto) {
    return this.activityService.create(projectId, req.user.id, dto.action, dto.detail, dto.metadata);
  }
}
