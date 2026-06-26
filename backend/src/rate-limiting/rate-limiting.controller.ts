import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RateLimitingService } from './rate-limiting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Rate Limiting')
@Controller('rate-limiting')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RateLimitingController {
  constructor(private readonly rateLimitingService: RateLimitingService) {}

  @Get('usage/:tenantId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get usage statistics for a tenant' })
  async getUsageStats(@Param('tenantId') tenantId: string) {
    return this.rateLimitingService.getUsageStats(tenantId);
  }

  @Post('check/:tenantId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Check and alert on rate limits' })
  async checkAndAlert(@Param('tenantId') tenantId: string) {
    await this.rateLimitingService.checkAndAlert(tenantId);
    return { success: true };
  }

  @Post('reset/:tenantId')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reset rate limit cache for a tenant' })
  async resetCache(@Param('tenantId') tenantId: string) {
    this.rateLimitingService.resetCache(tenantId);
    return { success: true };
  }
}
