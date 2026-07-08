import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async findAll(@Request() req) {
    return this.apiKeysService.findAll(req.user.id);
  }

  @Post()
  async create(@Request() req, @Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeysService.create(req.user.id, createApiKeyDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  async delete(@Param('id') id: string, @Request() req) {
    return this.apiKeysService.delete(id, req.user.id, req.user.role);
  }

  @Post(':id/regenerate')
  async regenerate(@Param('id') id: string, @Request() req) {
    return this.apiKeysService.regenerate(id, req.user.id);
  }
}
