import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { TenantsService } from './tenants.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantSettingsDto,
} from './dto/tenant.dto';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  list() {
    return this.tenantsService.listTenants();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.createTenant(dto);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  get(@Param('id') id: string) {
    return this.tenantsService.getTenant(id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.updateTenant(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  delete(@Param('id') id: string) {
    return this.tenantsService.deleteTenant(id);
  }

  @Get(':id/settings')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  getSettings(@Param('id') id: string) {
    return this.tenantsService.getSettings(id);
  }

  @Post(':id/settings')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantsService.updateSettings(id, dto.settings);
  }
}
