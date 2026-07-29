import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CrmService } from './crm.service';

type AuthUser = { id: string; role: Role };

@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.AGENT, Role.SUPER_ADMIN)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('customers')
  listCustomers(@CurrentUser() user: AuthUser) {
    return this.crm.listCustomers(user);
  }

  @Post('customers')
  createCustomer(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.crm.createCustomer(user, body);
  }

  @Get('customers/:id')
  getCustomer(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.getCustomer(id, user);
  }

  @Put('customers/:id')
  updateCustomer(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateCustomer(id, body, user);
  }

  @Get('leads')
  listLeads(@CurrentUser() user: AuthUser) {
    return this.crm.listLeads(user);
  }

  @Post('leads')
  createLead(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.crm.createLead(user, body);
  }

  @Put('leads/:id/convert')
  convertLead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.convertLead(id, user);
  }

  @Get('deals')
  listDeals(@CurrentUser() user: AuthUser) {
    return this.crm.listDeals(user);
  }

  @Post('deals')
  createDeal(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.crm.createDeal(user, body);
  }

  @Put('deals/:id/stage')
  updateDealStage(
    @Param('id') id: string,
    @Body() body: { stage: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateDealStage(id, body.stage, user);
  }

  @Get('tasks')
  listTasks(@CurrentUser() user: AuthUser) {
    return this.crm.listTasks(user);
  }

  @Post('tasks')
  createTask(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.crm.createTask(user, body);
  }

  @Put('tasks/:id/complete')
  completeTask(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.completeTask(id, user);
  }
}
