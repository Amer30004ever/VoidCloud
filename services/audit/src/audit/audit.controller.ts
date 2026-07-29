import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('logs')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  logs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.getLogs({
      userId,
      action,
      resource,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('logs/user/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  userLogs(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.audit.getUserLogs(id, limit ? parseInt(limit, 10) : 50);
  }

  @Get('logs/export')
  @Roles(Role.SUPER_ADMIN)
  export(@Query() query: Record<string, string>) {
    return this.audit.exportLogs(query);
  }

  @Post('logs')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() body: Record<string, unknown>) {
    return this.audit.createLog(body as never);
  }
}
