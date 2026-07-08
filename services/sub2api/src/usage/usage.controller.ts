import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  async getUsage(@Request() req) {
    return this.usageService.findByUser(req.user.id);
  }
}
