import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('settings')
  @Roles('super_admin')
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Get('users')
  @Roles('admin', 'super_admin')
  async getUsers(@Query() query: any) {
    return this.adminService.getUsers(query);
  }
}
