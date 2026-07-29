import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VpsService } from '../vps/vps.service';
import { CreateVpsDto, UpdateVpsDto } from '../vps/dto/vps.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ScopesGuard } from '../guards/scope.guard';
import { RequireScopes } from '../decorators/scopes.decorator';
import { Public } from '../decorators/public.decorator';

@Controller('public/v1/vps')
@Public()
@UseGuards(ApiKeyGuard, ScopesGuard)
@ApiTags('VPS Public API')
@ApiBearerAuth()
export class PublicApiController {
  constructor(private readonly vpsService: VpsService) {}

  @Get()
  @RequireScopes('vps:read')
  @ApiOperation({ summary: 'List VPS instances (API key)' })
  @ApiResponse({ status: 200, description: 'VPS list' })
  list(@Request() req) {
    return this.vpsService.list(req.user);
  }

  @Get(':id')
  @RequireScopes('vps:read')
  @ApiOperation({ summary: 'Get VPS details (API key)' })
  @ApiResponse({ status: 200, description: 'VPS details' })
  get(@Param('id') id: string, @Request() req) {
    return this.vpsService.get(id, req.user);
  }

  @Post()
  @RequireScopes('vps:write')
  @ApiOperation({ summary: 'Create a VPS instance (API key)' })
  @ApiResponse({ status: 201, description: 'VPS created' })
  create(@Body() dto: CreateVpsDto, @Request() req) {
    return this.vpsService.create(dto, req.user);
  }

  @Post(':id/start')
  @RequireScopes('vps:write')
  @ApiOperation({ summary: 'Start a VPS instance (API key)' })
  @ApiResponse({ status: 200, description: 'VPS started' })
  start(@Param('id') id: string, @Request() req) {
    return this.vpsService.start(id, req.user);
  }

  @Post(':id/stop')
  @RequireScopes('vps:write')
  @ApiOperation({ summary: 'Stop a VPS instance (API key)' })
  @ApiResponse({ status: 200, description: 'VPS stopped' })
  stop(@Param('id') id: string, @Request() req) {
    return this.vpsService.stop(id, req.user);
  }

  @Post(':id/restart')
  @RequireScopes('vps:write')
  @ApiOperation({ summary: 'Restart a VPS instance (API key)' })
  @ApiResponse({ status: 200, description: 'VPS restarted' })
  restart(@Param('id') id: string, @Request() req) {
    return this.vpsService.restart(id, req.user);
  }

  @Delete(':id')
  @RequireScopes('vps:delete')
  @ApiOperation({ summary: 'Delete a VPS instance (API key)' })
  @ApiResponse({ status: 200, description: 'VPS deleted' })
  remove(@Param('id') id: string, @Request() req) {
    return this.vpsService.remove(id, req.user);
  }

  @Get(':id/status')
  @RequireScopes('vps:read')
  @ApiOperation({ summary: 'Get VPS status (API key)' })
  @ApiResponse({ status: 200, description: 'VPS status' })
  status(@Param('id') id: string, @Request() req) {
    return this.vpsService.status(id, req.user);
  }
}
