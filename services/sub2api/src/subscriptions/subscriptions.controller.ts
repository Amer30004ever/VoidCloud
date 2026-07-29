import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('user', 'admin', 'agent', 'super_admin')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  async getSubscriptions(@Request() req) {
    return this.subscriptionsService.getSubscriptions(req.user.id);
  }
}
