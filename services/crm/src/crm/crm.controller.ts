import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CrmService } from './crm.service';

@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('customers')
  listCustomers(@CurrentUser() user: { id: string; role: never }) {
    return this.crm.listCustomers(user);
  }

  @Post('customers')
  createCustomer(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return this.crm.createCustomer(user, body);
  }

  @Get('customers/:id')
  getCustomer(@Param('id') id: string) {
    return this.crm.getCustomer(id);
  }

  @Put('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.crm.updateCustomer(id, body);
  }

  @Get('leads')
  listLeads(@CurrentUser() user: { id: string; role: never }) {
    return this.crm.listLeads(user);
  }

  @Post('leads')
  createLead(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return this.crm.createLead(user, body);
  }

  @Put('leads/:id/convert')
  convertLead(@Param('id') id: string) {
    return this.crm.convertLead(id);
  }

  @Get('deals')
  listDeals(@CurrentUser() user: { id: string; role: never }) {
    return this.crm.listDeals(user);
  }

  @Post('deals')
  createDeal(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return this.crm.createDeal(user, body);
  }

  @Put('deals/:id/stage')
  updateDealStage(@Param('id') id: string, @Body() body: { stage: string }) {
    return this.crm.updateDealStage(id, body.stage);
  }

  @Get('tasks')
  listTasks(@CurrentUser() user: { id: string; role: never }) {
    return this.crm.listTasks(user);
  }

  @Post('tasks')
  createTask(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return this.crm.createTask(user, body);
  }

  @Put('tasks/:id/complete')
  completeTask(@Param('id') id: string) {
    return this.crm.completeTask(id);
  }
}
