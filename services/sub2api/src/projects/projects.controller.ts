import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Roles('user', 'admin', 'agent', 'super_admin')
  findAll(@Request() req) {
    return this.projectsService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  @Roles('user', 'admin', 'agent', 'super_admin')
  findOne(@Param('id') id: string, @Request() req) {
    return this.projectsService.findOne(id, req.user.id, req.user.role);
  }

  @Post()
  @Roles('user', 'admin', 'agent', 'super_admin')
  create(@Request() req, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.user.id, dto);
  }

  @Put(':id')
  @Roles('user', 'admin', 'agent', 'super_admin')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, req.user.id, req.user.role, dto);
  }

  @Delete(':id')
  @Roles('user', 'admin', 'agent', 'super_admin')
  remove(@Param('id') id: string, @Request() req) {
    return this.projectsService.remove(id, req.user.id, req.user.role);
  }
}
