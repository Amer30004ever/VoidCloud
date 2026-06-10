import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List projects' })
  list(@CurrentUser() user: { id: string }) {
    return this.projectsService.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create project' })
  create(
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; description?: string; repository?: string; namespace?: string },
  ) {
    return this.projectsService.create({ ...body, userId: user.id });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project' })
  get(@Param('id') id: string) {
    return this.projectsService.get(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
