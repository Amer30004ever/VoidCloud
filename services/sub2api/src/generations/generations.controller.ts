import { Body, Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { GenerationsService } from './generations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateGenerationDto } from './dto/create-generation.dto';

@Controller('generations')
@UseGuards(JwtAuthGuard, RoleGuard)
export class GenerationsController {
  constructor(private readonly generationsService: GenerationsService) {}

  @Get('project/:projectId')
  @Roles('user', 'admin', 'agent', 'super_admin')
  findAll(@Param('projectId') projectId: string, @Request() req) {
    return this.generationsService.findAll(projectId, req.user.id, req.user.role);
  }

  @Get(':id')
  @Roles('user', 'admin', 'agent', 'super_admin')
  findOne(@Param('id') id: string, @Request() req) {
    return this.generationsService.findOne(id, req.query['projectId'] as string, req.user.id, req.user.role);
  }

  @Post('project/:projectId')
  @Roles('user', 'admin', 'agent', 'super_admin')
  create(@Param('projectId') projectId: string, @Request() req, @Body() dto: CreateGenerationDto) {
    return this.generationsService.create(projectId, req.user.id, req.user.role, dto);
  }
}
