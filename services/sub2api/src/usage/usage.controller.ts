import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsageService } from './usage.service';

@Controller('usage')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('user', 'admin', 'agent', 'super_admin')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  async getUsage(@Request() req) {
    return this.usageService.findByUser(req.user.id);
  }
}
