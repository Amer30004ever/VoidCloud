import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('RBAC')
@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all roles with permissions' })
  async getAllRoles() {
    return this.rbacService.getAllRoles();
  }

  @Post('roles')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new role' })
  async createRole(@Body() data: { name: string; description?: string }) {
    return this.rbacService.createRole(data);
  }

  @Get('permissions')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all permissions' })
  async getAllPermissions() {
    return this.rbacService.getAllPermissions();
  }

  @Post('permissions')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new permission' })
  async createPermission(@Body() data: {
    name: string;
    resource: string;
    action: string;
    description?: string;
  }) {
    return this.rbacService.createPermission(data);
  }

  @Post('roles/:roleId/permissions/:permissionId')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign permission to role' })
  async assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rbacService.assignPermissionToRole(roleId, permissionId);
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove permission from role' })
  async removePermissionFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rbacService.removePermissionFromRole(roleId, permissionId);
  }

  @Get('tenants')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all tenants with users' })
  async getAllTenants() {
    return this.rbacService.getAllTenants();
  }

  @Post('tenants')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new tenant' })
  async createTenant(@Body() data: {
    name: string;
    subdomain: string;
    settings?: any;
  }) {
    return this.rbacService.createTenant(data);
  }

  @Post('tenants/:tenantId/users/:userId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Assign user to tenant with role' })
  async assignUserToTenant(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() data: { roleId: string },
  ) {
    return this.rbacService.assignUserToTenant(userId, tenantId, data.roleId);
  }

  @Delete('tenants/:tenantId/users/:userId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Remove user from tenant' })
  async removeUserFromTenant(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.rbacService.removeUserFromTenant(userId, tenantId);
  }

  @Get('users/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all permissions for a user' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.rbacService.getUserPermissions(userId);
  }
}
