import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthUser, CreateTicketInput, SupportService } from './support.service';

@Controller('crm/support/tickets')
@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER, Role.ADMIN, Role.AGENT, Role.SUPER_ADMIN, Role.BILLING_MANAGER)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @ApiOperation({ summary: 'List tickets visible to the caller' })
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.support.list(user, status);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.support.stats(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateTicketInput) {
    return this.support.create(user, body);
  }

  @Post(':id/replies')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { body: string; internal?: boolean },
  ) {
    return this.support.reply(user, id, body?.body, body?.internal);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string; assigneeId?: string },
  ) {
    return this.support.updateStatus(user, id, body?.status, body?.assigneeId);
  }
}
